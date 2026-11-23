import { reconcilePosQPayInvoicePayment, resolveSystemQrConfig, isSystemQrAuthenticationError } from "../../../services/pos-qpay-reconciliation";
import type { QPayInvoice as QPayInvoiceResponse } from "@mgl/types";
import type { CardCheckout } from "../../../services/pos-card-checkout";
import { lockOrganizationInventory } from "../../../services/vendor-inventory-warehouse.service";
import { parseCardCheckout, checkoutFromPayload, sameCheckout, reserveCardCheckout, releaseResolvedCheckoutReservation, isQrCancellationConfirmed } from "../../../services/pos-card-checkout";
import { canSimulateLocalPosPayment } from "../../../services/local-pos-payment-simulation";
import { usesOrganizationMerchant } from "../../../services/pos-merchant-scope";
import { isPaymentRequestId, matchesPaymentRequest } from "../../../services/payment-request-identity";
import { canReleaseCheckoutAfterCancelFailure } from "../../../services/pos-qpay-cancel-policy";
import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import {
  cancelQPayInvoice,
  createQPayInvoice,
} from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import {
  cancelSystemQrInvoice,
  createSystemQrInvoice,
} from "../../../services/systemqr";
import {
  requirePosUser, requireAdminUser, normalizePaymentMethod, normalizeRegisterName,
  roundMoney, moneyMatches, signPayload, timingSafeEqualHex, getHeaderValue,
  parseBridgeResultStatus, parseQPaySuccess, parseOptionalDate,
  makePushEcrReferral, pushEcrHeaders, pushEcrBaseUrl,
  allowPosSimulation, isProdLikeEnv, bridgeSharedSecret,
  pushEcrDefaultTerminalId, MONEY_EPSILON,
  type AuthUser, type ApiError, type SaleLineInput, type SalePaymentLineInput,
  type CreateSaleBody, type PushEcrPurchaseResponse, toApiError, parseAuthClaims, runtimeEnv,
} from "./_shared";

type RecoverableQPayInvoice = QPayInvoiceResponse & {
  providerCancellationConfirmed?: boolean;
  checkout: CardCheckout;
};

const router: ExpressRouter = Router();

router.get("/pos/payments/capabilities", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  return res.json({ paymentRecoveryVersion: 1, qrCheckoutVersion: 1, organizationMerchantScope: true, systemQrOrganizationInvoices: true });
});

const isPublicCallbackBaseUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      return false;
    }
    return url.protocol === "https:" || process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
};

