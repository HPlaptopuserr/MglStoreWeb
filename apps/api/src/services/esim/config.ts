import type { PricingPolicy } from "./pricing";
export function readPricingPolicy(env: NodeJS.ProcessEnv): PricingPolicy {
  if (env.ESIM_PRICING_REVIEWED !== "true")
    throw new Error("Pricing review required");
  const value = (key: string): number => {
    const raw = env[key];
    if (raw === undefined || raw.trim() === "")
      throw new Error(`Missing ${key}`);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0)
      throw new Error(`Invalid ${key}`);
    return parsed;
  };
  return {
    usdMnt: value("ESIM_USD_MNT"),
    fxAt: Date.parse(env.ESIM_FX_UPDATED_AT ?? ""),
    vatBps: value("ESIM_VAT_BPS"),
    incomeTaxReserveBps: value("ESIM_INCOME_TAX_RESERVE_BPS"),
    qrFeeBps: 100,
    fundingFeeBps: value("ESIM_FUNDING_FEE_BPS"),
    refundReserveBps: value("ESIM_REFUND_RESERVE_BPS"),
    additionalSupplierTaxBps: value("ESIM_SUPPLIER_TAX_BPS"),
    overheadPerOrderMnt: value("ESIM_OVERHEAD_PER_ORDER_MNT"),
    profitMarkupBps: 3000,
    roundingMnt: 100,
  };
}
