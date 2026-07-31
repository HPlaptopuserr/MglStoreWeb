import {
  DeliverySourceType,
  DeliveryStatus,
  OrderDispatchAttemptStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  prisma,
} from "@mgl/database";

export const STORE_CHECKOUT_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;

export async function cancelExpiredStoreCheckouts(now = new Date()) {
  const cutoff = new Date(now.getTime() - STORE_CHECKOUT_PAYMENT_TIMEOUT_MS);
  const candidates = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.QPAY,
      payments: {
        some: {
          status: PaymentStatus.PENDING,
          createdAt: { lte: cutoff },
        },
      },
      OR: [
        { dispatchAttempts: { some: {} } },
        { delivery: { sourceType: DeliverySourceType.WEBSITE_ORDER } },
      ],
    },
    select: { id: true, status: true },
  });

  let cancelledCount = 0;
  for (const candidate of candidates) {
    const cancelled = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: candidate.id,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
          paymentStatus: PaymentStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
        },
      });
      if (claimed.count === 0) return false;

      await Promise.all([
        tx.paymentAttempt.updateMany({
          where: {
            orderId: candidate.id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.CANCELLED,
            cancelledAt: now,
            failureReason: "Төлбөрийн 10 минутын хугацаа дууссан",
          },
        }),
        tx.orderDispatchAttempt.updateMany({
          where: {
            orderId: candidate.id,
            status: {
              in: [
                OrderDispatchAttemptStatus.QUEUED,
                OrderDispatchAttemptStatus.PENDING,
                OrderDispatchAttemptStatus.ACCEPTED,
              ],
            },
          },
          data: {
            status: OrderDispatchAttemptStatus.CANCELLED,
            respondedAt: now,
            note: "Төлбөрийн 10 минутын хугацаа дууссан",
          },
        }),
        tx.delivery.updateMany({
          where: {
            orderId: candidate.id,
            status: { not: DeliveryStatus.COMPLETED },
          },
          data: {
            status: DeliveryStatus.CANCELLED,
            cancelledAt: now,
            courierId: null,
          },
        }),
        tx.orderHistory.create({
          data: {
            orderId: candidate.id,
            fromStatus: candidate.status,
            toStatus: OrderStatus.CANCELLED,
            note: "Төлбөр 10 минутын дотор төлөгдөөгүй тул автоматаар цуцлагдсан",
          },
        }),
      ]);
      return true;
    });

    if (cancelled) cancelledCount += 1;
  }

  return cancelledCount;
}