router.post(["/pos/payments/qpay/invoice", "/pos/payments/systemqr/invoice"], async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const amount = Number(req.body?.amount || 0);
  const registerId: string | null = req.body?.registerId || null;
  const bodyOrganizationId: string | null = req.body?.organizationId || null;

  console.log("[Minu invoice] amount:", amount, "registerId:", registerId, "orgId:", bodyOrganizationId);

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    return res.status(400).json({ message: "Minu amount буруу байна" });
  }

  let invoicePersisted = false;
  try {
    const checkout = req.body?.checkout === undefined ? null : parseCardCheckout(req.body.checkout);
    let effectiveOrganizationId: string | null = null;
    let registerQpayConfig: {
      qpayEnabled: boolean;
      qpayMerchantId: string | null;
      qpayTerminalId: string | null;
    } | null = null;
    if (registerId) {
      const register = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: {
          id: true,
          organizationId: true,
          activationStatus: true,
          isActive: true,
          qpayEnabled: true,
          qpayMerchantId: true,
          qpayTerminalId: true,
        },
      });

      if (!register) {
        return res.status(404).json({ message: "POS register олдсонгүй" });
      }
      if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
        return res.status(403).json({ message: "POS register идэвхгүй эсвэл батлагдаагүй байна" });
      }
      if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, register.organizationId))) {
        return res.status(403).json({ message: "Өөр байгууллагын register дээр invoice үүсгэх боломжгүй" });
      }

      registerQpayConfig = {
        qpayEnabled: register.qpayEnabled,
        qpayMerchantId: register.qpayMerchantId,
        qpayTerminalId: register.qpayTerminalId,
      };

      effectiveOrganizationId = register.organizationId;
    }

    if (!effectiveOrganizationId) {
      effectiveOrganizationId =
        actor.role === "ADMIN"
          ? bodyOrganizationId
          : (actor.organizationId || bodyOrganizationId);
    }

    if (actor.role !== "ADMIN" && bodyOrganizationId && bodyOrganizationId !== effectiveOrganizationId) {
      return res.status(403).json({ message: "organizationId зөрүүтэй байна" });
    }

    const requestId = typeof req.body?.requestId === "string" ? req.body.requestId : undefined;
    if (requestId && !isPaymentRequestId(requestId)) {
      return res.status(400).json({ message: "requestId формат буруу байна" });
    }
    if (requestId) {
      const existing = await prisma.qPayInvoice.findUnique({ where: { id: requestId } });
      if (existing) {
        if (!matchesPaymentRequest(existing, { organizationId: effectiveOrganizationId, registerId, amount })) {
          return res.status(409).json({ message: "Төлбөрийн хүсэлтийн мэдээлэл зөрүүтэй байна" });
        }
        const savedCheckout = checkoutFromPayload(existing.webhookPayload);
        if (checkout && (!savedCheckout || !sameCheckout(checkout, savedCheckout))) {
          return res.status(409).json({ message: "Төлбөртэй сагсны мэдээлэл өөрчлөгдсөн байна" });
        }
        const payload = (existing.webhookPayload || {}) as Record<string, unknown>;
        return res.json({ invoiceId: existing.id, amount: Number(existing.amount), status: existing.status,
          qrText: existing.qrText, qrImage: typeof payload.qrImage === "string" ? payload.qrImage : "",
          expiresAt: existing.expiresAt.toISOString(), createdAt: existing.createdAt.toISOString() });
      }
    }

    if (canSimulateLocalPosPayment({
      enabled: allowPosSimulation,
      localDev: process.env.MGL_LOCAL_DEV === "true",
      environment: runtimeEnv,
      databaseUrl: process.env.DATABASE_URL,
      hostname: req.hostname,
      remoteAddress: req.socket.remoteAddress,
      registerId,
    })) {
      const localInvoice = await prisma.qPayInvoice.create({ data: {
        ...(requestId ? { id: requestId } : {}),
        organizationId: effectiveOrganizationId,
        registerId,
        initiatedById: actor.id,
        amount,
        qrText: "LOCAL-TEST-PAYMENT",
        status: PosQPayStatus.PAID,
        paidAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        paymentId: `local-sim-${requestId || crypto.randomUUID()}`,
        webhookPayload: { provider: "LOCAL_SIMULATION", simulated: true, message: "Local test payment; no bank request" },
      } });
      return res.json({ invoiceId: localInvoice.id, amount: Number(localInvoice.amount), status: localInvoice.status,
        qrText: "", qrImage: "", expiresAt: localInvoice.expiresAt.toISOString(), createdAt: localInvoice.createdAt.toISOString(), simulated: true });
    }

    const requiresSystemQr = req.path === "/pos/payments/systemqr/invoice" || req.body?.provider === "SYSTEMQR";
    const organizationMerchant = requiresSystemQr || usesOrganizationMerchant(req.body);
    if (organizationMerchant) registerQpayConfig = null;
    console.log("[Minu invoice] registerQpayConfig:", JSON.stringify(registerQpayConfig));

    const systemQrConfig = await resolveSystemQrConfig(effectiveOrganizationId, registerQpayConfig);

    if (requiresSystemQr && !systemQrConfig) {
      return res.status(400).json({
        message: "Байгууллагын Minu QR холбогдоогүй байна. Owner нь Төлбөрийн данс хэсгээс Minu бүртгэлээ холбоно уу.",
      });
    }

    let merchantContext = systemQrConfig
      ? null
      : registerQpayConfig
        ? buildQPayMerchantContextFromPosRegister(registerQpayConfig)
        : null;

    console.log("[Minu invoice] merchantContext from register:", merchantContext ? "set" : "null");

    // Fall back to organization-level QPay config when register has no config
    if (!merchantContext && !systemQrConfig && effectiveOrganizationId) {
      const orgRes = await getVendorMerchantConfig(effectiveOrganizationId, "POS", { allowCentralFallback: !organizationMerchant });
      console.log("[Minu invoice] organization configuration available:", Boolean(orgRes.config));
      merchantContext = orgRes.config ?? null;
    }

    // Merge org-level bank accounts into context if context has none (register doesn't store bank accounts)
    if (merchantContext && !merchantContext.bankAccounts?.length && effectiveOrganizationId) {
      const orgRes = await getVendorMerchantConfig(effectiveOrganizationId, "POS", { allowCentralFallback: !organizationMerchant });
      if (orgRes.config?.bankAccounts?.length) {
        merchantContext = { ...merchantContext, bankAccounts: orgRes.config.bankAccounts };
        console.log("[Minu invoice] Merged org bank accounts into context:", orgRes.config.bankAccounts.length);
      }
    }



    if (!merchantContext && !systemQrConfig) {
      return res.status(400).json({
        message: "Minu merchant тохиргоо дутуу байна. Тохиргоо хуудаснаас Minu дансаа холбоно уу.",
      });
    }

    // Org нэрийг invoice description-д ашиглах
    let orgName = "MGL Store";
    if (effectiveOrganizationId) {
      const orgForName = await prisma.organization.findUnique({
        where: { id: effectiveOrganizationId },
        select: { name: true },
      });
      if (orgForName?.name) orgName = orgForName.name;
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const created = await prisma.$transaction(async tx => {
      if (effectiveOrganizationId) await lockOrganizationInventory(tx, effectiveOrganizationId);
      const existing = requestId ? await tx.qPayInvoice.findUnique({ where: { id: requestId } }) : null;
      if (existing) {
        invoicePersisted = true;
        const savedCheckout = checkoutFromPayload(existing.webhookPayload);
        if (!matchesPaymentRequest(existing, { organizationId: effectiveOrganizationId, registerId, amount }) ||
            (checkout && (!savedCheckout || !sameCheckout(checkout, savedCheckout)))) {
          throw toApiError(409, "Төлбөрийн хүсэлтийн мэдээлэл зөрүүтэй байна");
        }
        return { invoice: existing, isNew: false };
      }
      if (checkout) {
        if (!effectiveOrganizationId || !registerId) throw toApiError(400, "Кассын мэдээлэл дутуу байна");
        await reserveCardCheckout(tx, { checkout, organizationId: effectiveOrganizationId, registerId, amount, cashierId: actor.id });
      }
      const invoice = await tx.qPayInvoice.create({
      data: {
        ...(requestId ? { id: requestId } : {}),
        registerId: registerId || null,
        organizationId: effectiveOrganizationId || null,
        initiatedById: actor?.id || null,
        amount,
        webhookPayload: { merchantScope: organizationMerchant ? "ORGANIZATION" : "REGISTER", provider: systemQrConfig ? "SYSTEMQR" : "QPAY", merchantCode: systemQrConfig?.merchantCode || null, ...(checkout ? { checkout: checkout as unknown as Prisma.JsonObject } : {}) },
        qrText: "",
        status: PosQPayStatus.PENDING,
        expiresAt,
      },
      });
      return { invoice, isNew: true };
    }, { timeout: 30_000 });
    const { invoice } = created;
    invoicePersisted = true;
    if (!created.isNew) {
      const payload = (invoice.webhookPayload || {}) as Record<string, unknown>;
      return res.json({ invoiceId: invoice.id, amount: Number(invoice.amount), status: invoice.status,
        qrText: invoice.qrText, qrImage: typeof payload.qrImage === "string" ? payload.qrImage : "",
        expiresAt: invoice.expiresAt.toISOString(), createdAt: invoice.createdAt.toISOString() });
    }

    try {
      let qpayData: Awaited<ReturnType<typeof createQPayInvoice>>;
      if (systemQrConfig) {
        const publicUrl = (process.env.API_PUBLIC_URL || process.env.API_URL || "").replace(/\/+$/, "");
        let systemQrAuth = systemQrConfig;
        const systemQrInvoiceParams = {
          merchantCode: systemQrConfig.merchantCode,
          amount,
          referenceNumber: invoice.id,
          webhook: isPublicCallbackBaseUrl(publicUrl)
            ? `${publicUrl}/api/pos/qpay/cb?invoiceId=${invoice.id}`
            : undefined,
        };
        let systemQr: Awaited<ReturnType<typeof createSystemQrInvoice>>;
        try {
          systemQr = await createSystemQrInvoice(systemQrInvoiceParams, systemQrAuth.username, systemQrAuth.password);
        } catch (systemQrError) {
          const message = systemQrError instanceof Error ? systemQrError.message : String(systemQrError);
          if (!systemQrAuth.password || !/SystemQR Login Error|Хэрэглэгчийн нэр эсвэл нууц үг|username or password|credential|unauthorized|401|403/i.test(message)) {
            throw systemQrError;
          }
          console.warn("[SystemQR] subMerchant auth failed; trying master token", message);
          systemQr = await createSystemQrInvoice(systemQrInvoiceParams);
        }

        qpayData = {
          invoice_id: systemQr.invoiceId,
          qr_text: systemQr.qrText,
          qr_image: "",
          urls: systemQr.urls,
        };
      } else {
        qpayData = await createQPayInvoice({
          orderId: invoice.id,
          orderNumber: `POS-${invoice.id.slice(0, 8)}`,
          amount,
          description: `${orgName} - худалдан авалт`,
          merchantContext: merchantContext || undefined,
          callbackConfig: {
            path: "/api/pos/qpay/cb",
            query: {},
          },
        });
      }

      const updated = await prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          qrText: qpayData.qr_text,
          webhookPayload: {
            merchantScope: organizationMerchant ? "ORGANIZATION" : "REGISTER",
            providerInvoiceId: qpayData.invoice_id,
            provider: systemQrConfig ? "SYSTEMQR" : "QPAY",
            merchantCode: systemQrConfig?.merchantCode || null,
            qrImage: qpayData.qr_image,
            deepLinks: qpayData.urls as unknown as Prisma.JsonArray,
            merchantKey: merchantContext?.merchantKey || null,
            ...(checkout ? { checkout: checkout as unknown as Prisma.JsonObject } : {}),
          } as unknown as Prisma.JsonObject,
        },
      });

      void prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: AuditAction.POS_QPAY_INVOICE_CREATED,
          ip: req.ip,
          meta: {
            invoiceId: updated.id,
            providerInvoiceId: qpayData.invoice_id,
            registerId: updated.registerId,
            organizationId: updated.organizationId,
            amount: Number(updated.amount),
          },
        },
      });

      return res.status(201).json({
        invoiceId: updated.id,
        providerInvoiceId: qpayData.invoice_id,
        amount: Number(updated.amount),
        qrText: updated.qrText,
        qrImage: qpayData.qr_image,
        deepLinks: qpayData.urls,
        status: updated.status,
        expiresAt: updated.expiresAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      });
    } catch (qpayError) {
      // Preserve the local reference: a timed-out provider may still have created
      // the invoice. Deleting it would erase the reconciliation trail.
      console.error("QR creation requires reconciliation", { invoiceId: invoice.id });
      throw qpayError;
    }
  } catch (error) {
    console.error("qpay invoice create error", error);
    const msg = error instanceof Error ? error.message : "Minu invoice үүсгэхэд алдаа гарлаа";
    const domainError = error as { status?: number; message?: string; code?: string };
    if (domainError.status && domainError.message) {
      return res.status(domainError.status).json({ message: domainError.message,
        ...(domainError.code ? { code: domainError.code } : !invoicePersisted ? { code: "PAYMENT_NOT_STARTED" } : {}),
      });
    }
    return res.status(500).json({ message: msg });
  }
});

