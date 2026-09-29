import { isPaymentRequestId, matchesPaymentRequest } from "../../../services/payment-request-identity";
import { canReleaseExpiredCheckoutAfterCancelFailure } from "../../../services/pos-qpay-cancel-policy";
import { verifiedQPayPaymentId } from "../../../services/qpay-payment-verification";
import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import {
  cancelQPayInvoice,
  checkQPayPayment,
  createQPayInvoice,
} from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import {
  cancelSystemQrInvoice,
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "../../../services/systemqr";
import { decodeSystemQrMerchantAuth } from "../../../services/systemqr-merchant-auth";
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

const router: ExpressRouter = Router();

router.get("/pos/payments/capabilities", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  res.setHeader("Cache-Control", "no-store");
  return res.json({ paymentRecoveryVersion: 1 });
});

const isSystemQrMarker = (value?: string | null) =>
  String(value || "").trim().toUpperCase() === "SYSTEMQR" ||
  String(value || "").trim().toLowerCase().startsWith("systemqr");

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

async function resolveSystemQrConfig(
  organizationId: string | null,
  registerQpayConfig: {
    qpayEnabled: boolean;
    qpayMerchantId: string | null;
    qpayTerminalId: string | null;
  } | null,
) {
  if (
    registerQpayConfig?.qpayEnabled &&
    registerQpayConfig.qpayMerchantId &&
    isSystemQrMarker(registerQpayConfig.qpayTerminalId)
  ) {
    return { merchantCode: registerQpayConfig.qpayMerchantId.trim() };
  }

  if (!organizationId) return null;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      qpayEnabled: true,
      qpayMerchantId: true,
      qpayMerchantKey: true,
      qpayInvoiceCode: true,
    },
  });

  if (!org?.qpayEnabled || !org.qpayMerchantId) return null;
  if (!isSystemQrMarker(org.qpayInvoiceCode) && !isSystemQrMarker(org.qpayMerchantKey)) return null;

  const merchantCode = org.qpayMerchantId.trim();
  const auth = decodeSystemQrMerchantAuth(org.qpayMerchantKey, merchantCode);
  return {
    merchantCode,
    ...(auth.password
      ? { username: auth.username || merchantCode, password: auth.password }
      : {}),
  };
}

type ReconciliablePosQPayInvoice = {
  amount: Prisma.Decimal | number;
  id: string;
  organizationId: string | null;
  status: PosQPayStatus;
  webhookPayload: Prisma.JsonValue | null;
  register: {
    qpayEnabled: boolean;
    qpayMerchantId: string | null;
    qpayTerminalId: string | null;
  } | null;
};

const isSystemQrAuthenticationError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /SystemQR Login Error|username or password|credential|unauthorized|401|403/i.test(
    message,
  );
};

