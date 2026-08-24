export const PREORDER_MEMBER_DISCOUNT_PERCENT = 5;
export const PREORDER_STORE_OWNER_DISCOUNT_PERCENT = 10;

export type MarketplacePricingAudience = {
  isMember: boolean;
  isStoreOwner: boolean;
};

export type MarketplacePricingInput = MarketplacePricingAudience & {
  supplyType?: string | null;
  memberDiscountPercent?: number | null;
};

export type MarketplacePricingResult = {
  active: boolean;
  percent: number;
  price: number;
  memberPrice: number | null;
  originalPrice: number | null;
  savings: number;
  label: string | null;
};

export const PUBLIC_MARKETPLACE_PRICING_AUDIENCE: MarketplacePricingAudience = {
  isMember: false,
  isStoreOwner: false,
};

export function resolveMarketplaceProductPricing(
  basePrice: number | string,
  input: MarketplacePricingInput,
): MarketplacePricingResult {
  const numericBasePrice = Number(basePrice);
  const price = Number.isFinite(numericBasePrice)
    ? Math.max(0, numericBasePrice)
    : 0;
  const isPreorder = input.supplyType === "CHINA_PREORDER";

  let percent = 0;
  let label: string | null = null;

  if (isPreorder && input.isStoreOwner) {
    percent = PREORDER_STORE_OWNER_DISCOUNT_PERCENT;
    label = `Дэлгүүрийн эзэн -${percent}%`;
  } else if (isPreorder && input.isMember) {
    percent = PREORDER_MEMBER_DISCOUNT_PERCENT;
    label = `Гишүүн -${percent}%`;
  } else if (input.isMember) {
    const configuredPercent = Number(input.memberDiscountPercent || 0);
    if (Number.isFinite(configuredPercent) && configuredPercent > 0) {
      percent = Math.min(100, configuredPercent);
      label = `Гишүүн -${percent}%`;
    }
  }

  const discountedPrice = percent
    ? Math.max(0, Math.round(price * (1 - percent / 100)))
    : price;
  const active = percent > 0 && discountedPrice < price;

  return {
    active,
    percent,
    price: active ? discountedPrice : price,
    memberPrice: percent ? discountedPrice : null,
    originalPrice: active ? price : null,
    savings: active ? price - discountedPrice : 0,
    label: active ? label : null,
  };
}