router.get("/pos/payments/qpay/recovery", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const registerId = typeof req.query.registerId === "string" ? req.query.registerId.trim() : "";
  const clientSaleId = typeof req.query.clientSaleId === "string" ? req.query.clientSaleId.trim() : "";
  if (!registerId || !clientSaleId || registerId.length > 200 || clientSaleId.length > 200) {
    return res.status(400).json({ message: "Касс болон сагсны дугаар шаардлагатай" });
  }
  try {
    const register = await prisma.posRegister.findUnique({ where: { id: registerId }, select: { organizationId: true } });
    if (!register) return res.status(404).json({ message: "POS register олдсонгүй" });
    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, register.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын төлбөр сэргээх боломжгүй" });
    }
    const saved = await prisma.qPayInvoice.findMany({ where: {
      organizationId: register.organizationId, registerId, consumedAt: null,
      status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED, PosQPayStatus.PAID] },
      webhookPayload: { path: ["checkout", "clientSaleId"], equals: clientSaleId },
    }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const invoices = saved.flatMap<RecoverableQPayInvoice>(invoice => {
      const checkout = checkoutFromPayload(invoice.webhookPayload);
      if (!checkout || checkout.clientSaleId !== clientSaleId ||
          (invoice.status !== PosQPayStatus.PAID && isQrCancellationConfirmed(invoice.webhookPayload))) return [];
      const payload = invoice.webhookPayload as Record<string, unknown>;
      return [{ invoiceId: invoice.id, amount: Number(invoice.amount), status: invoice.status,
        qrText: invoice.qrText, qrImage: typeof payload.qrImage === "string" ? payload.qrImage : "",
        expiresAt: invoice.expiresAt.toISOString(), createdAt: invoice.createdAt.toISOString(),
        ...(invoice.paidAt ? { paidAt: invoice.paidAt.toISOString() } : {}),
        ...(typeof payload.providerCancellationConfirmed === "boolean" ? { providerCancellationConfirmed: payload.providerCancellationConfirmed } : {}),
        checkout,
      }];
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ invoices });
  } catch (error: unknown) {
    console.error("qpay checkout recovery error", error);
    return res.status(500).json({ message: "QR төлбөрийн эх нэхэмжлэлийг сэргээж чадсангүй. Дахин төлөхгүйгээр шалгана уу." });
  }
});

