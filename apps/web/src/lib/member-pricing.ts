export type MemberDiscount = {
  percent: number;
  validUntil?: string | null;
};

export function resolveMemberPricing(
  price: number,
  discounts?: MemberDiscount[] | null,
  isMember = false,
) {
  const discount = discounts?.[0] || null;
  const percent = discount?.percent && discount.percent > 0 ? discount.percent : 0;
  const memberPrice = percent
    ? Math.max(0, Math.round(price * (1 - percent / 100)))
    : price;
  const active = Boolean(isMember && percent > 0 && memberPrice < price);

  return {
    active,
    percent,
    price: active ? memberPrice : price,
    memberPrice: percent ? memberPrice : null,
    originalPrice: active ? price : null,
    savings: active ? price - memberPrice : 0,
    label: percent ? `Member -${percent}%` : null,
  };
}
