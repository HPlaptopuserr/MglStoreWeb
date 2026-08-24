import {
  PUBLIC_MARKETPLACE_PRICING_AUDIENCE,
  resolveMarketplaceProductPricing,
  type MarketplacePricingAudience,
} from "@mgl/types";

export type MemberDiscount = {
  percent: number;
  validUntil?: string | null;
};

type MarketplacePricingUser = {
  isPrime?: boolean;
  membership?: { active?: boolean } | null;
  orgRole?: string | null;
  organizations?: Array<{ role?: string | null }> | null;
} | null;

export function resolveMarketplacePricingAudience(
  user: MarketplacePricingUser,
): MarketplacePricingAudience {
  if (!user) return PUBLIC_MARKETPLACE_PRICING_AUDIENCE;

  return {
    isMember:
      user.membership !== undefined
        ? Boolean(user.membership?.active)
        : Boolean(user.isPrime),
    isStoreOwner: Boolean(
      user.orgRole === "OWNER" ||
      user.organizations?.some((organization) => organization.role === "OWNER"),
    ),
  };
}

export function resolveMemberPricing(
  price: number,
  discounts?: MemberDiscount[] | null,
  audience: MarketplacePricingAudience = PUBLIC_MARKETPLACE_PRICING_AUDIENCE,
  supplyType?: string | null,
) {
  return resolveMarketplaceProductPricing(price, {
    ...audience,
    supplyType,
    memberDiscountPercent: discounts?.[0]?.percent,
  });
}
