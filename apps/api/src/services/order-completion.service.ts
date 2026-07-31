import { OrderStatus, type Prisma } from "@mgl/database";

export async function completeOrderFulfillment(
  tx: Prisma.TransactionClient,
  input: { orderId: string; changedById: string; note: string },
) {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      items: { select: { productId: true, quantity: true } },
    },
  });
  if (!order) throw new Error("Захиалга олдсонгүй");
  if (order.status === OrderStatus.COMPLETED) return false;

  await tx.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.COMPLETED, deliveryCode: null },
  });
  await tx.orderHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: OrderStatus.COMPLETED,
      changedById: input.changedById,
      note: input.note,
    },
  });
  for (const item of order.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { soldCount: { increment: item.quantity } },
    });
  }

  const uniqueCustomers = await tx.order.groupBy({
    by: ["customerId"],
    where: {
      organizationId: order.organizationId,
      status: OrderStatus.COMPLETED,
      deletedAt: null,
    },
  });
  await tx.organization.update({
    where: { id: order.organizationId },
    data: {
      soldCount: {
        increment: order.items.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
      },
      customerCount: String(uniqueCustomers.length),
    },
  });
  return true;
}
