export function canClearCheckoutAfterCancelFailure(
  statuses: readonly string[],
) {
  return statuses.length > 0 && statuses.every((status) => status === "EXPIRED");
}
