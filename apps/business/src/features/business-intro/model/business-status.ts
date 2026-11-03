export const BUSINESS_STATUS_SETTING_KEY = "mglbusiness-status";

export type BusinessSiteStatus = "maintenance" | "live";

export const DEFAULT_BUSINESS_STATUS: BusinessSiteStatus = "maintenance";

export function normalizeBusinessStatus(value: unknown): BusinessSiteStatus {
  return value === "live" ? "live" : DEFAULT_BUSINESS_STATUS;
}

