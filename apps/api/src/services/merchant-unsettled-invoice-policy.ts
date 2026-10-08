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

type MerchantQrInvoiceState = {
  status: string;
  consumedAt: Date | null;
  expiresAt: Date;
};

/**
 * A merchant credential change only needs to wait for a QR that can still be
 * paid, or for a paid QR that has not yet been attached to a completed sale.
 * Old PENDING rows are expired checkout state and must not lock merchant
 * settings forever.
 */
export function merchantQrInvoiceBlocksCredentialChange(
  invoice: MerchantQrInvoiceState,
  now: Date = new Date(),
): boolean {
  if (invoice.consumedAt) return false;
  if (invoice.status === "PAID") return true;
  return invoice.status === "PENDING" && invoice.expiresAt > now;
}
