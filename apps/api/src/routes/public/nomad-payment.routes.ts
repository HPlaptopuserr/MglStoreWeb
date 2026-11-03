import { randomUUID } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "@mgl/database";
import { getVendorSystemQrConfig } from "../../services/vendor-merchant.service";
import { createSystemQrInvoice } from "../../services/systemqr";

const NOMAD_MERCHANT_CODE = "MGL_STEPPE_1783745574293";
type MerchantConfig = { merchantCode: string; username?: string; password?: string };
interface PaymentDependencies {
  getMerchant: () => Promise<MerchantConfig | null>;
  createInvoice: (amount: number, reference: string, config: MerchantConfig) => Promise<unknown>;
}

const dependencies: PaymentDependencies = {
  async getMerchant() {
    const org = await prisma.organization.findUnique({
      where: { qpayMerchantId: NOMAD_MERCHANT_CODE },
      select: { id: true },
    });
    return org ? getVendorSystemQrConfig(org.id, "POS") : null;
  },
  createInvoice: (amount, referenceNumber, config) => createSystemQrInvoice({
    merchantCode: config.merchantCode, amount, referenceNumber,
  }, config.username, config.password),
};

export function getNomadBankSelectionUrl(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("Incomplete invoice");
  const invoice = value as Record<string, unknown>;
  if (typeof invoice.invoiceId !== "string" || !invoice.invoiceId ||
      typeof invoice.qrText !== "string" || !invoice.qrText.startsWith("000201") ||
      invoice.qrText.length > 4096) {
    throw new Error("Incomplete invoice");
  }
  // QPay's hosted chooser passes the unmodified Minu QR to each bank app.
  const url = new URL("https://qpay.mn/q/");
  url.searchParams.set("q", invoice.qrText);
  return url.href;
}

export function createNomadPaymentRouter(deps: PaymentDependencies = dependencies): Router {
  const router = Router();
  router.use("/nomad", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/nomad", rateLimit({
    windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
    message: "Хэт олон хүсэлт илгээлээ. Нэг минутын дараа дахин оролдоно уу.",
  }), async (_req, res) => {
    try {
      const config = await deps.getMerchant();
      if (config?.merchantCode !== NOMAD_MERCHANT_CODE || !config.username || !config.password) {
        throw new Error("Nomad merchant unavailable");
      }
      // Minu accepts zero for this merchant. Preserve its QR exactly; the bank
      // controls the payment screen. No amount or recipient comes from the URL.
      const invoice = await deps.createInvoice(0, randomUUID().replace(/-/g, ""), config);
      res.redirect(302, getNomadBankSelectionUrl(invoice));
    } catch {
      res.status(502).type("html").send(`<!doctype html><html lang="mn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nomad Mongol · Төлбөр</title><main><h1>Төлбөрийн холбоос түр боломжгүй байна</h1><p>Minu-тай холбогдож чадсангүй.</p><a href="/pay/nomad">Дахин оролдох</a></main></html>`);
    }
  });
  // Previously opened amount forms should also reach the bank chooser.
  router.post("/nomad", (_req, res) => res.redirect(303, "/pay/nomad"));
  return router;
}

const router: Router = createNomadPaymentRouter();
export default router;
