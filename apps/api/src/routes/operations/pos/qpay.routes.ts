import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import { checkSystemQrPayment, createSystemQrInvoice } from "../../../services/systemqr";
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

const isSystemQrMarker = (value?: string | null) =>
  String(value || "").trim().toUpperCase() === "SYSTEMQR" ||
  String(value || "").trim().toLowerCase().startsWith("systemqr");

const getSystemQrPassword = (value?: string | null) => {
  const marker = String(value || "").trim();
  if (!marker.toLowerCase().startsWith("systemqr:")) return undefined;
  return marker.slice("systemqr:".length) || undefined;
};

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

  return {
    merchantCode: org.qpayMerchantId.trim(),
    username: org.qpayMerchantId.trim(),
    password: getSystemQrPassword(org.qpayMerchantKey),
  };
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
      console.log("[QPay invoice] org config:", JSON.stringify(orgRes));
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

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const invoice = await prisma.qPayInvoice.create({
      data: {
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
      await prisma.qPayInvoice.delete({ where: { id: invoice.id } });
      throw qpayError;
    }
  } catch (error) {
    console.error("qpay invoice create error", error);
    const msg = error instanceof Error ? error.message : "QPay invoice үүсгэхэд алдаа гарлаа";
    return res.status(500).json({ message: msg });
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

    // Auto-expire if past deadline
    let current = invoice;
    if (invoice.status === PosQPayStatus.PENDING && invoice.expiresAt <= new Date()) {
      current = await prisma.qPayInvoice.update({
        where: { id },
        data: { status: PosQPayStatus.EXPIRED },
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
    } else if (invoice.status === PosQPayStatus.PENDING) {
      const payload = (invoice.webhookPayload || {}) as Record<string, unknown>;
      const providerInvoiceId = String(payload.providerInvoiceId || "").trim();
      if (providerInvoiceId) {
        const registerConfig = invoice.register
          ? {
              qpayEnabled: invoice.register.qpayEnabled,
              qpayMerchantId: invoice.register.qpayMerchantId,
              qpayTerminalId: invoice.register.qpayTerminalId,
            }
          : null;
        const systemProvider = String(payload.provider || "").toUpperCase() === "SYSTEMQR";

        if (systemProvider) {
          const resolved = await resolveSystemQrConfig(invoice.organizationId, registerConfig);
          const merchantCode = String(payload.merchantCode || resolved?.merchantCode || "").trim();
          if (merchantCode) {
            const check = await checkSystemQrPayment(
              { merchantCode, invoiceNumber: providerInvoiceId },
              resolved?.username,
              resolved?.password,
            );
            if (check.paid) {
              current = await prisma.qPayInvoice.update({
                where: { id },
                data: {
                  status: PosQPayStatus.PAID,
                  paymentId: `systemqr-${providerInvoiceId}`,
                  paidAt: new Date(),
                  webhookPayload: {
                    ...payload,
                    lastPaymentCheck: check,
                  } as unknown as Prisma.JsonObject,
                },
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
        } else {
          let statusMerchantContext = registerConfig ? buildQPayMerchantContextFromPosRegister(registerConfig) : null;

          // Fall back to org-level config if register has no QPay config
          if (!statusMerchantContext && invoice.organizationId) {
            const orgRes = await getVendorMerchantConfig(invoice.organizationId);
            statusMerchantContext = orgRes.config ?? null;
          }

          const check = await checkQPayPayment(providerInvoiceId, statusMerchantContext || undefined);
          const paidRow = Array.isArray(check.rows) ? check.rows[0] : null;
          if (check.count > 0 && paidRow?.payment_id) {
            current = await prisma.qPayInvoice.update({
              where: { id },
              data: {
                status: PosQPayStatus.PAID,
                paymentId: paidRow.payment_id,
                paidAt: new Date(),
                webhookPayload: {
                  ...payload,
                  lastPaymentCheck: check,
                } as unknown as Prisma.JsonObject,
              },
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
      }
    }

    return res.json({
      invoiceId: current.id,
      amount: Number(current.amount),
      qrText: current.qrText,
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
 * POST /pos/qpay/cb  — short alias for QuickQR callback (255-char URL limit)
 */
router.post("/pos/qpay/cb", async (req, res, next) => {
  req.url = "/pos/payments/qpay/webhook";
  next("route");
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
      include: { register: { select: { id: true, organizationId: true } } },
    });
    if (!invoice) return res.status(404).json({ message: "Invoice олдсонгүй" });

    if (invoice.status !== PosQPayStatus.PENDING) {
      if (invoice.status === PosQPayStatus.PAID && invoice.paymentId === paymentId) {
        return res.json({ ok: true, alreadyPaid: true });
      }
      return res.status(409).json({ message: `Invoice статус ${invoice.status} байна` });
    }

    if (invoice.expiresAt <= new Date()) {
      return res.status(409).json({ message: "Invoice хугацаа дууссан байна" });
    }

    if (Number.isFinite(rawAmount) && rawAmount > 0 && !moneyMatches(rawAmount, Number(invoice.amount))) {
      return res.status(400).json({ message: "Webhook amount invoice amount-тай зөрж байна" });
    }

    if (payloadRegisterId && invoice.registerId && payloadRegisterId !== invoice.registerId) {
      return res.status(400).json({ message: "Webhook registerId зөрүүтэй байна" });
    }

    if (payloadOrganizationId && invoice.organizationId && payloadOrganizationId !== invoice.organizationId) {
      return res.status(400).json({ message: "Webhook organizationId зөрүүтэй байна" });
    }

    const duplicatePayment = await prisma.qPayInvoice.findFirst({
      where: { paymentId, NOT: { id: invoiceId } },
      select: { id: true },
    });
    if (duplicatePayment) {
      return res.status(409).json({ message: "paymentId давхардсан байна" });
    }

    const existingPayload = (invoice.webhookPayload || {}) as Record<string, unknown>;
    await prisma.qPayInvoice.update({
      where: { id: invoiceId },
      data: {
        status: PosQPayStatus.PAID,
        paymentId,
        paidAt: parsedPaidAt || new Date(),
        webhookPayload: {
          ...existingPayload,
          lastWebhook: req.body,
        } as unknown as Prisma.JsonObject,
      },
    });

    void prisma.auditLog.create({
      data: {
        action: AuditAction.POS_QPAY_WEBHOOK_RECEIVED,
        ip: req.ip,
        meta: { invoiceId, paymentId, amount: Number(invoice.amount), registerId: invoice.registerId },
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("qpay webhook error", error);
    return res.status(500).json({ message: "Webhook боловсруулахад алдаа гарлаа" });
  }
});


export default router;
