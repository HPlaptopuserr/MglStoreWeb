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
export function checkoutPrice(
  cost: number,
  policy: PricingPolicy,
  memberPrice: boolean,
  now = Date.now(),
): number {
  const breakdown = priceOffer(cost, policy, now);
  return memberPrice
    ? Math.ceil(breakdown.supplierCostMnt / policy.roundingMnt) *
        policy.roundingMnt
    : breakdown.totalMnt;
}
