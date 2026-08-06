import {
  PaymentStatus,
  Prisma,
  StockRequestStatus,
  prisma,
} from "@mgl/database";

export function outstandingStockPaymentWhere(
  organizationId: string,
  excludePaymentId?: string,
): Prisma.StockRequestPaymentWhereInput {
  return {
    organizationId,
    status: { not: PaymentStatus.CANCELLED },
    request: {
      status: {
        notIn: [StockRequestStatus.CANCELLED, StockRequestStatus.REJECTED],
      },
    },
    ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
  };
}

export async function getOutstandingStockPayments(
  organizationId: string,
  excludePaymentId?: string,
) {
  const payments = await prisma.stockRequestPayment.findMany({
    where: outstandingStockPaymentWhere(organizationId, excludePaymentId),
    include: {
      request: { select: { requestNumber: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return payments
    .map((payment) => ({
      ...payment,
      outstandingAmount: Math.max(
        0,
        Number(payment.totalAmount) - Number(payment.paidAmount),
      ),
    }))
    .filter((payment) => payment.outstandingAmount > 0);
}

export type OutstandingStockPayment = Awaited<
  ReturnType<typeof getOutstandingStockPayments>
>[number];

export function serializeOutstandingPayment(payment: OutstandingStockPayment) {
  return {
    id: payment.id,
    vendorId: payment.organizationId,
    invoiceNumber: payment.invoiceNumber,
    requestNumber: payment.request.requestNumber,
    requestStatus: payment.request.status,
    outstandingAmount: payment.outstandingAmount,
    totalAmount: Number(payment.totalAmount),
    paidAmount: Number(payment.paidAmount),
    status: payment.status,
    dueDate: payment.dueDate,
  };
}
