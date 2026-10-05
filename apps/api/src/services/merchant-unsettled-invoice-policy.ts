const QR_SETTLEMENT_INDEPENDENT_PATHS = new Set([
  "/bank-accounts",
  "/minu/connect",
  "/minu/disconnect",
]);

/**
 * Only mutations that can replace the credentials used to reconcile an
 * existing Dynamic QR invoice need to wait until that invoice is settled.
 * Minu Agent credentials are used by card terminals, not Dynamic QR.
 */
export function merchantMutationRequiresSettledQr(path: string): boolean {
  return !QR_SETTLEMENT_INDEPENDENT_PATHS.has(path);
}
