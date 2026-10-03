export function canReleaseCheckoutAfterCancelFailure(input: {
  invoiceStatus: string;
  providerRecheckCompleted: boolean;
  providerPaymentConfirmed: boolean;
}) {
  return (
    ["PENDING", "EXPIRED"].includes(input.invoiceStatus) &&
    input.providerRecheckCompleted &&
    !input.providerPaymentConfirmed
  );
}
