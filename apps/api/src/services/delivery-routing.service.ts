import {
  Capability,
  DeliveryPartnershipStatus,
  DeliverySourceType,
  DeliveryStatus,
  type Prisma,
} from "@mgl/database";
import { sendPushToUsers } from "./push-notification.service";

type DatabaseClient = Prisma.TransactionClient;

const ACTIVE_DELIVERY_STATUSES = [
  DeliveryStatus.WAITING,
  DeliveryStatus.PICKING,
  DeliveryStatus.DELIVERING,
] as const;

function pickLeastLoaded<T>(
  candidates: T[],
  getId: (candidate: T) => string,
  activeCountById: ReadonlyMap<string | null, number>,
) {
  if (candidates.length === 0) return null;
  return candidates.reduce((selected, candidate) =>
    (activeCountById.get(getId(candidate)) ?? 0) <
    (activeCountById.get(getId(selected)) ?? 0)
      ? candidate
      : selected,
  );
}

function trackingCode(prefix: string, reference: string) {
  const suffix = reference
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  return `${prefix}-${suffix}-${Date.now().toString().slice(-5)}`;
}

async function selectLeastLoadedPartnership(
  tx: DatabaseClient,
  where: Prisma.DeliveryPartnershipWhereInput,
) {
  const partnerships = await tx.deliveryPartnership.findMany({
    where: {
      ...where,
      status: DeliveryPartnershipStatus.ACCEPTED,
      providerOrganization: {
        businessDeliveryEnabled: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    },
    select: {
      id: true,
      providerOrganizationId: true,
      warehouseId: true,
      _count: {
        select: {
          deliveries: {
            where: {
              status: { in: [...ACTIVE_DELIVERY_STATUSES] },
            },
          },
        },
      },
    },
    orderBy: { respondedAt: "asc" },
  });

  return (
    partnerships.sort(
      (left, right) => left._count.deliveries - right._count.deliveries,
    )[0] ?? null
  );
}

async function selectLeastLoadedCourier(
  tx: DatabaseClient,
  providerOrganizationId: string,
  warehouseId: string | null,
) {
  let members = await tx.organizationMember.findMany({
    where: {
      organizationId: providerOrganizationId,
      isActive: true,
      deletedAt: null,
      capabilities: { has: Capability.DELIVERY_DRIVER },
      ...(warehouseId
        ? {
            user: {
              warehouseCourierAssignments: {
                some: {
                  warehouseId,
                  providerOrganizationId,
                  isActive: true,
                },
              },
            },
          }
        : {}),
    },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });
  if (members.length === 0 && process.env.MGL_LOCAL_DEV === "true") {
    members = await tx.organizationMember.findMany({
      where: {
        organizationId: providerOrganizationId,
        isActive: true,
        deletedAt: null,
        user: { isActive: true, deletedAt: null },
      },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });
  }
  if (members.length === 0) return null;

  const userIds = members.map((member) => member.userId);
  const activeCounts = await tx.delivery.groupBy({
    by: ["courierId"],
    where: {
      courierId: { in: userIds },
      status: { in: [...ACTIVE_DELIVERY_STATUSES] },
    },
    _count: { _all: true },
  });
  const countByCourier = new Map(
    activeCounts.map((item) => [item.courierId, item._count._all]),
  );

  return pickLeastLoaded(members, (member) => member.userId, countByCourier)
    ?.userId;
}

async function selectLeastLoadedWebsiteProvider(tx: DatabaseClient) {
  let providers = await tx.organization.findMany({
    where: {
      businessDeliveryEnabled: true,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (providers.length === 0 && process.env.MGL_LOCAL_DEV === "true") {
    providers = await tx.organization.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        members: {
          some: {
            isActive: true,
            deletedAt: null,
            user: { isActive: true, deletedAt: null },
          },
        },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
  }
  if (providers.length === 0) return null;

  const providerIds = providers.map((provider) => provider.id);
  const activeCounts = await tx.delivery.groupBy({
    by: ["providerOrganizationId"],
    where: {
      providerOrganizationId: { in: providerIds },
      status: { in: [...ACTIVE_DELIVERY_STATUSES] },
    },
    _count: { _all: true },
  });
  const countByProvider = new Map(
    activeCounts.map((item) => [item.providerOrganizationId, item._count._all]),
  );

  return pickLeastLoaded(providers, (provider) => provider.id, countByProvider)
    ?.id;
}

export async function routeOrderDelivery(
  tx: DatabaseClient,
  input: {
    orderId: string;
    sourceType:
      | typeof DeliverySourceType.WEBSITE_ORDER
      | typeof DeliverySourceType.VENDOR_ORDER;
  },
) {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNumber: true,
      organizationId: true,
    },
  });
  if (!order) throw new Error("Захиалга олдсонгүй");

  const partnership = await selectLeastLoadedPartnership(tx, {
    requesterOrganizationId: order.organizationId,
  });
  const existing = await tx.delivery.findUnique({
    where: { orderId: order.id },
    select: {
      courierId: true,
      providerOrganizationId: true,
      status: true,
    },
  });
  const fallbackProviderId =
    input.sourceType === DeliverySourceType.WEBSITE_ORDER &&
    !partnership &&
    !existing?.providerOrganizationId
      ? await selectLeastLoadedWebsiteProvider(tx)
      : null;
  const providerOrganizationId =
    partnership?.providerOrganizationId ??
    existing?.providerOrganizationId ??
    fallbackProviderId;
  const courierId =
    existing?.providerOrganizationId === providerOrganizationId &&
    existing.courierId
      ? existing.courierId
      : providerOrganizationId
        ? await selectLeastLoadedCourier(
            tx,
            providerOrganizationId,
            partnership?.warehouseId ?? null,
          )
        : null;

  return tx.delivery.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      sourceType: input.sourceType,
      requesterOrganizationId: order.organizationId,
      providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: partnership?.warehouseId,
      courierId,
      status: DeliveryStatus.WAITING,
      trackingCode: trackingCode("ORD", order.orderNumber),
    },
    update: {
      sourceType: input.sourceType,
      requesterOrganizationId: order.organizationId,
      providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: partnership?.warehouseId,
      courierId,
      status:
        existing?.status === DeliveryStatus.CANCELLED
          ? DeliveryStatus.WAITING
          : existing?.status,
      cancelledAt: null,
    },
  });
}

