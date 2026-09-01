export function isStoreQPayPaymentComplete(params: {
  paymentCount: number;
  paidAmount: number;
  expectedAmount: number;
}) {
  const { paymentCount, paidAmount, expectedAmount } = params;
  return (
    Number.isInteger(paymentCount) &&
    paymentCount > 0 &&
    Number.isFinite(paidAmount) &&
    Number.isFinite(expectedAmount) &&
    expectedAmount > 0 &&
    paidAmount >= expectedAmount
  );
}
