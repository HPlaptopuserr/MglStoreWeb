import { getLocalAreaFromText } from "@mgl/ui";
import type { ApiPartner, OrganizationStore } from "./types";

function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase();
}

function parseCategorySlugs(raw?: string) {
  if (!raw) return [];
  return raw.split(",").map(normalizeCategoryKey).filter(Boolean);
}

export function mapPartnerToStore(partner: ApiPartner): OrganizationStore {
  const parsedSlugs = parseCategorySlugs(partner.businessCategory);
  const fallbackType = partner.type
    ? normalizeCategoryKey(partner.type)
    : "business";
  const categorySlugs = parsedSlugs.length > 0 ? parsedSlugs : [fallbackType];
  const localArea = getLocalAreaFromText(partner.address);
  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug,
    logo:
      partner.logoUrl || `https://picsum.photos/100/100?random=${partner.id}`,
    banner:
      partner.bannerUrl ||
      `https://picsum.photos/1200/400?random=${partner.id}`,
    isOpen: true,
    category: categorySlugs[0],
    categorySlugs,
    rating: partner.rating ?? 0,
    reviewCount: partner.reviewCount ?? 0,
    soldCount: partner.soldCount ?? 0,
    deliveryTime: "N/A",
    products: [],
    address: partner.address,
    localAreaSlug: localArea?.slug,
    localAreaLabel: localArea?.label,
    isInvestor: partner.isInvestor ?? false,
    investmentAmount: partner.investmentAmount ?? 0,
  };
}
