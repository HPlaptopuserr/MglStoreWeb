import { ActivationVault } from "./activation-vault";
import { readPricingPolicy } from "./config";
import { esimMinuConfig } from "./minu-payment";
import { priceOffer } from "./pricing";
import { EsimQuoteService } from "./quote-service";

/** Configuration diagnostics only: no external requests or secret values. */
export function esimReadiness(env: NodeJS.ProcessEnv, now = Date.now()) {
  const valid = (check: () => unknown): boolean => {
    try { check(); return true; } catch { return false; }
  };
  return {
    pricing: valid(() => priceOffer(10000, readPricingPolicy(env), now)),
    quoteSecret: valid(() => new EsimQuoteService(env.ESIM_QUOTE_SECRET ?? "")),
    activationEncryption: valid(() => new ActivationVault(env.ESIM_ACTIVATION_KEY ?? "")),
    minuMerchant: valid(() => esimMinuConfig(env)),
    supplierCredentials: Boolean(env.ESIM_ACCESS_CODE?.trim()),
    refundTerms: Boolean(env.ESIM_REFUND_TERMS?.trim()),
    publicCallback: valid(() => {
      const url = new URL(env.API_PUBLIC_URL ?? "");
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        throw new Error("HTTPS public origin required");
      }
    }),
    workerEnabled: env.ESIM_WORKER_ENABLED === "true",
  };
}
