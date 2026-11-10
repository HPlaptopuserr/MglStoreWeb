export const STORE_OWNER_PRO_PRICE = 100_000;
export const STORE_OWNER_PRO_MONTHS = 1;
export const STORE_OWNER_PRO_INVOICE_TTL_MS = 10 * 60 * 1000;

// One calendar month in Mongolia, clamped to the last day of the next month.
// January 31 becomes February 28/29, preserving the local payment time.
export function storeOwnerProExpiresAt(paidAt: Date): Date {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(paidAt.getTime() + offset);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + STORE_OWNER_PRO_MONTHS);
  const lastDay = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - offset);
}