// Quarantine an expired, unpaid basket without claiming that the bank cancelled it.
// Payment references and inventory reservations remain available for late settlement.
router.post("/pos/payments/qpay/review", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const id = typeof req.body?.invoiceId === "string" ? req.body.invoiceId : "";
  const snapshot = typeof req.body?.snapshot === "string" ? req.body.snapshot : "";
  if (!id || !snapshot || Buffer.byteLength(snapshot, "utf8") > 120_000) {
    return res.status(400).json({ message: "Хадгалах сагсны мэдээлэл шаардлагатай" });
  }
  try {
    const saved: unknown = JSON.parse(snapshot);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid snapshot");
    const basket = saved as Record<string, unknown>;
    const entries = basket.paymentEntries;
    if (!Array.isArray(entries) || entries.length !== 1 || !entries.every((entry: unknown) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const payment = entry as Record<string, unknown>;
      return payment.method === "QR" && payment.status === "pending" && payment.invoiceId === id;
    })) return res.status(409).json({ message: "Зөвхөн төлөгдөөгүй нэг QR хүсэлттэй сагсыг тусад нь хадгална" });
    const invoice = await prisma.qPayInvoice.findUnique({ where: { id }, include: { register: true } });
    if (!invoice || !invoice.organizationId || !invoice.registerId) return res.sendStatus(404);
    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, invoice.organizationId))) return res.sendStatus(403);
    const checkout = checkoutFromPayload(invoice.webhookPayload);
    if (!checkout || basket.clientSaleId !== checkout.clientSaleId || basket.registerId !== invoice.registerId) return res.sendStatus(409);
    if (invoice.status !== PosQPayStatus.EXPIRED || invoice.expiresAt > new Date()) {
      return res.status(409).json({ message: "QR-ийн хугацаа дуусаагүй эсвэл төлбөр баталгаажсан байна" });
    }
    if (await reconcilePosQPayInvoicePayment(invoice)) return res.status(409).json({ message: "Төлбөр баталгаажсан. Борлуулалтаа дуусгана уу." });
    const archiveId = await prisma.$transaction(async tx => {
      await lockOrganizationInventory(tx, invoice.organizationId!);
      const current = await tx.qPayInvoice.findUniqueOrThrow({ where: { id } });
      if (current.status !== PosQPayStatus.EXPIRED || current.paidAt || current.consumedAt) throw new Error("Payment changed");
      const payload = (current.webhookPayload || {}) as Prisma.JsonObject;
      if (typeof payload.reviewArchiveId === "string") return payload.reviewArchiveId;
      const cards = await tx.cardPaymentAttempt.count({ where: { organizationId: invoice.organizationId,
        providerPayload: { path: ["checkout", "clientSaleId"], equals: checkout.clientSaleId } } });
      const otherQr = await tx.qPayInvoice.count({ where: { organizationId: invoice.organizationId, id: { not: id },
        webhookPayload: { path: ["checkout", "clientSaleId"], equals: checkout.clientSaleId } } });
      const sale = await tx.posSaleIdempotency.count({ where: { organizationId: invoice.organizationId!, clientSaleId: checkout.clientSaleId } });
      if (cards || otherQr || sale) throw new Error("Other payment evidence exists");
      const archive = await tx.auditLog.create({ data: { userId: actor.id, action: AuditAction.POS_REGISTER_UPDATED,
        meta: { event: "EXPIRED_QR_CHECKOUT_REVIEW", organizationId: invoice.organizationId, registerId: invoice.registerId,
          invoiceId: id, clientSaleId: checkout.clientSaleId, snapshot, reviewRequired: true, financialStateUnchanged: true } } });
      await tx.qPayInvoice.update({ where: { id }, data: { webhookPayload: { ...payload,
        reviewArchiveId: archive.id, reviewRequestedAt: new Date().toISOString(), requiresPaymentReconciliation: true } } });
      return archive.id;
    });
    return res.json({ archiveId });
  } catch (error: unknown) {
    console.error("QR checkout review archive failed", error);
    return res.status(503).json({ message: "Төлбөрийн мэдээллийг баталгаатай хадгалж чадсангүй. Сагсыг хэвээр үлдээлээ." });
  }
});

