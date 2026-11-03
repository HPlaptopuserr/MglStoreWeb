import {
  DEFAULT_BUSINESS_STATUS,
  normalizeBusinessStatus,
  type BusinessSiteStatus,
} from "../model/business-status";

export async function getBusinessSiteStatus(): Promise<BusinessSiteStatus> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000";

  try {
    const response = await fetch(
      `${apiBase}/api/site-settings/mglbusiness/status`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) return DEFAULT_BUSINESS_STATUS;

    const payload = (await response.json()) as { status?: string };
    return normalizeBusinessStatus(payload.status);
  } catch {
    return DEFAULT_BUSINESS_STATUS;
  }
}
