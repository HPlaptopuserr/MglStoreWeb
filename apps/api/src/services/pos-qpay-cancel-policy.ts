export function canReleaseCheckoutAfterCancelFailure(input: {
  requireProviderCancellation?: boolean;
  invoiceStatus: string;
  providerRecheckCompleted: boolean;
  providerPaymentConfirmed: boolean;
}) {
  return (
    !input.requireProviderCancellation &&
    ["PENDING", "EXPIRED"].includes(input.invoiceStatus) &&
    input.providerRecheckCompleted &&
    !input.providerPaymentConfirmed
  );
}