async function reconcilePosQPayInvoicePayment(
  invoice: ReconciliablePosQPayInvoice,
  lastWebhook?: Record<string, unknown>,
) {
  if (invoice.status === PosQPayStatus.PAID) return true;
  if (
    invoice.status !== PosQPayStatus.PENDING &&
    invoice.status !== PosQPayStatus.EXPIRED
  ) {
    return false;
  }

  const payload = (invoice.webhookPayload || {}) as Record<string, unknown>;
  const providerInvoiceId = String(payload.providerInvoiceId || "").trim();
  if (!providerInvoiceId) return false;

  const registerConfig = invoice.register
    ? {
        qpayEnabled: invoice.register.qpayEnabled,
        qpayMerchantId: invoice.register.qpayMerchantId,
        qpayTerminalId: invoice.register.qpayTerminalId,
      }
    : null;
  const systemProvider =
    String(payload.provider || "").toUpperCase() === "SYSTEMQR";

  let paymentId = "";
  let paymentCheck: unknown;
  if (systemProvider) {
    const resolved = await resolveSystemQrConfig(
      invoice.organizationId,
      registerConfig,
    );
    const merchantCode = String(
      payload.merchantCode || resolved?.merchantCode || "",
    ).trim();
    if (!merchantCode) return false;

    try {
      paymentCheck = await checkSystemQrPayment(
        { merchantCode, invoiceNumber: providerInvoiceId },
        resolved?.username,
        resolved?.password,
      );
    } catch (error) {
      if (!resolved?.password || !isSystemQrAuthenticationError(error)) {
        throw error;
      }
      paymentCheck = await checkSystemQrPayment({
        merchantCode,
        invoiceNumber: providerInvoiceId,
      });
    }

    if (!(paymentCheck as { paid?: boolean }).paid) return false;
    paymentId = `systemqr-${providerInvoiceId}`;
  } else {
    let merchantContext = registerConfig
      ? buildQPayMerchantContextFromPosRegister(registerConfig)
      : null;
    if (!merchantContext && invoice.organizationId) {
      const orgResult = await getVendorMerchantConfig(invoice.organizationId);
      merchantContext = orgResult.config ?? null;
    }

    const checked = await checkQPayPayment(
      providerInvoiceId,
      merchantContext || undefined,
    );
    paymentCheck = checked;
    paymentId = verifiedQPayPaymentId(checked, Number(invoice.amount)) || "";
    if (!paymentId) return false;
  }

  await prisma.qPayInvoice.updateMany({
    where: {
      id: invoice.id,
      status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] },
    },
    data: {
      status: PosQPayStatus.PAID,
      paymentId,
      paidAt: new Date(),
      webhookPayload: {
        ...payload,
        lastPaymentCheck: paymentCheck,
        ...(lastWebhook ? { lastWebhook } : {}),
      } as unknown as Prisma.JsonObject,
    },
  });

  const current = await prisma.qPayInvoice.findUnique({
    where: { id: invoice.id },
    select: { status: true },
  });
  return current?.status === PosQPayStatus.PAID;
}

router.post("/pos/payments/qpay/invoice", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const amount = Number(req.body?.amount || 0);
  const registerId: string | null = req.body?.registerId || null;
  const bodyOrganizationId: string | null = req.body?.organizationId || null;

  console.log("[QPay invoice] amount:", amount, "registerId:", registerId, "orgId:", bodyOrganizationId);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "QPay amount буруу байна" });
  }

  try {
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

    console.log("[QPay invoice] registerQpayConfig:", JSON.stringify(registerQpayConfig));

    const systemQrConfig = await resolveSystemQrConfig(effectiveOrganizationId, registerQpayConfig);

    let merchantContext = systemQrConfig
      ? null
      : registerQpayConfig
        ? buildQPayMerchantContextFromPosRegister(registerQpayConfig)
        : null;

    console.log("[QPay invoice] merchantContext from register:", merchantContext ? "set" : "null");

    // Fall back to organization-level QPay config when register has no config
    if (!merchantContext && !systemQrConfig && effectiveOrganizationId) {
      const orgRes = await getVendorMerchantConfig(effectiveOrganizationId);
      console.log("[QPay invoice] organization configuration available:", Boolean(orgRes.config));
      merchantContext = orgRes.config ?? null;
    }

    // Merge org-level bank accounts into context if context has none (register doesn't store bank accounts)
    if (merchantContext && !merchantContext.bankAccounts?.length && effectiveOrganizationId) {
      const orgRes = await getVendorMerchantConfig(effectiveOrganizationId);
      if (orgRes.config?.bankAccounts?.length) {
        merchantContext = { ...merchantContext, bankAccounts: orgRes.config.bankAccounts };
        console.log("[QPay invoice] Merged org bank accounts into context:", orgRes.config.bankAccounts.length);
      }
    }

    console.log("[QPay invoice] final merchantContext:", JSON.stringify({
      username: merchantContext?.username,
      invoiceCode: merchantContext?.invoiceCode,
      merchantId: merchantContext?.merchantId,
      merchantKey: merchantContext?.merchantKey,
      bankAccounts: merchantContext?.bankAccounts,
    }, null, 2));

    if (!merchantContext && !systemQrConfig) {
      return res.status(400).json({
        message: "QPay merchant тохиргоо дутуу байна. Тохиргоо хуудаснаас QPay дансаа холбоно уу.",
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
        const payload = (existing.webhookPayload || {}) as Record<string, unknown>;
        return res.json({ invoiceId: existing.id, amount: Number(existing.amount), status: existing.status,
          qrText: existing.qrText, qrImage: typeof payload.qrImage === "string" ? payload.qrImage : "",
          expiresAt: existing.expiresAt.toISOString(), createdAt: existing.createdAt.toISOString() });
      }
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const invoice = await prisma.qPayInvoice.create({
      data: {
        ...(requestId ? { id: requestId } : {}),
        registerId: registerId || null,
        organizationId: effectiveOrganizationId || null,
        initiatedById: actor?.id || null,
        amount,
        qrText: "",
        status: PosQPayStatus.PENDING,
        expiresAt,
      },
    });

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
            providerInvoiceId: qpayData.invoice_id,
            provider: systemQrConfig ? "SYSTEMQR" : "QPAY",
            merchantCode: systemQrConfig?.merchantCode || null,
            qrImage: qpayData.qr_image,
            deepLinks: qpayData.urls as unknown as Prisma.JsonArray,
            merchantKey: merchantContext?.merchantKey || null,
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
    const msg = error instanceof Error ? error.message : "QPay invoice үүсгэхэд алдаа гарлаа";
    return res.status(500).json({ message: msg });
  }
});

