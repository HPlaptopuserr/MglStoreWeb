type StockPaymentSnapshot = {
  paidAmount: number | string | { toString(): string };
  status: string;
};

/** Returns are only valid while no part of the stock invoice has been paid. */
export function canCreateUnpaidDispatchReturn(
  payment: StockPaymentSnapshot | null | undefined,
) {
  if (!payment) return true;

  return payment.status !== "PAID" && Number(payment.paidAmount) === 0;
}

export function adjustedInvoiceTotalAfterReturn(input: {
  currentTotal: number | string | { toString(): string };
  paidAmount: number | string | { toString(): string };
  returnAmount: number;
}) {
  const currentTotal = Number(input.currentTotal);
  const paidAmount = Number(input.paidAmount);
  if (
    !Number.isFinite(currentTotal) ||
    !Number.isFinite(paidAmount) ||
    !Number.isFinite(input.returnAmount) ||
    input.returnAmount < 0
  ) {
    throw new Error("INVALID_RETURN_AMOUNT");
  }
  return Math.max(paidAmount, currentTotal - input.returnAmount, 0);
}