router.post(["/pos/payments/qpay/cancel", "/pos/payments/systemqr/cancel"], async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const id = String(req.body?.invoiceId || "").trim();
  const requestedProviderCancellation = req.body?.requireProviderCancellation === true;
  if (!id) {
    return res.status(400).json({ message: "Minu invoiceId шаардлагатай" });
  }

  try {
    const invoice = await prisma.qPayInvoice.findUnique({
      where: { id },
      include: {
        register: {
          select: {
            qpayEnabled: true,
            qpayMerchantId: true,
            qpayTerminalId: true,
          },
        },
      },
    });
    if (!invoice) {
      return res.status(404).json({ message: "Minu invoice олдсонгүй" });
    }
    if (
      actor.role !== "ADMIN" &&
      invoice.organizationId &&
      !(await hasOrgMembership(actor.id, invoice.organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Өөр байгууллагын Minu invoice цуцлах боломжгүй" });
    }
    const checkout = checkoutFromPayload(invoice.webhookPayload);
    // Frozen retail baskets remain attached until provider cancellation is proved.
    const requireProviderCancellation = requestedProviderCancellation || Boolean(checkout);
    if (invoice.status === PosQPayStatus.PAID) {
      return res
        .status(409)
        .json({ message: "Төлбөр аль хэдийн баталгаажсан байна" });
    }
    if (await reconcilePosQPayInvoicePayment(invoice)) {
      return res
        .status(409)
        .json({ message: "Төлбөр баталгаажсан тул захиалгыг өөрчлөх боломжгүй" });
    }

    const payload = (invoice.webhookPayload || {}) as Record<string, unknown>;
    const providerInvoiceId = String(payload.providerInvoiceId || "").trim();
    if (!providerInvoiceId) {
      return res.status(400).json({ message: "Provider invoice ID олдсонгүй" });
    }

    const registerConfig = !usesOrganizationMerchant(payload) && invoice.register
      ? {
          qpayEnabled: invoice.register.qpayEnabled,
          qpayMerchantId: invoice.register.qpayMerchantId,
          qpayTerminalId: invoice.register.qpayTerminalId,
        }
      : null;
    const systemProvider =
      String(payload.provider || "").toUpperCase() === "SYSTEMQR";
    const alreadyReleased = Boolean(
      payload.cancelledAt || payload.checkoutAbandonedAt,
    );
    if (invoice.status === PosQPayStatus.EXPIRED && alreadyReleased &&
      (!requireProviderCancellation || isQrCancellationConfirmed(invoice.webhookPayload))) {
      return res.json({
        providerCancellationConfirmed: isQrCancellationConfirmed(invoice.webhookPayload),
        invoiceId: invoice.id,
        amount: Number(invoice.amount),
        qrText: invoice.qrText,
        status: PosQPayStatus.EXPIRED,
        expiresAt: invoice.expiresAt.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
      });
    }

    let providerCancelWarning: string | null = null;
    if (systemProvider) {
      const resolved = await resolveSystemQrConfig(
        invoice.organizationId,
        registerConfig,
      );
      const merchantCode = String(
        payload.merchantCode || resolved?.merchantCode || "",
      ).trim();
      if (!merchantCode) {
        return res
          .status(400)
          .json({ message: "Minu Dynamic QR merchantCode олдсонгүй" });
      }
      try {
        try {
          await cancelSystemQrInvoice(
            { merchantCode, invoiceNumber: providerInvoiceId },
            resolved?.username,
            resolved?.password,
          );
        } catch (error) {
          if (!resolved?.password || !isSystemQrAuthenticationError(error)) {
            throw error;
          }
          await cancelSystemQrInvoice({
            merchantCode,
            invoiceNumber: providerInvoiceId,
          });
        }
      } catch (error) {
        let providerPaymentConfirmed = false;
        let providerRecheckCompleted = false;
        try {
          providerPaymentConfirmed = await reconcilePosQPayInvoicePayment(
            invoice,
          );
          providerRecheckCompleted = true;
        } catch (recheckError) {
          console.error(
            "[SystemQR] Payment recheck after cancellation failure failed",
            recheckError,
          );
        }

        if (
          !canReleaseCheckoutAfterCancelFailure({
            requireProviderCancellation,
            invoiceStatus: invoice.status,
            providerRecheckCompleted,
            providerPaymentConfirmed,
          })
        ) {
          if (providerPaymentConfirmed) {
            return res.status(409).json({
              message:
                "Төлбөр баталгаажсан тул гүйлгээг цуцлах боломжгүй",
            });
          }
          throw error;
        }

        providerCancelWarning =
          error instanceof Error ? error.message : String(error);
        console.warn(
          "[SystemQR] Unpaid checkout released after provider cancel failure",
          { invoiceId: invoice.id, providerCancelWarning },
        );
      }
    } else {
      let merchantContext = registerConfig
        ? buildQPayMerchantContextFromPosRegister(registerConfig)
        : null;
      if (!merchantContext && invoice.organizationId) {
        const orgResult = await getVendorMerchantConfig(invoice.organizationId, "POS", { allowCentralFallback: !usesOrganizationMerchant(payload) });
        merchantContext = orgResult.config ?? null;
      }
      await cancelQPayInvoice(providerInvoiceId, merchantContext || undefined);
    }

    const checkoutReleasedAt = new Date();
    const updated = await prisma.$transaction(async tx => {
      if (checkout && invoice.organizationId) await lockOrganizationInventory(tx, invoice.organizationId);
      const updated = await tx.qPayInvoice.updateMany({
      where: { id, status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] } },
      data: {
        status: PosQPayStatus.EXPIRED,
        expiresAt: checkoutReleasedAt,
        webhookPayload: {
          ...payload,
          ...(providerCancelWarning
            ? {
                checkoutAbandonedAt: checkoutReleasedAt.toISOString(),
                providerCancellationConfirmed: false,
                providerCancelWarning,
                requiresPaymentReconciliation: true,
              }
            : {
                cancelledAt: checkoutReleasedAt.toISOString(),
                providerCancellationConfirmed: true,
              }),
          cancelledById: actor.id,
          cancelReason: providerCancelWarning
            ? "PROVIDER_CANCEL_FAILED_UNPAID"
            : "SELF_SERVICE_ORDER_CHANGE",
        } as unknown as Prisma.JsonObject,
      },
    });
      if (updated.count === 1 && !providerCancelWarning && checkout && invoice.organizationId) {
        await releaseResolvedCheckoutReservation(tx, invoice.organizationId, checkout.clientSaleId);
      }
      return updated;
    });
    if (updated.count !== 1) {
      return res.status(409).json({
        message: "Төлбөрийн төлөв өөрчлөгдсөн тул дахин шалгана уу",
      });
    }

    return res.json({
      providerCancellationConfirmed: !providerCancelWarning,
      invoiceId: invoice.id,
      amount: Number(invoice.amount),
      qrText: invoice.qrText,
      status: PosQPayStatus.EXPIRED,
      expiresAt: checkoutReleasedAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      ...(providerCancelWarning
        ? {
            warning:
              "Minu цуцлалт алдаатай байсан ч төлбөрийг дахин шалгахад төлөгдөөгүй тул checkout-ийг хаалаа.",
          }
        : {}),
    });
  } catch (error) {
    console.error("qpay invoice cancel error", error);
    const message =
      error instanceof Error
        ? error.message
        : "Minu invoice цуцлахад алдаа гарлаа";
    return res.status(502).json({ message });
  }
});

