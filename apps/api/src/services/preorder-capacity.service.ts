import {
  OrderStatus,
  PaymentStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

type PreorderDatabaseClient = PrismaClient | Prisma.TransactionClient;

const inactivePaymentStatuses: PaymentStatus[] = [
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.REFUNDED,
];

export type PreorderCapacityProgress = {
  preorderParticipantCount: number;
  preorderRemaining: number | null;
  preorderIsFull: boolean;
};

/** One distinct customer counts as one participant, regardless of quantity. */
export async function getPreorderParticipantIds(
  db: PreorderDatabaseClient,
  productIds: string[],
  cycleStartedAtByProductId: ReadonlyMap<string, Date | null> = new Map(),
) {
  const uniqueProductIds = [...new Set(productIds)];
  const participantsByProductId = new Map<string, Set<string>>(
    uniqueProductIds.map((productId) => [productId, new Set<string>()]),
  );

  if (uniqueProductIds.length === 0) return participantsByProductId;

  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      status: { not: OrderStatus.CANCELLED },
      paymentStatus: { notIn: inactivePaymentStatuses },
      items: { some: { productId: { in: uniqueProductIds } } },
    },
    select: {
      customerId: true,
      createdAt: true,
      items: {
        where: { productId: { in: uniqueProductIds } },
        select: { productId: true },
      },
    },
  });

  for (const order of orders) {
    for (const item of order.items) {
      const cycleStartedAt = cycleStartedAtByProductId.get(item.productId);
      if (cycleStartedAt && order.createdAt < cycleStartedAt) continue;
      participantsByProductId.get(item.productId)?.add(order.customerId);
    }
  }

  return participantsByProductId;
}

export function resolvePreorderCapacityProgress(
  capacity: number | null | undefined,
  participantCount: number,
): PreorderCapacityProgress {
  const normalizedCapacity =
    typeof capacity === "number" && capacity > 0 ? capacity : null;
  const preorderRemaining =
    normalizedCapacity === null
      ? null
      : Math.max(0, normalizedCapacity - participantCount);

  return {
    preorderParticipantCount: participantCount,
    preorderRemaining,
    preorderIsFull:
      normalizedCapacity !== null && participantCount >= normalizedCapacity,
  };
}

export async function getPreorderCapacityProgress(
  db: PreorderDatabaseClient,
  products: Array<{
    id: string;
    supplyType: string;
    preorderCapacity: number | null;
    preorderCycleStartedAt?: Date | null;
  }>,
) {
  const preorderProducts = products.filter(
    (product) =>
      product.supplyType === "CHINA_PREORDER" &&
      typeof product.preorderCapacity === "number",
  );
  const participantIds = await getPreorderParticipantIds(
    db,
    preorderProducts.map((product) => product.id),
    new Map(
      preorderProducts.map((product) => [
        product.id,
        product.preorderCycleStartedAt ?? null,
      ]),
    ),
  );

  return new Map(
    products.map((product) => [
      product.id,
      resolvePreorderCapacityProgress(
        product.preorderCapacity,
        participantIds.get(product.id)?.size ?? 0,
      ),
    ]),
  );
}
