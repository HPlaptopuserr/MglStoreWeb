import { randomBytes } from "node:crypto";
import express, { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import QRCode from "qrcode";
import { prisma } from "@mgl/database";
import { getVendorSystemQrConfig } from "../../services/vendor-merchant.service";
import { createSystemQrInvoice } from "../../services/systemqr";
import { parseNomadInvoice, renderNomadPaymentPage, type NomadPaymentInvoice } from "./nomad-payment-page";

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

function sendPage(res: Response, status: number, options: Omit<Parameters<typeof renderNomadPaymentPage>[0], "nonce"> = {}) {
  const nonce = randomBytes(18).toString("base64");
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  res.status(status).type("html").send(renderNomadPaymentPage({ nonce, ...options }));
}

export function createNomadPaymentRouter(deps: PaymentDependencies = dependencies): Router {
  const router = Router();
  const invoices = new Map<string, { amount: number; expires: number; result: Promise<NomadPaymentInvoice> }>();
  router.get("/nomad", (_req, res) => sendPage(res, 200));
  router.post("/nomad", rateLimit({
    windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (_req, res) => sendPage(res, 429, { error: "Хэт олон хүсэлт илгээлээ. Нэг минутын дараа дахин оролдоно уу." }),
  }), express.urlencoded({ extended: false, limit: "2kb" }), async (req, res) => {
    const body: unknown = req.body;
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const amountText = typeof record.amount === "string" ? record.amount.trim() : "";
    const requestId = typeof record.requestId === "string" ? record.requestId : "";
    const amount = Number(amountText);
    if (!/^[0-9]{1,9}$/.test(amountText) || !Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000 ||
        !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(requestId)) {
      sendPage(res, 400, { error: "Төлөх дүнгээ 1–100,000,000 төгрөгийн хооронд бүхэл тоогоор оруулна уу." });
      return;
    }
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      sendPage(res, 403, { error: "Төлбөрийн хуудсаа дахин нээгээд оролдоно уу." });
      return;
    }
    for (const [key, cached] of invoices) if (cached.expires < Date.now()) invoices.delete(key);
    const previous = invoices.get(requestId);
    if (previous && previous.amount !== amount) {
      sendPage(res, 409, { error: "Дүн өөрчлөх бол төлбөрийн хуудсаа дахин нээнэ үү." });
      return;
    }
    try {
      let result = previous?.result;
      if (!result) {
        if (invoices.size >= 1000) {
          sendPage(res, 503, { amount, error: "Төлбөрийн үйлчилгээ ачаалалтай байна. Түр хүлээгээд дахин оролдоно уу." });
          return;
        }
        result = (async () => {
          const config = await deps.getMerchant();
          if (config?.merchantCode !== NOMAD_MERCHANT_CODE || !config.username || !config.password) {
            throw new Error("Nomad merchant unavailable");
          }
          return parseNomadInvoice(await deps.createInvoice(amount, requestId.replace(/-/g, ""), config));
        })();
        invoices.set(requestId, { amount, expires: Date.now() + 10 * 60_000, result });
      }
      const invoice = await result;
      const qrSvg = await QRCode.toString(invoice.qrText, { type: "svg", errorCorrectionLevel: "M", margin: 4, width: 280 });
      sendPage(res, 200, { amount, invoice, qrSvg });
    } catch {
      invoices.delete(requestId);
      sendPage(res, 502, { amount, error: "Төлбөрийн QR үүсгэж чадсангүй. Түр хүлээгээд дахин оролдоно уу." });
    }
  });
  return router;
}

const router: Router = createNomadPaymentRouter();
export default router;
