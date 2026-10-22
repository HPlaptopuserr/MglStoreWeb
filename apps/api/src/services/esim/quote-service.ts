import { createHmac, timingSafeEqual } from "node:crypto";
import type { PricingPolicy } from "./pricing";
import { checkoutPrice } from "./member-pricing";
import type { SupplierOffer } from "./offers";
import { object } from "./supplier-http";
export interface EsimQuote {
  offerId: string;
  totalMnt: number;
  currency: "MNT";
  expiresAt: string;
  token: string;
  checkoutAvailable: boolean;
  memberPrice: boolean;
  terms: string;
}
/** Signed, user-bound quote. Not a payment receipt or an authorization to provision. */
export class EsimQuoteService {
  constructor(private readonly secret: string) {
    if (Buffer.byteLength(secret) < 32)
      throw new Error("Quote secret must be at least 32 bytes");
  }
  issue(
    userId: string,
    offer: SupplierOffer,
    policy: PricingPolicy,
    now = Date.now(),
    options: {
      memberPrice?: boolean;
      checkoutAvailable?: boolean;
      terms?: string;
      country?: string;
    } = {},
  ): EsimQuote {
    const memberPrice = options.memberPrice === true;
    const totalMnt = checkoutPrice(
      offer.wholesaleUsdUnits,
      policy,
      memberPrice,
      now,
    );
    const expires = Math.min(now + 5 * 60000, policy.fxAt + 86400000);
    if (expires <= now) throw new Error("Expired FX");
    // Supplier costs stay server-side; they are not embedded in the client token.
    const encoded = Buffer.from(
      JSON.stringify({
        userId,
        offerId: offer.id,
        totalMnt,
        expires,
        memberPrice,
        terms: options.terms ?? "",
        country: options.country ?? "CN",
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", this.secret)
      .update(encoded)
      .digest("base64url");
    return {
      offerId: offer.id,
      totalMnt,
      currency: "MNT",
      expiresAt: new Date(expires).toISOString(),
      token: `${encoded}.${signature}`,
      checkoutAvailable: options.checkoutAvailable === true,
      memberPrice,
      terms: options.terms ?? "",
    };
  }
  verify(
    token: string,
    userId: string,
    now = Date.now(),
  ): {
    offerId: string;
    totalMnt: number;
    memberPrice: boolean;
    terms: string;
    country: string;
  } {
    if (token.length > 4096) throw new Error("Invalid quote");
    const parts = token.split(".");
    if (parts.length !== 2) throw new Error("Invalid quote");
    const [encoded, signature] = parts as [string, string];
    const expected = createHmac("sha256", this.secret).update(encoded).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error("Invalid quote");
    const value = object(
      JSON.parse(Buffer.from(encoded, "base64url").toString()),
    );
    if (
      value.userId !== userId ||
      typeof value.expires !== "number" ||
      value.expires <= now ||
      typeof value.offerId !== "string" ||
      typeof value.totalMnt !== "number" ||
      !Number.isSafeInteger(value.totalMnt) ||
      value.totalMnt <= 0 ||
      typeof value.memberPrice !== "boolean" ||
      typeof value.terms !== "string" ||
      typeof value.country !== "string" ||
      !/^[A-Z]{2}$/.test(value.country)
    )
      throw new Error("Invalid quote");
    return {
      offerId: value.offerId,
      totalMnt: value.totalMnt,
      memberPrice: value.memberPrice,
      terms: value.terms,
      country: value.country,
    };
  }
}
