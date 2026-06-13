import { prisma, VendorContentReviewStatus } from "@mgl/database";

export const VENDOR_CONTENT_REVIEW_SETTING_KEY =
  "vendor-content-review-enabled";

export const VENDOR_CONTENT_REVIEW_STATUSES = [
  VendorContentReviewStatus.PENDING,
  VendorContentReviewStatus.APPROVED,
  VendorContentReviewStatus.REJECTED,
] as const;

export type VendorContentReviewStatusValue =
  (typeof VENDOR_CONTENT_REVIEW_STATUSES)[number];

const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

export function normalizeVendorContentReviewStatus(
  value: unknown,
): VendorContentReviewStatusValue | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return VENDOR_CONTENT_REVIEW_STATUSES.includes(
    normalized as VendorContentReviewStatusValue,
  )
    ? (normalized as VendorContentReviewStatusValue)
    : null;
}

export function isApprovedVendorContent(
  status: VendorContentReviewStatusValue | string | null | undefined,
) {
  return status === VendorContentReviewStatus.APPROVED;
}

export async function isVendorContentReviewEnabled() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: VENDOR_CONTENT_REVIEW_SETTING_KEY },
    select: { value: true },
  });
  return TRUE_VALUES.has(
    String(setting?.value || "")
      .trim()
      .toLowerCase(),
  );
}

export async function getInitialVendorContentReviewStatus() {
  return (await isVendorContentReviewEnabled())
    ? VendorContentReviewStatus.PENDING
    : VendorContentReviewStatus.APPROVED;
}

export async function getReviewStatusForVendorMutation() {
  const reviewStatus = await getInitialVendorContentReviewStatus();
  return {
    reviewStatus,
    reviewedAt:
      reviewStatus === VendorContentReviewStatus.APPROVED ? new Date() : null,
    reviewedById: null,
  };
}