router.post("/pos/payments/qpay/cancel", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const id = String(req.body?.invoiceId || "").trim();
  if (!id) {
    return res.status(400).json({ message: "QPay invoiceId шаардлагатай" });
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
      return res.status(404).json({ message: "QPay invoice олдсонгүй" });
    }
    if (
      actor.role !== "ADMIN" &&
      invoice.organizationId &&
      !(await hasOrgMembership(actor.id, invoice.organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Өөр байгууллагын QPay invoice цуцлах боломжгүй" });
    }
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

    const registerConfig = invoice.register
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
    if (invoice.status === PosQPayStatus.EXPIRED && alreadyReleased) {
      return res.json({
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
          !canReleaseExpiredCheckoutAfterCancelFailure({
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
          "[SystemQR] Expired unpaid checkout released after provider cancel failure",
          { invoiceId: invoice.id, providerCancelWarning },
        );
      }
    } else {
      let merchantContext = registerConfig
        ? buildQPayMerchantContextFromPosRegister(registerConfig)
        : null;
      if (!merchantContext && invoice.organizationId) {
        const orgResult = await getVendorMerchantConfig(invoice.organizationId);
        merchantContext = orgResult.config ?? null;
      }
      await cancelQPayInvoice(providerInvoiceId, merchantContext || undefined);
    }

    const checkoutReleasedAt = new Date();
    const updated = await prisma.qPayInvoice.updateMany({
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
            ? "EXPIRED_PROVIDER_CANCEL_FAILED"
            : "SELF_SERVICE_ORDER_CHANGE",
        } as unknown as Prisma.JsonObject,
      },
    });
    if (updated.count !== 1) {
      return res.status(409).json({
        message: "Төлбөрийн төлөв өөрчлөгдсөн тул дахин шалгана уу",
      });
    }

    return res.json({
      invoiceId: invoice.id,
      amount: Number(invoice.amount),
      qrText: invoice.qrText,
      status: PosQPayStatus.EXPIRED,
      expiresAt: checkoutReleasedAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      ...(providerCancelWarning
        ? {
            warning:
              "Minu цуцлалт алдаатай байсан ч хугацаа дууссан төлбөрийг дахин шалгахад төлөгдөөгүй тул checkout-ийг хаалаа.",
          }
        : {}),
    });
  } catch (error) {
    console.error("qpay invoice cancel error", error);
    const message =
      error instanceof Error
        ? error.message
        : "QPay invoice цуцлахад алдаа гарлаа";
    return res.status(502).json({ message });
  }
});

router.get("/pos/payments/qpay/status/:invoiceId", async (req, res) => {
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
    if (!invoice) return res.status(404).json({ message: "QPay invoice олдсонгүй" });
    if (actor.role !== "ADMIN" && invoice.organizationId && !(await hasOrgMembership(actor.id, invoice.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын QPay invoice харах боломжгүй" });
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

    return res.json({
      invoiceId: current.id,
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
    return res.status(500).json({ message: "QPay статус авахад алдаа гарлаа" });
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
    if (!invoice) return res.status(404).json({ message: "QPay invoice олдсонгүй" });
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
    return res.status(500).json({ message: "QPay confirm хийхэд алдаа гарлаа" });
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