export async function notifyAssignedOrderDelivery(input: {
  courierId: string | null;
  deliveryId: string;
  orderNumber: string;
}) {
  if (!input.courierId) return 0;
  try {
    return await sendPushToUsers({
      userIds: [input.courierId],
      title: "Шинэ хүргэлтийн ажил",
      body: `#${input.orderNumber} онлайн захиалга танд оноогдлоо.`,
      data: {
        type: "delivery_assigned",
        deliveryId: input.deliveryId,
        orderNumber: input.orderNumber,
      },
    });
  } catch (error) {
    console.error("Delivery assignment push notification error", error);
    return 0;
  }
}

export async function routeWarehouseDispatchDelivery(
  tx: DatabaseClient,
  stockDispatchId: string,
) {
  const dispatch = await tx.stockDispatch.findUnique({
    where: { id: stockDispatchId },
    select: {
      id: true,
      dispatchNumber: true,
      warehouseId: true,
      organizationId: true,
    },
  });
  if (!dispatch) throw new Error("Агуулахын илгээмж олдсонгүй");

  const partnership = await selectLeastLoadedPartnership(tx, {
    warehouseId: dispatch.warehouseId,
  });

  return tx.delivery.upsert({
    where: { stockDispatchId: dispatch.id },
    create: {
      stockDispatchId: dispatch.id,
      sourceType: DeliverySourceType.WAREHOUSE_DISPATCH,
      requesterOrganizationId: dispatch.organizationId,
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: dispatch.warehouseId,
      status: DeliveryStatus.WAITING,
      trackingCode: trackingCode("WMS", dispatch.dispatchNumber),
    },
    update: {
      providerOrganizationId: partnership?.providerOrganizationId,
      partnershipId: partnership?.id,
      warehouseId: dispatch.warehouseId,
      status: DeliveryStatus.WAITING,
      cancelledAt: null,
    },
  });
}
