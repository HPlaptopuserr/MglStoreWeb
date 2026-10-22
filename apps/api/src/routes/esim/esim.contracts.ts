import { checkoutPrice } from "../../services/esim/member-pricing";
import type { SupplierOffer } from "../../services/esim/offers";
import { type PricingPolicy } from "../../services/esim/pricing";

export interface QuoteInput {
  country: string;
  offerId: string;
  memberPrice: boolean;
}

export function parseQuoteInput(body: unknown): QuoteInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (
    typeof input.country !== "string" ||
    !/^[A-Z]{2}$/.test(input.country) ||
    typeof input.offerId !== "string" ||
    !input.offerId.trim() ||
    input.offerId.length > 200 ||
    (input.memberPrice !== undefined &&
      typeof input.memberPrice !== "boolean") ||
    Object.keys(input).some(
      (key) => !["country", "offerId", "memberPrice"].includes(key),
    )
  )
    return null;
  return {
    country: input.country,
    offerId: input.offerId,
    memberPrice: input.memberPrice === true,
  };
}

/** Explicit allowlist: supplier costs must never reach the public response. */
export function publicOffer(
  offer: SupplierOffer,
  policy: PricingPolicy | null,
  memberEligible = false,
) {
  return {
    id: offer.id,
    supplier: offer.supplier,
    title: offer.title,
    countries: offer.countries,
    dataMb: offer.dataMb,
    days: offer.days,
    activation: offer.activation,
    totalMnt: policy ? checkoutPrice(offer.wholesaleUsdUnits, policy, false) : null,
    memberTotalMnt: memberEligible && policy
      ? checkoutPrice(offer.wholesaleUsdUnits, policy, true)
      : null,
    currency: "MNT" as const,
  };
}
