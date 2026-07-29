export const POS_FEATURE_KEY = "pos-enabled";
export const SUPPLY_PRODUCTS_FEATURE_KEY = "supply-products-enabled";
export const SERVICE_POSTS_FEATURE_KEY = "service-posts-enabled";
export const PREORDER_PRODUCTS_FEATURE_KEY = "preorder-products-enabled";
export const MULTI_PRICE_SALES_FEATURE_KEY = "multi-price-sales-enabled";
export const CONTRACT_ARCHIVE_FEATURE_KEY = "contract-archive-enabled";

const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

export function isFeatureEnabled(
  settings: Record<string, unknown>,
  featureKey: string,
  organizationId: string,
  defaultEnabled = false,
) {
  const raw = settings[`${featureKey}-${organizationId}`];

  if (raw === undefined || raw === null || raw === "") {
    return defaultEnabled;
  }

  if (typeof raw === "boolean") {
    return raw;
  }

  return TRUE_VALUES.has(String(raw).trim().toLowerCase());
}
