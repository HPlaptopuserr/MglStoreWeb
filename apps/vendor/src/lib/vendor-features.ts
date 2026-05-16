export const POS_FEATURE_KEY = "pos-enabled";
export const SUPPLY_PRODUCTS_FEATURE_KEY = "supply-products-enabled";
export const SERVICE_POSTS_FEATURE_KEY = "service-posts-enabled";

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
