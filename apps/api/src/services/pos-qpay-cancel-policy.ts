export function canReleaseExpiredCheckoutAfterCancelFailure(input: {
  invoiceStatus: string;
  providerRecheckCompleted: boolean;
  providerPaymentConfirmed: boolean;
}) {
  return (
    input.invoiceStatus === "EXPIRED" &&
    input.providerRecheckCompleted &&
    !input.providerPaymentConfirmed
  );
}
