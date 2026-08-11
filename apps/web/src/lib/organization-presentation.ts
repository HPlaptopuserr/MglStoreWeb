export type OrganizationMetricSource = {
  customerCount?: string | number | null;
  customers?: string | number | null;
  isVerified?: boolean | null;
  operatingYears?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  soldCount?: number | null;
  status?: string | null;
  years?: number | null;
};

export type OrganizationPresentationMetrics = {
  customers: string;
  isOpen: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  years: number;
};

function nonNegativeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeOrganizationMetrics(
  source: OrganizationMetricSource,
): OrganizationPresentationMetrics {
  const rawCustomers = source.customerCount ?? source.customers ?? 0;
  const customers =
    typeof rawCustomers === "string"
      ? rawCustomers.trim() || "0"
      : String(nonNegativeNumber(rawCustomers));

  return {
    customers,
    isOpen: source.status === "ACTIVE",
    isVerified: source.isVerified === true,
    rating: Math.min(5, nonNegativeNumber(source.rating)),
    reviewCount: Math.floor(nonNegativeNumber(source.reviewCount)),
    soldCount: Math.floor(nonNegativeNumber(source.soldCount)),
    years: Math.floor(
      nonNegativeNumber(source.operatingYears ?? source.years, 1),
    ),
  };
}

export function formatOrganizationRating(rating: number): string {
  return normalizeOrganizationMetrics({ rating }).rating.toFixed(1);
}
