import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { EsimCatalogService } from "../../services/esim/catalog-service";
import { readPricingPolicy } from "../../services/esim/config";
import { EsimQuoteService } from "../../services/esim/quote-service";
import { esimAccessCatalog } from "../../services/esim/supplier-catalog";
import { AccessFulfillment } from "../../services/esim/access-fulfillment";
import { ActivationVault } from "../../services/esim/activation-vault";
import { checkoutEnabled } from "../../services/esim/checkout-config";
import { memberEligible } from "../../services/esim/member-pricing";
import { EsimPurchaseService } from "../../services/esim/purchase-service";
import { PrismaPurchaseStore } from "../../services/esim/purchase-store";
import {
  esimMinuConfig,
  createEsimMinuInvoice,
  checkEsimMinuPayment,
} from "../../services/esim/minu-payment";
import { createEsimRouter } from "./esim.routes";

const catalog = new EsimCatalogService(
  process.env.ESIM_ACCESS_CODE?.trim()
    ? [esimAccessCatalog(process.env.ESIM_ACCESS_CODE)]
    : [],
);
const pricing = () => readPricingPolicy(process.env);
const quotes = () => new EsimQuoteService(process.env.ESIM_QUOTE_SECRET ?? "");
const terms = () => process.env.ESIM_REFUND_TERMS?.trim() ?? "";
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
  enabled: () => checkoutEnabled(process.env),
  supplier: () => new AccessFulfillment(process.env.ESIM_ACCESS_CODE ?? ""),
  vault: () => new ActivationVault(process.env.ESIM_ACTIVATION_KEY ?? ""),
  merchantCode: () => esimMinuConfig().merchantCode,
  createInvoice: createEsimMinuInvoice,
  checkPayment: checkEsimMinuPayment,
});
// The durable poller verifies Minu itself. No incoming callback can mark an order paid.
export const reconcileEsimPurchases = () => purchases.tick();
export default createEsimRouter({
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
  checkoutEnabled: () => checkoutEnabled(process.env),
  purchases: () => purchases,
});
