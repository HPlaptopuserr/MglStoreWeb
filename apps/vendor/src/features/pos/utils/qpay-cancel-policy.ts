export interface QPayCancellationProof {
  status: string;
  providerCancellationConfirmed?: boolean;
}
export function isQPayCancellationConfirmed(
  result: QPayCancellationProof,
): boolean {
  return (
    result.status === "EXPIRED" && result.providerCancellationConfirmed === true
  );
}
export function canClearCheckoutAfterCancelFailure(
  results: readonly QPayCancellationProof[],
): boolean {
  return results.length > 0 && results.every(isQPayCancellationConfirmed);
}
