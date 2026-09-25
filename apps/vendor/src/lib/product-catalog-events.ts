export const CATALOG_CHANGE_EVENT = "mgl-product-catalog-changed";
export const CATALOG_CHANGE_STORAGE_KEY = "mgl_product_catalog_changed";

/** Recover changes made while the POS page had no active subscribers. */
export function readCatalogChangedAt(organizationId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(CATALOG_CHANGE_STORAGE_KEY) || "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "organizationId" in value &&
      value.organizationId === organizationId &&
      "changedAt" in value &&
      typeof value.changedAt === "number" &&
      Number.isFinite(value.changedAt)
    )
      return value.changedAt;
  } catch {
    /* Cache notifications are optional when browser storage is unavailable. */
  }
  return 0;
}

export function notifyProductCatalogChanged(organizationId?: string) {
  if (typeof window === "undefined") return;
  try {
    const user: unknown = JSON.parse(
      localStorage.getItem("vendor_user") || "null",
    );
    const id =
      organizationId ||
      (user && typeof user === "object" && "organizationId" in user
        ? user.organizationId
        : null);
    if (typeof id !== "string" || !id) return;
    const detail = {
      organizationId: id,
      changedAt: Date.now(),
      nonce: `${Date.now()}-${Math.random()}`,
    };
    window.dispatchEvent(new CustomEvent(CATALOG_CHANGE_EVENT, { detail }));
    localStorage.setItem(CATALOG_CHANGE_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    /* Unavailable storage must not fail a completed product mutation. */
  }
}
