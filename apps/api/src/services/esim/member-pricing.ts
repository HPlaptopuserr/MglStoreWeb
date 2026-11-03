import { priceOffer, type PricingPolicy } from "./pricing";
export function memberEligible(
  user: { isPrime: boolean; membershipExpiresAt: Date | null } | null,
  now = Date.now(),
): boolean {
  // Match the existing store membership policy, including lifetime memberships.
  return Boolean(
    user?.isPrime &&
    (!user.membershipExpiresAt || user.membershipExpiresAt.getTime() > now),
  );
}
export interface ManualEsimPrices {
  kind: "manual";
  prices: Readonly<Record<string, number>>;
}
export type EsimPriceSource = PricingPolicy | ManualEsimPrices;
export function isManualPricing(
  policy: EsimPriceSource,
): policy is ManualEsimPrices {
  return "kind" in policy && policy.kind === "manual";
}
export function checkoutPrice(
  cost: number,
  policy: EsimPriceSource,
  memberPrice: boolean,
  now = Date.now(),
  offerId?: string,
): number {
  if (isManualPricing(policy)) {
    const price = offerId ? policy.prices[offerId] : undefined;
    if (
      !Number.isSafeInteger(price) ||
      !price ||
      price < 1 ||
      price > 2147483647
    )
      throw new Error("Offer price unavailable");
    return price;
  }
  const breakdown = priceOffer(cost, policy, now);
  return memberPrice
    ? Math.ceil(breakdown.supplierCostMnt / policy.roundingMnt) *
        policy.roundingMnt
    : breakdown.totalMnt;
}