router.get(["/pos/payments/qpay/status/:invoiceId", "/pos/payments/systemqr/status/:invoiceId"], async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const id = String(req.params.invoiceId || "");
  try {
    const invoice = await prisma.qPayInvoice.findUnique({
      where: { id },
      include: {
        register: {
          select: {
            id: true,
            organizationId: true,
            qpayEnabled: true,
            qpayMerchantId: true,
            qpayTerminalId: true,
          },
        },
      },
    });
    if (!invoice) return res.status(404).json({ message: "Minu invoice олдсонгүй" });
    if (actor.role !== "ADMIN" && invoice.organizationId && !(await hasOrgMembership(actor.id, invoice.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын Minu invoice харах боломжгүй" });
    }

    // Routine POS polling reads local state because providers can throttle
    // repeated payment checks. A user-triggered refresh performs one provider
    // reconciliation, and expiry still performs a final reconciliation so a
    // delayed callback cannot lose a completed payment.
    const refreshProvider = String(req.query.refresh || "") === "1";
    let current = invoice;
    const shouldReconcile = refreshProvider
      ? invoice.status === PosQPayStatus.PENDING ||
        invoice.status === PosQPayStatus.EXPIRED
      : invoice.status === PosQPayStatus.PENDING &&
        invoice.expiresAt <= new Date();
    if (shouldReconcile) {
      await reconcilePosQPayInvoicePayment(invoice);
      current = await prisma.qPayInvoice.findUniqueOrThrow({
        where: { id },
        include: {
          register: {
            select: {
              id: true,
              organizationId: true,
              qpayEnabled: true,
              qpayMerchantId: true,
              qpayTerminalId: true,
            },
          },
        },
      });

      if (
        current.status === PosQPayStatus.PENDING &&
        current.expiresAt <= new Date()
      ) {
        await prisma.qPayInvoice.updateMany({
          where: { id, status: PosQPayStatus.PENDING },
          data: { status: PosQPayStatus.EXPIRED },
        });
        current = await prisma.qPayInvoice.findUniqueOrThrow({
          where: { id },
          include: {
            register: {
              select: {
                id: true,
                organizationId: true,
                qpayEnabled: true,
                qpayMerchantId: true,
                qpayTerminalId: true,
              },
            },
          },
        });
      }
    }

    const currentPayload = current.webhookPayload as Record<string, unknown> | null;
    return res.json({
      invoiceId: current.id,
      reviewArchiveId: current.status === PosQPayStatus.EXPIRED ? (current.webhookPayload as Prisma.JsonObject | null)?.reviewArchiveId : undefined,
      ...(typeof currentPayload?.providerCancellationConfirmed === "boolean"
        ? { providerCancellationConfirmed: currentPayload.providerCancellationConfirmed } : {}),
      ...(!String((current.webhookPayload as Record<string, unknown> | null)?.providerInvoiceId || "").trim() && current.status !== PosQPayStatus.PAID ? {
        recoveryRequired: true,
        recoveryMessage: "QR үүсгэх хүсэлтийн банкны хариу дутуу байна. Дахин төлбөр үүсгэхгүй; нэхэмжлэлийн дугаараар банкны төлөвийг тулгаж шалгуулна уу.",
      } : {}),
      amount: Number(current.amount),
      qrText: current.qrText,
      qrImage: String((current.webhookPayload as Record<string, unknown> | null)?.qrImage || ""),
      status: current.status,
      expiresAt: current.expiresAt.toISOString(),
      paidAt: current.paidAt?.toISOString() ?? null,
      createdAt: current.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("qpay status error", error);
    return res.status(500).json({ message: "Minu статус авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POST /pos/payments/qpay/confirm — manual confirm (dev/test only)
 * ─────────────────────────────────────────────────────────────────────── */
router.post("/pos/payments/qpay/confirm", async (req, res) => {
  if (!allowPosSimulation) {
    return res.status(403).json({ message: "Manual confirm нь зөвхөн dev/test орчинд ажиллана" });
  }

  const id = String(req.body?.invoiceId || "");
  try {
    const invoice = await prisma.qPayInvoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ message: "Minu invoice олдсонгүй" });
    if (invoice.status !== PosQPayStatus.PENDING) {
      return res.status(400).json({ message: `Invoice статус нь ${invoice.status} байна` });
    }

    const updated = await prisma.qPayInvoice.update({
      where: { id },
      data: {
        status: PosQPayStatus.PAID,
        paidAt: new Date(),
        paymentId: `dev-${id}`,
      },
    });

    return res.json({
      invoiceId: updated.id,
      amount: Number(updated.amount),
      status: updated.status,
      paidAt: updated.paidAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("qpay confirm error", error);
    return res.status(500).json({ message: "Minu confirm хийхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * GET|POST /pos/qpay/cb — short provider callback URL (255-char URL limit).
 * The callback body differs between QPay and SystemQR, so the local invoice id
 * embedded in our callback URL is authoritative for lookup. Provider state is
 * then checked before the invoice is marked paid.
 */
router.all("/pos/qpay/cb", async (req, res) => {
  const invoiceId = String(
    req.query?.invoiceId ||
      req.query?.orderId ||
      req.body?.orderId ||
      req.body?.order_id ||
      req.body?.referenceNumber ||
      req.body?.reference_number ||
      req.body?.invoiceId ||
      req.body?.invoice_id ||
      "",
  ).trim();
  if (!invoiceId) {
    return res.status(400).json({ message: "invoiceId шаардлагатай" });
  }

  try {
    const invoice = await prisma.qPayInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        register: {
          select: {
            qpayEnabled: true,
            qpayMerchantId: true,
            qpayTerminalId: true,
          },
        },
      },
    });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice олдсонгүй" });
    }

    const paid = await reconcilePosQPayInvoicePayment(invoice, {
      method: req.method,
      receivedAt: new Date().toISOString(),
      query: req.query,
      body: req.body,
    });
    return res.json({ ok: true, paid });
  } catch (error) {
    console.error("qpay short callback error", error);
    return res.status(500).json({ ok: false, message: "callback error" });
  }
});

/**
 * POST /pos/payments/qpay/webhook  — real QPay bank callback
 * Secured with HMAC-SHA256 when QPAY_WEBHOOK_SECRET is set.
 * QPay банк payload: { invoiceId, paymentId, amount, status, paidDate }
 * ─────────────────────────────────────────────────────────────────────── */
router.post("/pos/payments/qpay/webhook", async (req, res) => {
  const webhookSecret = process.env.QPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const rawSig = String(req.headers["x-qpay-signature"] || "").trim();
    if (!rawSig) {
      return res.status(401).json({ message: "Webhook signature шаардлагатай" });
    }
    const bodyStr = JSON.stringify(req.body);
    const expected = crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");
    if (!timingSafeEqualHex(rawSig, expected)) {
      return res.status(401).json({ message: "Webhook signature хүчингүй байна" });
    }
  }

  // Flexible field names: QPay uses both camelCase and snake_case across envs
  const invoiceId = String(
    req.body?.invoiceId ||
      req.body?.invoice_id ||
      req.query?.invoiceId ||
      req.query?.orderId ||
      "",
  ).trim();
  const paymentId = String(
    req.body?.paymentId ||
      req.body?.payment_id ||
      req.body?.invoiceNumber ||
      req.body?.invoice_number ||
      req.query?.invoiceNumber ||
      req.query?.invoice_number ||
      invoiceId,
  ).trim();
  const rawAmount = Number(req.body?.amount ?? req.body?.paid_amount ?? 0);
  const parsedPaidAt = parseOptionalDate(req.body?.paidDate ?? req.body?.paid_date);
  const payloadRegisterId = String(req.body?.registerId || req.body?.register_id || "").trim();
  const payloadOrganizationId = String(req.body?.organizationId || req.body?.organization_id || "").trim();
  if (!invoiceId) {
    return res.status(400).json({ message: "invoiceId шаардлагатай" });
  }
  if (!paymentId) {
    return res.status(400).json({ message: "paymentId шаардлагатай" });
  }
  if (!parseQPaySuccess(req.body?.status)) {
    return res.status(400).json({ message: "Webhook status нь success/paid биш байна" });
  }
  if ((req.body?.paidDate || req.body?.paid_date) && !parsedPaidAt) {
    return res.status(400).json({ message: "paidDate формат буруу байна" });
  }

  try {
    const invoice = await prisma.qPayInvoice.findUnique({
      where: { id: invoiceId },
      include: { register: { select: { id: true, organizationId: true, qpayEnabled: true, qpayMerchantId: true, qpayTerminalId: true } } },
    });
    if (!invoice) return res.status(404).json({ message: "Invoice олдсонгүй" });

    // A callback is only a notification, never proof of funds (even when signed).
    // Query the provider, including late payments on expired invoices.
    if (!(await reconcilePosQPayInvoicePayment(invoice, req.body))) {
      return res.status(409).json({ message: "Provider төлбөрийг хараахан баталгаажуулаагүй байна" });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("qpay webhook error", error);
    return res.status(500).json({ message: "Webhook боловсруулахад алдаа гарлаа" });
  }
});


export default router;
