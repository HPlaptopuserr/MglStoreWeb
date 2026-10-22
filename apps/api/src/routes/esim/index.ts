import type { Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, requireRole } from "../../middleware/auth";
import { EsimCatalogService } from "../../services/esim/catalog-service";
import { esimSalesStore } from "../../services/esim/sales-settings";
import { esimReadiness } from "../../services/esim/readiness";
import type { ManualEsimPrices } from "../../services/esim/member-pricing";
import { EsimQuoteService } from "../../services/esim/quote-service";
import { esimAccessCatalog } from "../../services/esim/supplier-catalog";
import { AccessFulfillment } from "../../services/esim/access-fulfillment";
import { ActivationVault } from "../../services/esim/activation-vault";

import { memberEligible } from "../../services/esim/member-pricing";
import { EsimPurchaseService } from "../../services/esim/purchase-service";
import { PrismaPurchaseStore } from "../../services/esim/purchase-store";
import {
  esimMinuConfig,
  createEsimMinuInvoice,
  checkEsimMinuPayment,
} from "../../services/esim/minu-payment";
import { createEsimAdminRouter } from "./admin.routes";
import { createEsimRouter } from "./esim.routes";

const catalog = new EsimCatalogService(
  process.env.ESIM_ACCESS_CODE?.trim()
    ? [esimAccessCatalog(process.env.ESIM_ACCESS_CODE)]
    : [],
);
const pricing = async (): Promise<ManualEsimPrices> => {
  const { settings } = await esimSalesStore.read();
  return {
    kind: "manual",
    prices: settings.mode === "live" ? settings.prices : {},
  };
};
const checkoutEnabled = async () => {
  const { settings } = await esimSalesStore.read();
  const checks = esimReadiness({
    ...process.env,
    ESIM_REFUND_TERMS: settings.terms,
  });
  return (
    settings.mode === "live" &&
    Object.keys(settings.prices).length > 0 &&
    process.env.ESIM_CHECKOUT_ENABLED === "true" &&
    Object.entries(checks).every(([key, ready]) => key === "pricing" || ready)
  );
};
const quotes = () => new EsimQuoteService(process.env.ESIM_QUOTE_SECRET ?? "");
const terms = async () => (await esimSalesStore.read()).settings.terms;
const member = async (id: string) =>
  memberEligible(
    await prisma.user.findFirst({
      where: { id, isActive: true, deletedAt: null },
      select: { isPrime: true, membershipExpiresAt: true },
    }),
  );
const purchases = new EsimPurchaseService({
  store: new PrismaPurchaseStore(prisma),
  catalog,
  pricing,
  quotes,
  terms,
  member,
  enabled: checkoutEnabled,
  supplier: () => new AccessFulfillment(process.env.ESIM_ACCESS_CODE ?? ""),
  vault: () => new ActivationVault(process.env.ESIM_ACTIVATION_KEY ?? ""),
  merchantCode: () => esimMinuConfig().merchantCode,
  createInvoice: createEsimMinuInvoice,
  checkPayment: checkEsimMinuPayment,
});
// The durable poller verifies Minu itself. No incoming callback can mark an order paid.
export const reconcileEsimPurchases = () => purchases.tick();
export default createEsimRouter({
  marketing: async () => {
    const { settings } = await esimSalesStore.read();
    return { mode: settings.mode, announcement: settings.announcement };
  },
  authenticate: requireAuth,
  activeUser: async (id) =>
    Boolean(
      await prisma.user.findFirst({
        where: { id, isActive: true, deletedAt: null },
        select: { id: true },
      }),
    ),
  catalog,
  pricing,
  quotes,
  member,
  terms,
  checkoutEnabled: checkoutEnabled,
  purchases: () => purchases,
});

export const esimAdminRoutes: ExpressRouter = createEsimAdminRouter({
  authorize: [requireAuth, requireRole("ADMIN", "SUPER_ADMIN")],
  store: esimSalesStore,
  catalog,
  readiness: () => esimReadiness(process.env),
});
