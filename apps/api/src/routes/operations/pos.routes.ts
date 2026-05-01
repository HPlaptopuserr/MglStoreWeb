import crypto from "crypto";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import {
  prisma,
  AuditAction,
  InventoryReason,
  PaymentMethod,
  PosPaymentStatus,
  PosQPayStatus,
  PosActivationStatus,
  ShiftStatus,
  PosSaleStatus,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../services/inventory.service";
import { hasOrgMembership } from "../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../services/qpay.merchant-context";

const router: ExpressRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const runtimeEnv = String(process.env.APP_ENV || process.env.NODE_ENV || "development").toLowerCase();
const isProdLikeEnv = runtimeEnv === "production" || runtimeEnv === "staging";
const allowPosSimulation = process.env.POS_ALLOW_SIMULATION === "true" && runtimeEnv === "development";
const bridgeSharedSecret = String(process.env.POS_BRIDGE_SHARED_SECRET || "").trim();

const pushEcrBaseUrl = (process.env.PUSH_ECR_BASE_URL || "https://push.easypay.mn:8443").replace(/\/$/, "");
const pushEcrApiKey = process.env.PUSH_ECR_API_KEY || "";
const pushEcrClientId = process.env.PUSH_ECR_CLIENT_ID || "";

type PushEcrPurchaseResponse = {
  succeed: boolean;
  message?: string;
  amount?: number;
  payment?: string;
  systemRef?: string;
  traceno?: string;
  approveCode?: string;
  maskedPAN?: string;
  date?: string;
  merchantId?: string;
  terminalId?: string;
  bankTid?: string;
};

const MONEY_EPSILON = 0.01;

type AuthClaims = {
  userId: string;
  role?: string;
  organizationId?: string | null;
};

type SaleLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
};

type SalePaymentLineInput = {
  method: string;
  amount: number;
  attemptId?: string;
  transactionId?: string;
  invoiceId?: string;
};

type CreateSaleBody = {
  shiftId?: string;
  branchId?: string;
  registerId?: string;
  organizationId?: string;
  clientSaleId?: string;
  paymentMethod?: string;
  paymentBreakdown?: SalePaymentLineInput[];
  lines?: SaleLineInput[];
  note?: string;
};

type ApiError = {
  status: number;
  message: string;
};

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
  deletedAt: Date | null;
  organizationId: string | null;
  orgRole: string | null;
};

const toApiError = (status: number, message: string): ApiError => ({ status, message });

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

const parseAuthClaims = (req: Request): AuthClaims | null => {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object") return null;
    const claims = decoded as Partial<AuthClaims>;
    if (!claims.userId || typeof claims.userId !== "string") return null;

    return {
      userId: claims.userId,
      role: typeof claims.role === "string" ? claims.role : undefined,
      organizationId:
        claims.organizationId === null || typeof claims.organizationId === "string"
          ? claims.organizationId
          : undefined,
    };
  } catch {
    return null;
  }
};

const normalizePaymentMethod = (value?: string): PaymentMethod | null => {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "QR") return PaymentMethod.QPAY;
  if (upper === "QPAY") return PaymentMethod.QPAY;
  if (upper === "CASH") return PaymentMethod.CASH;
  if (upper === "CARD") return PaymentMethod.CARD;
  if (upper === "BANK_TRANSFER") return PaymentMethod.BANK_TRANSFER;
  return null;
};

const normalizeRegisterName = (value?: string) => String(value || "").trim();

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const moneyMatches = (left: number, right: number) => Math.abs(roundMoney(left) - roundMoney(right)) < MONEY_EPSILON;

const signPayload = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const timingSafeEqualHex = (provided: string, expected: string): boolean => {
  if (!provided || !expected) return false;
  if (!/^[0-9a-f]+$/i.test(provided) || !/^[0-9a-f]+$/i.test(expected)) return false;
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
};

const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseBridgeResultStatus = (status?: string): PosPaymentStatus => {
  if (status === "APPROVED") return PosPaymentStatus.APPROVED;
  if (status === "DECLINED") return PosPaymentStatus.DECLINED;
  return PosPaymentStatus.FAILED;
};

const parseQPaySuccess = (statusValue: unknown): boolean => {
  const status = String(statusValue || "").trim().toUpperCase();
  return ["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status);
};

const parseOptionalDate = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getAuthUser = async (req: Request): Promise<AuthUser | null> => {
  const claims = parseAuthClaims(req);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
  });
  if (!user) return null;

  // Resolve organization from membership
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, isActive: true, isPrimary: true },
    select: { organizationId: true, role: true },
  });
  const fallback = !membership
    ? await prisma.organizationMember.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true, role: true },
      })
    : null;
  const org = membership || fallback;

  return {
    id: user.id,
    role: user.role,
    isActive: user.isActive,
    deletedAt: user.deletedAt,
    organizationId: org?.organizationId || null,
    orgRole: org?.role || null,
  };
};

const requireAdminUser = async (req: Request, res: Response) => {
  const actor = await getAuthUser(req);
  if (!actor || actor.deletedAt || !actor.isActive) {
    res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
    return null;
  }

  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    res.status(403).json({ message: "Admin эрх шаардлагатай" });
    return null;
  }

  return actor;
};

const requirePosUser = async (req: Request, res: Response) => {
  const actor = await getAuthUser(req);
  if (!actor || actor.deletedAt || !actor.isActive) {
    res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
    return null;
  }

  // ADMIN always allowed; others need an active org membership
  if (actor.role !== "ADMIN" && !actor.organizationId) {
    res.status(403).json({ message: "POS ашиглах эрх хүрэлцэхгүй" });
    return null;
  }

  return actor;
};

router.post("/pos/payments/card/authorize", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const amount = Number(req.body?.amount || 0);
  const terminalId = String(req.body?.terminalId || "terminal-1");
  const bridgeUrl: string | null = req.body?.bridgeUrl || null;
  const registerId: string | null = req.body?.registerId || null;
  const bodyOrganizationId: string | null = req.body?.organizationId || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "CARD amount буруу байна" });
  }

  // Detect Push ECR provider early so we can skip bridge validation
  let isPushEcr = false;
  if (registerId) {
    const regForProvider = await prisma.posRegister.findUnique({
      where: { id: registerId },
      select: { cardProviderType: true },
    });
    isPushEcr = regForProvider?.cardProviderType === "PUSH_ECR";
  }

  if (bridgeUrl !== null) {
    try {
      const parsed = new URL(bridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "bridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "bridgeUrl формат буруу байна" });
    }
  }

  if (!bridgeUrl && !allowPosSimulation && !isPushEcr) {
    return res.status(400).json({
      message:
        "Card simulation идэвхгүй байна. terminalBridgeUrl тохируулж bridge-р authorize хийнэ үү.",
    });
  }

  if (bridgeUrl && isProdLikeEnv && !bridgeSharedSecret) {
    return res.status(500).json({
      message: "POS bridge shared secret тохируулаагүй байна",
    });
  }

  try {
    let effectiveOrganizationId: string | null = null;
    if (registerId) {
      const register = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: {
          id: true,
          organizationId: true,
          activationStatus: true,
          isActive: true,
        },
      });

      if (!register) {
        return res.status(404).json({ message: "POS register олдсонгүй" });
      }
      if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
        return res.status(403).json({ message: "POS register идэвхгүй эсвэл батлагдаагүй байна" });
      }
      if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, register.organizationId))) {
        return res.status(403).json({ message: "Өөр байгууллагын register дээр authorize хийх боломжгүй" });
      }

      effectiveOrganizationId = register.organizationId;
    }

    if (!effectiveOrganizationId) {
      effectiveOrganizationId = actor.role === "ADMIN" ? bodyOrganizationId : actor.organizationId;
    }

    if (actor.role !== "ADMIN" && bodyOrganizationId && bodyOrganizationId !== effectiveOrganizationId) {
      return res.status(403).json({ message: "organizationId зөрүүтэй байна" });
    }

    const attempt = await prisma.cardPaymentAttempt.create({
      data: {
        registerId: registerId || null,
        organizationId: effectiveOrganizationId || null,
        initiatedById: actor?.id || null,
        terminalId,
        bridgeUrl: bridgeUrl || null,
        amount,
        status: PosPaymentStatus.PENDING,
      },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor?.id || null,
        action: AuditAction.POS_CARD_AUTHORIZED,
        ip: req.ip,
        meta: { attemptId: attempt.id, amount, terminalId, registerId },
      },
    });

    if (bridgeUrl) {
      // Forward to local bridge; bridge translates to terminal native protocol.
      void (async () => {
        try {
          const requestPayload = JSON.stringify({ attemptId: attempt.id, amount, terminalId });
          const bridgeRes = await fetch(`${bridgeUrl}/charge`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(bridgeSharedSecret
                ? { "x-mgl-bridge-signature": signPayload(requestPayload, bridgeSharedSecret) }
                : {}),
            },
            body: requestPayload,
            signal: AbortSignal.timeout(30_000),
          });
          const responseText = await bridgeRes.text();
          if (!bridgeRes.ok) {
            throw new Error(`Bridge HTTP ${bridgeRes.status}: ${responseText.slice(0, 200)}`);
          }
          if (bridgeSharedSecret) {
            const responseSig = String(getHeaderValue(bridgeRes.headers.get("x-mgl-bridge-signature") || undefined) || "");
            if (!timingSafeEqualHex(responseSig, signPayload(responseText, bridgeSharedSecret))) {
              throw new Error("Bridge response signature mismatch");
            }
          }

          const bridgeData = JSON.parse(responseText) as {
            status?: string;
            transactionId?: string;
            message?: string;
          };

          const newStatus = parseBridgeResultStatus(bridgeData.status);

          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: newStatus,
              transactionId: bridgeData.transactionId || null,
              message: bridgeData.message || null,
              providerPayload: bridgeData as object,
            },
          });
        } catch (error) {
          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PosPaymentStatus.FAILED,
              message: error instanceof Error ? error.message : "Bridge холболт амжилтгүй боллоо",
            },
          });
        }
      })();
    } else if (isPushEcr) {
      // Push ECR: call PayPRO cloud API directly (terminal handles the card transaction)
      void (async () => {
        try {
          const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/purchase`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": pushEcrApiKey,
              "x-client-id": pushEcrClientId,
            },
            body: JSON.stringify({
              terminalId,
              amount,
              payment: 1, // 1=Card, 4=SocialPay QR, 7=Monpay QR
              referralcode: attempt.id,
              skipPrint: false,
            }),
            signal: AbortSignal.timeout(120_000),
          });
          const ecrData = (await ecrRes.json()) as PushEcrPurchaseResponse;
          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: ecrData.succeed ? PosPaymentStatus.APPROVED : PosPaymentStatus.DECLINED,
              transactionId: ecrData.systemRef || ecrData.traceno || null,
              message: ecrData.message || null,
              providerPayload: ecrData as object,
            },
          });
        } catch (err) {
          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PosPaymentStatus.FAILED,
              message: err instanceof Error ? err.message : "Push ECR холболт амжилтгүй боллоо",
            },
          });
        }
      })();
    } else if (allowPosSimulation) {
      setTimeout(() => {
        void prisma.cardPaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: PosPaymentStatus.APPROVED,
            transactionId: `card-txn-${Date.now()}`,
            message: "Card simulation approval",
            providerPayload: { mode: "simulation", env: runtimeEnv },
          },
        });
      }, 1800);
    }

    return res.status(201).json({
      attemptId: attempt.id,
      amount: Number(attempt.amount),
      terminalId: attempt.terminalId,
      bridgeUrl: attempt.bridgeUrl,
      status: attempt.status,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("card authorize error", error);
    return res.status(500).json({ message: "Card authorize хийхэд алдаа гарлаа" });
  }
});

router.post("/pos/payments/push-ecr/cancel", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const terminalId = String(req.body?.terminalId || "");
  if (!terminalId) {
    return res.status(400).json({ message: "terminalId шаардлагатай" });
  }

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": pushEcrApiKey,
        "x-client-id": pushEcrClientId,
      },
      body: JSON.stringify({ termianlId: terminalId }), // API typo: termianlId
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await ecrRes.json()) as { succeed: boolean; message?: string };
    return res.json({ succeed: data.succeed, message: data.message });
  } catch (err) {
    return res.status(500).json({
      succeed: false,
      message: err instanceof Error ? err.message : "Push ECR cancel амжилтгүй боллоо",
    });
  }
});

router.get("/pos/payments/card/status/:attemptId", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const id = String(req.params.attemptId || "");
  try {
    const attempt = await prisma.cardPaymentAttempt.findUnique({ where: { id } });
    if (!attempt) return res.status(404).json({ message: "Card attempt олдсонгүй" });
    if (actor.role !== "ADMIN" && attempt.organizationId && !(await hasOrgMembership(actor.id, attempt.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын card attempt харах боломжгүй" });
    }
    return res.json({
      attemptId: attempt.id,
      amount: Number(attempt.amount),
      terminalId: attempt.terminalId,
      bridgeUrl: attempt.bridgeUrl,
      status: attempt.status,
      transactionId: attempt.transactionId,
      message: attempt.message,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("card status error", error);
    return res.status(500).json({ message: "Card статус авахад алдаа гарлаа" });
  }
});

router.post("/pos/payments/qpay/invoice", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const amount = Number(req.body?.amount || 0);
  const registerId: string | null = req.body?.registerId || null;
  const bodyOrganizationId: string | null = req.body?.organizationId || null;

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
      effectiveOrganizationId = actor.role === "ADMIN" ? bodyOrganizationId : actor.organizationId;
    }

    if (actor.role !== "ADMIN" && bodyOrganizationId && bodyOrganizationId !== effectiveOrganizationId) {
      return res.status(403).json({ message: "organizationId зөрүүтэй байна" });
    }

    const merchantContext = registerQpayConfig
      ? buildQPayMerchantContextFromPosRegister(registerQpayConfig)
      : null;
    if (registerQpayConfig && !merchantContext) {
      return res.status(400).json({
        message: "QPay merchant тохиргоо дутуу байна (merchantId/terminalId/password)",
      });
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
      const qpayData = await createQPayInvoice({
        orderId: invoice.id,
        orderNumber: `POS-${invoice.id.slice(0, 8)}`,
        amount,
        description: `POS invoice ${invoice.id}`,
        merchantContext: merchantContext || undefined,
        callbackConfig: {
          path: "/api/operations/pos/payments/qpay/webhook",
          query: {
            invoiceId: invoice.id,
            registerId: registerId || undefined,
            organizationId: effectiveOrganizationId || undefined,
          },
        },
      });

      const updated = await prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          qrText: qpayData.qr_text,
          webhookPayload: {
            providerInvoiceId: qpayData.invoice_id,
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
    return res.status(500).json({ message: "QPay invoice үүсгэхэд алдаа гарлаа" });
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
        const merchantContext = invoice.register
          ? buildQPayMerchantContextFromPosRegister({
              qpayEnabled: invoice.register.qpayEnabled,
              qpayMerchantId: invoice.register.qpayMerchantId,
              qpayTerminalId: invoice.register.qpayTerminalId,
            })
          : null;
        const check = await checkQPayPayment(providerInvoiceId, merchantContext || undefined);
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
  const paymentId = String(req.body?.paymentId || req.body?.payment_id || "").trim();
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

    await prisma.qPayInvoice.update({
      where: { id: invoiceId },
      data: {
        status: PosQPayStatus.PAID,
        paymentId,
        paidAt: parsedPaidAt || new Date(),
        webhookPayload: req.body as object,
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

router.post("/pos/sales", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const body = req.body as CreateSaleBody;
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const registerId = String(body.registerId || "").trim() || null;
    const organizationId = String(body.organizationId || "").trim() || null;
    const clientSaleId = String(body.clientSaleId || "").trim();

    let idempotencyOrganizationId: string | null = null;
    if (registerId) {
      const registerForScope = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: { id: true, organizationId: true },
      });
      if (!registerForScope) {
        return res.status(404).json({ message: "POS register олдсонгүй" });
      }
      idempotencyOrganizationId = registerForScope.organizationId;
    } else {
      idempotencyOrganizationId = actor.role === "ADMIN" ? organizationId : actor.organizationId;
    }

    if (!idempotencyOrganizationId) {
      return res.status(400).json({ message: "idempotency organization тодорхойгүй байна" });
    }

    if (!clientSaleId) {
      return res.status(400).json({ message: "clientSaleId шаардлагатай" });
    }

    const existingSale = await prisma.posSaleIdempotency.findFirst({
      where: {
        organizationId: idempotencyOrganizationId,
        clientSaleId,
      },
      select: { response: true },
    });
    if (existingSale?.response) {
      const existingResponse = existingSale.response as Record<string, unknown>;
      if (existingResponse.pending === true) {
        return res.status(409).json({ message: "Sale request одоо боловсруулагдаж байна" });
      }
      return res.status(200).json(existingSale.response as object);
    }

    if (!body.shiftId || !body.branchId) {
      return res.status(400).json({ message: "shiftId болон branchId шаардлагатай" });
    }

    if (lines.length === 0) {
      return res.status(400).json({ message: "Зарах барааны мөрүүд хоосон байна" });
    }

    const normalizedPayments = Array.isArray(body.paymentBreakdown)
      ? body.paymentBreakdown.map((item) => ({
          method: normalizePaymentMethod(item.method),
          amount: Number(item.amount || 0),
          attemptId: item.attemptId,
          transactionId: item.transactionId,
          invoiceId: item.invoiceId,
        }))
      : [];

    if (normalizedPayments.length === 0) {
      return res.status(400).json({ message: "paymentBreakdown шаардлагатай" });
    }

    for (const item of normalizedPayments) {
      if (
        !item.method ||
        ![PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.QPAY].some(
          (allowedMethod) => allowedMethod === item.method,
        )
      ) {
        return res.status(400).json({ message: "paymentBreakdown.method буруу байна" });
      }
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        return res.status(400).json({ message: "paymentBreakdown.amount 0-оос их тоо байх ёстой" });
      }
    }

    const qtyByProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId || !Number.isFinite(line.qty) || line.qty <= 0) {
        return res.status(400).json({ message: "Мөрийн өгөгдөл буруу байна" });
      }
      qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) || 0) + line.qty);
    }

    const productIds = Array.from(qtyByProduct.keys());
    const receiptNo = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;

    const preLineTotals = lines.map((line) => {
      const qty = Number(line.qty || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const discount = Number(line.discountAmount || 0) * qty;
      const taxable = Math.max(0, unitPrice * qty - discount);
      const taxAmount = taxable * (Number(line.taxRate || 0) / 100);
      return { subTotal: unitPrice * qty, taxAmount, discountTotal: discount };
    });
    const preSubTotal = preLineTotals.reduce((sum, line) => sum + line.subTotal, 0);
    const preTaxTotal = preLineTotals.reduce((sum, line) => sum + line.taxAmount, 0);
    const preDiscountTotal = preLineTotals.reduce((sum, line) => sum + line.discountTotal, 0);
    const expectedGrandTotal = roundMoney(preSubTotal + preTaxTotal - preDiscountTotal);
    const paymentTotal = roundMoney(normalizedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0));

    if (!moneyMatches(paymentTotal, expectedGrandTotal)) {
      return res.status(400).json({
        message: `Payment total (${paymentTotal}) нь grandTotal (${expectedGrandTotal})-тай таарахгүй байна`,
      });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let register:
        | {
            id: string;
            branchId: string;
            organizationId: string;
            activationStatus: PosActivationStatus;
            isActive: boolean;
          }
        | null = null;

      if (registerId) {
        register = await tx.posRegister.findUnique({
          where: { id: registerId },
          select: {
            id: true,
            branchId: true,
            organizationId: true,
            activationStatus: true,
            isActive: true,
          },
        });
        if (!register) throw toApiError(404, "POS register олдсонгүй");
        if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
          throw toApiError(403, "POS register идэвхгүй эсвэл батлагдаагүй байна");
        }
        if (register.branchId !== body.branchId) {
          throw toApiError(400, "Sale branchId нь register branch-тай зөрүүтэй байна");
        }
        if (organizationId && register.organizationId !== organizationId) {
          throw toApiError(400, "Sale organizationId нь register organization-тай зөрүүтэй байна");
        }
      }

      const effectiveOrganizationId = register?.organizationId || organizationId || actor.organizationId || null;

      if (!effectiveOrganizationId) {
        throw toApiError(400, "Sale organizationId тодорхойгүй байна");
      }

      if (actor.role !== "ADMIN") {
        const saleMembership = await tx.organizationMember.findFirst({
          where: { userId: actor.id, organizationId: effectiveOrganizationId, isActive: true },
          select: { id: true },
        });
        if (!saleMembership) {
          throw toApiError(403, "Өөр байгууллагын sale хийх боломжгүй");
        }
      }

      await tx.posSaleIdempotency.create({
        data: {
          clientSaleId,
          receiptNo,
          organizationId: effectiveOrganizationId,
          registerId,
          response: { pending: true },
        },
      });

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          organizationId: true,
        },
      });

      if (products.length !== productIds.length) {
        throw toApiError(404, "Зарим бараа олдсонгүй");
      }

      if (register?.organizationId) {
        for (const product of products) {
          if (product.organizationId !== register.organizationId) {
            throw toApiError(400, `"${product.name}" бараа энэ POS register-ийн байгууллагад хамаарахгүй байна`);
          }
        }
      }

      const cardLines = normalizedPayments.filter((item) => item.method === PaymentMethod.CARD);
      const qpayLines = normalizedPayments.filter((item) => item.method === PaymentMethod.QPAY);

      for (const cardLine of cardLines) {
        const attemptId = String(cardLine.attemptId || cardLine.transactionId || "").trim();
        if (!attemptId) {
          throw toApiError(400, "CARD payment line дээр attemptId шаардлагатай");
        }

        const attempt = await tx.cardPaymentAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt) throw toApiError(404, `Card attempt олдсонгүй: ${attemptId}`);
        if (attempt.status !== PosPaymentStatus.APPROVED) {
          throw toApiError(409, `Card attempt ${attemptId} approved биш байна`);
        }
        if (attempt.saleReference || attempt.consumedAt) {
          throw toApiError(409, `Card attempt ${attemptId} аль хэдийн ашиглагдсан байна`);
        }
        if (!moneyMatches(Number(attempt.amount), cardLine.amount)) {
          throw toApiError(400, `Card attempt ${attemptId} amount зөрүүтэй байна`);
        }
        if (registerId && attempt.registerId && attempt.registerId !== registerId) {
          throw toApiError(400, `Card attempt ${attemptId} register зөрүүтэй байна`);
        }
        if (!attempt.organizationId || attempt.organizationId !== effectiveOrganizationId) {
          throw toApiError(400, `Card attempt ${attemptId} organization зөрүүтэй байна`);
        }
      }

      for (const qpayLine of qpayLines) {
        const invoiceId = String(qpayLine.invoiceId || "").trim();
        if (!invoiceId) {
          throw toApiError(400, "QPAY payment line дээр invoiceId шаардлагатай");
        }

        const invoice = await tx.qPayInvoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw toApiError(404, `QPay invoice олдсонгүй: ${invoiceId}`);
        if (invoice.status !== PosQPayStatus.PAID) {
          throw toApiError(409, `QPay invoice ${invoiceId} paid биш байна`);
        }
        if (invoice.saleReference || invoice.consumedAt) {
          throw toApiError(409, `QPay invoice ${invoiceId} аль хэдийн ашиглагдсан байна`);
        }
        if (!moneyMatches(Number(invoice.amount), qpayLine.amount)) {
          throw toApiError(400, `QPay invoice ${invoiceId} amount зөрүүтэй байна`);
        }
        if (registerId && invoice.registerId && invoice.registerId !== registerId) {
          throw toApiError(400, `QPay invoice ${invoiceId} register зөрүүтэй байна`);
        }
        if (!invoice.organizationId || invoice.organizationId !== effectiveOrganizationId) {
          throw toApiError(400, `QPay invoice ${invoiceId} organization зөрүүтэй байна`);
        }
      }

      for (const product of products) {
        const requestedQty = qtyByProduct.get(product.id) || 0;
        if (product.stock < requestedQty) {
          throw toApiError(
            409,
            `"${product.name}" барааны нөөц хүрэлцэхгүй (үлдэгдэл: ${product.stock})`,
          );
        }
      }

      for (const [productId, qty] of qtyByProduct) {
        const warehouseId = await resolveOrgWarehouse(tx, effectiveOrganizationId, productId);

        await adjustStock(tx, {
          productId,
          warehouseId: warehouseId ?? undefined,
          change: -qty,
          reason: InventoryReason.ORDER,
          note: body.note || "POS sale",
          createdById: actor?.id || null,
          referenceId: receiptNo,
          referenceType: "POS_SALE",
        });
      }

      for (const cardLine of cardLines) {
        const attemptId = String(cardLine.attemptId || cardLine.transactionId || "").trim();
        await tx.cardPaymentAttempt.update({
          where: { id: attemptId },
          data: {
            saleReference: receiptNo,
            consumedAt: new Date(),
          },
        });
      }

      for (const qpayLine of qpayLines) {
        const invoiceId = String(qpayLine.invoiceId || "").trim();
        await tx.qPayInvoice.update({
          where: { id: invoiceId },
          data: {
            saleReference: receiptNo,
            consumedAt: new Date(),
          },
        });
      }

      const lineDetails = lines.map((line) => {
        const product = products.find((item: (typeof products)[number]) => item.id === line.productId);
        const discount = Number(line.discountAmount || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const qty = Number(line.qty || 0);
        const taxRate = Number(line.taxRate || 0);
        const subTotal = unitPrice * qty;
        const discountTotal = discount * qty;
        const taxable = Math.max(0, subTotal - discountTotal);
        const taxAmount = taxable * (taxRate / 100);
        const lineTotal = taxable + taxAmount;

        return {
          productId: line.productId,
          productName: product?.name || line.productId,
          productSku: null as string | null,
          qty,
          unitPrice,
          taxAmount,
          discount: discountTotal,
          lineTotal,
        };
      });

      const subTotal = lineDetails.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
      const taxTotal = lineDetails.reduce((sum, line) => sum + line.taxAmount, 0);
      const discountTotal = lines.reduce(
        (sum, line) => sum + Number(line.discountAmount || 0) * Number(line.qty || 0),
        0,
      );
      const grandTotal = subTotal + taxTotal - discountTotal;

      const paymentMethodSummary = (() => {
        const methods = Array.from(new Set(normalizedPayments.map((item) => item.method)));
        return methods.length === 1 ? methods[0] : "MIXED";
      })();

      // Create structured PosSale + PosSaleLine records
      const posSale = await tx.posSale.create({
        data: {
          receiptNo,
          organizationId: effectiveOrganizationId,
          branchId: body.branchId!,
          registerId: registerId || undefined,
          shiftId: body.shiftId!,
          cashierId: actor.id,
          paymentMethod: paymentMethodSummary || "CASH",
          subtotal: subTotal,
          taxTotal,
          discountTotal,
          grandTotal,
          note: body.note || null,
          lines: {
            create: lineDetails.map((ld) => ({
              productId: ld.productId,
              productName: ld.productName,
              productSku: ld.productSku,
              qty: ld.qty,
              unitPrice: ld.unitPrice,
              taxAmount: ld.taxAmount,
              discount: ld.discount,
              lineTotal: ld.lineTotal,
            })),
          },
        },
      });

      const fullSale = await tx.posSale.findUniqueOrThrow({
        where: { id: posSale.id },
        include: {
          lines: true,
          cashier: { select: { email: true } },
          branch: { select: { name: true } },
        },
      });

      const saleResponse = {
        id: fullSale.id,
        receiptNo: fullSale.receiptNo,
        branchName: fullSale.branch.name,
        cashierName: fullSale.cashier.email,
        paymentMethod: fullSale.paymentMethod,
        paymentBreakdown: normalizedPayments,
        createdAt: fullSale.createdAt.toISOString(),
        lines: fullSale.lines.map((l) => ({
          productId: l.productId,
          name: l.productName,
          qty: l.qty,
          unitPrice: Number(l.unitPrice),
          taxAmount: Number(l.taxAmount),
          lineTotal: Number(l.lineTotal),
        })),
        subTotal: Number(fullSale.subtotal),
        taxTotal: Number(fullSale.taxTotal),
        discountTotal: Number(fullSale.discountTotal),
        grandTotal: Number(fullSale.grandTotal),
      };

      await tx.posSaleIdempotency.update({
        where: {
          organizationId_clientSaleId: {
            organizationId: effectiveOrganizationId,
            clientSaleId,
          },
        },
        data: { response: saleResponse as object },
      });

      return { saleResponse, effectiveOrganizationId, grandTotal };
    });

    void prisma.auditLog.create({
      data: {
        userId: actor?.id || null,
        action: AuditAction.POS_SALE_CREATED,
        ip: req.ip,
        meta: {
          clientSaleId,
          receiptNo,
          registerId,
          branchId: body.branchId,
          organizationId: result.effectiveOrganizationId,
          paymentBreakdown: normalizedPayments,
          grandTotal: result.grandTotal,
        },
      },
    });

    res.status(201).json(result.saleResponse);
  } catch (error) {
    const maybeKnownError = error as { code?: string };
    if (maybeKnownError?.code === "P2002") {
      const body = req.body as CreateSaleBody;
      const clientSaleId = String(body.clientSaleId || "").trim();
      const organizationId = String(body.organizationId || "").trim() || null;
      if (clientSaleId) {
        const existingSale = await prisma.posSaleIdempotency.findFirst({
          where: {
            organizationId: organizationId || undefined,
            clientSaleId,
          },
          select: { response: true },
        });
        if (existingSale?.response) {
          const existingResponse = existingSale.response as Record<string, unknown>;
          if (existingResponse.pending === true) {
            return res.status(409).json({ message: "Sale request одоо боловсруулагдаж байна" });
          }
          return res.status(200).json(existingSale.response as object);
        }
      }
    }

    console.error("create pos sale error", error);

    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res.status(maybeApiError.status).json({ message: maybeApiError.message });
    }

    res.status(500).json({ message: "POS борлуулалт үүсгэхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Shift management — open / close / current
 * ─────────────────────────────────────────────────────────────────────── */

router.post("/pos/shifts/open", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.body.branchId || "").trim();
    const openingCash = Number(req.body.openingCash);

    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      return res.status(400).json({ message: "openingCash 0 буюу түүнээс дээш байх ёстой" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, organizationId: true, name: true },
    });
    if (!branch) {
      return res.status(404).json({ message: "Салбар олдсонгүй" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const existingOpen = await prisma.posShift.findFirst({
      where: { cashierId: actor.id, status: ShiftStatus.OPEN },
      select: { id: true },
    });
    if (existingOpen) {
      return res.status(409).json({ message: "Нээлттэй ээлж аль хэдийн байна. Эхлээд хаана уу." });
    }

    const shift = await prisma.posShift.create({
      data: {
        organizationId: branch.organizationId,
        branchId,
        cashierId: actor.id,
        openingCash,
        status: ShiftStatus.OPEN,
      },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    const response = {
      id: shift.id,
      cashierId: shift.cashierId,
      cashierName: shift.cashier.email,
      branchId: shift.branchId,
      openedAt: shift.openedAt.toISOString(),
      closedAt: null,
      openingCash: Number(shift.openingCash),
      closingCash: null,
      expectedCash: 0,
      status: shift.status,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("open shift error", error);
    res.status(500).json({ message: "Ээлж нээхэд алдаа гарлаа" });
  }
});

router.post("/pos/shifts/close", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.body.shiftId || "").trim();
    const closingCash = Number(req.body.closingCash);
    const note = String(req.body.note || "").trim().slice(0, 500) || null;

    if (!shiftId) {
      return res.status(400).json({ message: "shiftId шаардлагатай" });
    }
    if (!Number.isFinite(closingCash) || closingCash < 0) {
      return res.status(400).json({ message: "closingCash 0 буюу түүнээс дээш байх ёстой" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }
    if (shift.cashierId !== actor.id && actor.role !== "ADMIN") {
      return res.status(403).json({ message: "Зөвхөн өөрийн ээлжийг хааж болно" });
    }
    if (shift.status === ShiftStatus.CLOSED) {
      return res.status(409).json({ message: "Ээлж аль хэдийн хаагдсан" });
    }

    // Calculate expected cash from CASH sales in this shift
    const cashSales = await prisma.posSale.findMany({
      where: { shiftId: shift.id, status: PosSaleStatus.COMPLETED },
      select: { grandTotal: true, paymentMethod: true },
    });
    // Sum up all CASH payment totals. For mixed payments we'd need breakdown, 
    // but for simplicity, when paymentMethod is CASH, add grandTotal.
    const expectedCashFromSales = cashSales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const expectedCash = Number(shift.openingCash) + expectedCashFromSales;
    const cashDifference = roundMoney(closingCash - expectedCash);

    const updatedShift = await prisma.posShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash,
        expectedCash,
        cashDifference,
        note,
        closedAt: new Date(),
      },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    const response = {
      id: updatedShift.id,
      cashierId: updatedShift.cashierId,
      cashierName: updatedShift.cashier.email,
      branchId: updatedShift.branchId,
      openedAt: updatedShift.openedAt.toISOString(),
      closedAt: updatedShift.closedAt?.toISOString() ?? null,
      openingCash: Number(updatedShift.openingCash),
      closingCash: Number(updatedShift.closingCash),
      expectedCash: Number(updatedShift.expectedCash),
      status: updatedShift.status,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("close shift error", error);
    res.status(500).json({ message: "Ээлж хаахад алдаа гарлаа" });
  }
});

router.get("/pos/shifts/current", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shift = await prisma.posShift.findFirst({
      where: { cashierId: actor.id, status: ShiftStatus.OPEN },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    if (!shift) {
      return res.status(200).json(null);
    }

    const response = {
      id: shift.id,
      cashierId: shift.cashierId,
      cashierName: shift.cashier.email,
      branchId: shift.branchId,
      openedAt: shift.openedAt.toISOString(),
      closedAt: null,
      openingCash: Number(shift.openingCash),
      closingCash: null,
      expectedCash: 0,
      status: shift.status,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("get current shift error", error);
    res.status(500).json({ message: "Ээлж мэдээлэл авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Products — product list for the POS grid
 * GET /pos/products?branchId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/products", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true },
    });
    if (!branch) {
      return res.status(404).json({ message: "Салбар олдсонгүй" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: branch.organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      sku: p.sku || "",
      name: p.name,
      price: Number(p.price),
      stockQty: p.stock,
      isActive: p.isActive,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("get pos products error", error);
    res.status(500).json({ message: "Бараа жагсаалт авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Receipts — list sales for a shift
 * GET /pos/receipts?shiftId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/receipts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.query.shiftId || "").trim();
    if (!shiftId) {
      return res.status(400).json({ message: "shiftId шаардлагатай" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      select: { id: true, cashierId: true, branchId: true, organizationId: true },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }

    if (shift.cashierId !== actor.id && actor.role !== "ADMIN") {
      return res.status(403).json({ message: "Энэ ээлжийн мэдээлэл харах эрхгүй" });
    }

    const sales = await prisma.posSale.findMany({
      where: { shiftId },
      include: {
        lines: true,
        cashier: { select: { email: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const receipts = sales.map((sale) => ({
      id: sale.id,
      receiptNo: sale.receiptNo,
      branchName: sale.branch.name,
      cashierName: sale.cashier.email,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt.toISOString(),
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        name: line.productName,
        qty: line.qty,
        unitPrice: Number(line.unitPrice),
        taxAmount: Number(line.taxAmount),
        lineTotal: Number(line.lineTotal),
      })),
      subTotal: Number(sale.subtotal),
      taxTotal: Number(sale.taxTotal),
      discountTotal: Number(sale.discountTotal),
      grandTotal: Number(sale.grandTotal),
    }));

    res.status(200).json(receipts);
  } catch (error) {
    console.error("get receipts error", error);
    res.status(500).json({ message: "Баримтын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Reports — aggregated sales report
 * GET /pos/reports?branchId=<uuid>&from=<ISO>&to=<ISO>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/reports", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    const fromStr = String(req.query.from || "").trim();
    const toStr = String(req.query.to || "").trim();

    if (!branchId || !fromStr || !toStr) {
      return res.status(400).json({ message: "branchId, from, to шаардлагатай" });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ message: "from, to буруу огноо формат" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true },
    });
    if (!branch) {
      return res.status(404).json({ message: "Салбар олдсонгүй" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const sales = await prisma.posSale.findMany({
      where: {
        branchId,
        status: PosSaleStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
      select: { grandTotal: true, discountTotal: true },
    });

    const salesCount = sales.length;
    const grossAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal) + Number(s.discountTotal), 0);
    const netAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const averageTicket = salesCount > 0 ? roundMoney(netAmount / salesCount) : 0;

    res.status(200).json({
      salesCount,
      grossAmount: roundMoney(grossAmount),
      netAmount: roundMoney(netAmount),
      averageTicket,
    });
  } catch (error) {
    console.error("get pos reports error", error);
    res.status(500).json({ message: "Тайлан авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Void a completed sale
 * POST /pos/sales/:id/void
 * ─────────────────────────────────────────────────────────────────────── */

router.post("/pos/sales/:id/void", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const saleId = req.params.id;
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    if (!reason) {
      return res.status(400).json({ message: "Цуцлах шалтгаан шаардлагатай" });
    }

    const sale = await prisma.posSale.findUnique({
      where: { id: saleId },
      include: { lines: true },
    });
    if (!sale) {
      return res.status(404).json({ message: "Борлуулалт олдсонгүй" });
    }
    if (sale.status !== PosSaleStatus.COMPLETED) {
      return res.status(409).json({ message: "Зөвхөн дууссан борлуулалтыг цуцлах боломжтой" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: sale.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.posSale.update({
        where: { id: saleId },
        data: {
          status: PosSaleStatus.VOIDED,
          voidedAt: new Date(),
          voidReason: reason,
          voidedById: actor.id,
        },
      });

      // Reverse stock for each line
      for (const line of sale.lines) {
        const warehouseId = await resolveOrgWarehouse(tx, sale.organizationId, line.productId);
        await adjustStock(tx, {
          productId: line.productId,
          warehouseId: warehouseId ?? undefined,
          change: line.qty, // positive = return to stock
          reason: InventoryReason.ORDER,
          note: `Void sale ${sale.receiptNo}`,
          createdById: actor.id,
          referenceId: sale.receiptNo,
          referenceType: "POS_VOID",
        });
      }
    });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_SALE_CREATED, // reuse closest action
        ip: req.ip,
        meta: {
          saleId,
          receiptNo: sale.receiptNo,
          voidReason: reason,
          action: "VOID",
        },
      },
    });

    res.status(200).json({ ok: true, message: "Борлуулалт амжилттай цуцлагдлаа" });
  } catch (error) {
    console.error("void sale error", error);
    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res.status(maybeApiError.status).json({ message: maybeApiError.message });
    }
    res.status(500).json({ message: "Борлуулалт цуцлахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * PosRegister config — vendor POS machine fetches this on boot
 * GET /pos/register-config?registerId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */
router.get("/pos/register-config", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const registerId = String(req.query.registerId || "").trim();
  if (!registerId) {
    return res.status(400).json({ message: "registerId шаардлагатай" });
  }

  try {
    const register = await prisma.posRegister.findUnique({
      where: { id: registerId },
      select: {
        id: true,
        name: true,
        label: true,
        cardEnabled: true,
        cardProviderType: true,
        cardTerminalId: true,
        terminalBridgeUrl: true,
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayTerminalId: true,
        isActive: true,
        activationStatus: true,
        branchId: true,
        organizationId: true,
        branch: { select: { id: true, name: true } },
      },
    });

    if (!register) {
      return res.status(404).json({ message: "POS олдсонгүй" });
    }
    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, register.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын POS config харах боломжгүй" });
    }
    if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
      return res.status(403).json({ message: "POS идэвхгүй эсвэл батлагдаагүй байна" });
    }

    return res.json(register);
  } catch (error) {
    console.error("get pos register-config error", error);
    return res.status(500).json({ message: "POS config авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Vendor self-service — claim/create POS register without admin dashboard
 * POST /pos/registers/self-claim
 * ─────────────────────────────────────────────────────────────────────── */
router.post("/pos/registers/self-claim", async (req, res) => {
  const claims = parseAuthClaims(req);
  if (!claims) {
    return res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
  }

  // Resolve the authenticated user from DB first — organizationId is NEVER
  // trusted from the request body for non-admin callers.
  let authUser: {
    id: string;
    role: string;
    isActive: boolean;
    deletedAt: Date | null;
    organizationId: string | null;
  } | null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });
    if (!user) {
      authUser = null;
    } else {
      // Resolve org from membership
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id, isActive: true, isPrimary: true },
        select: { organizationId: true },
      });
      const fallback = !membership
        ? await prisma.organizationMember.findFirst({
            where: { userId: user.id, isActive: true },
            orderBy: { createdAt: "asc" },
            select: { organizationId: true },
          })
        : null;
      authUser = {
        ...user,
        organizationId: (membership || fallback)?.organizationId || null,
      };
    }
  } catch (dbErr) {
    console.error("self-claim auth lookup error", dbErr);
    return res.status(500).json({ message: "Хэрэглэгч шалгахад алдаа гарлаа" });
  }

  if (!authUser || authUser.deletedAt || !authUser.isActive) {
    return res.status(401).json({ message: "Нэвтэрсэн хэрэглэгч хүчингүй байна" });
  }

  // Platform ADMIN or user with org membership can claim POS
  if (authUser.role !== "ADMIN" && !authUser.organizationId) {
    return res.status(403).json({ message: "POS claim хийх эрх хүрэлцэхгүй" });
  }

  // ADMIN: may supply an explicit organizationId in the body.
  // Others: always use org from membership.
  let organizationId: string;
  if (authUser.role === "ADMIN") {
    organizationId = String(req.body?.organizationId || "").trim();
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }
  } else {
    // Silently ignore any organizationId sent in the body — use membership value only.
    organizationId = authUser.organizationId!;
  }

  const branchId = String(req.body?.branchId || "").trim();
  const name = normalizeRegisterName(req.body?.name);

  if (!branchId || !name) {
    return res.status(400).json({ message: "branchId, name шаардлагатай" });
  }

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, organizationId: true },
    });

    if (!branch || branch.organizationId !== organizationId) {
      return res.status(400).json({ message: "Сонгосон салбар энэ байгууллагад хамаарахгүй байна" });
    }

    const existing = await prisma.posRegister.findFirst({
      where: {
        organizationId,
        branchId,
        name,
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return res.status(200).json({ ...existing, reused: true });
    }

    const created = await prisma.posRegister.create({
      data: {
        organizationId,
        branchId,
        name,
        isActive: false,
        activationStatus: PosActivationStatus.PENDING,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    void prisma.auditLog.create({
      data: {
        userId: authUser.id,
        action: AuditAction.POS_REGISTER_CLAIMED,
        ip: req.ip,
        meta: { registerId: created.id, organizationId, branchId, name },
      },
    });

    return res.status(201).json({ ...created, reused: false });
  } catch (error) {
    const maybePrisma = error as { code?: string; meta?: { target?: unknown } };
    if (maybePrisma?.code === "P2002") {
      const target = Array.isArray(maybePrisma.meta?.target)
        ? maybePrisma.meta?.target.join(",")
        : String(maybePrisma.meta?.target || "");
      return res.status(409).json({
        message: target
          ? `Давхардсан POS тохиргоо байна (${target})`
          : "Давхардсан POS тохиргоо байна",
      });
    }
    console.error("self-claim pos-register error", error);
    return res.status(500).json({ message: "POS бүртгэхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Admin — Register activation workflow
 * PATCH /admin/pos-registers/:id/activate  — PENDING → APPROVED
 * PATCH /admin/pos-registers/:id/reject    — PENDING → REJECTED
 * ─────────────────────────────────────────────────────────────────────── */
router.patch("/admin/pos-registers/:id/activate", async (req, res) => {
  try {
    const actor = await requireAdminUser(req, res);
    if (!actor) return;

    const id = String(req.params.id || "").trim();
    const register = await prisma.posRegister.findUnique({ where: { id } });
    if (!register) return res.status(404).json({ message: "POS олдсонгүй" });
    if (register.activationStatus !== PosActivationStatus.PENDING) {
      return res.status(409).json({ message: `Transition зөвшөөрөгдөхгүй: ${register.activationStatus} → APPROVED` });
    }

    const updated = await prisma.posRegister.update({
      where: { id },
      data: {
        activationStatus: PosActivationStatus.APPROVED,
        isActive: true,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectReason: null,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_REGISTER_ACTIVATED,
        ip: req.ip,
        meta: { registerId: id, organizationId: register.organizationId },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("activate pos-register error", error);
    return res.status(500).json({ message: "POS идэвхжүүлэхэд алдаа гарлаа" });
  }
});

router.patch("/admin/pos-registers/:id/reject", async (req, res) => {
  try {
    const actor = await requireAdminUser(req, res);
    if (!actor) return;

    const id = String(req.params.id || "").trim();
    const rejectReason = String(req.body?.rejectReason || "").trim() || null;

    const register = await prisma.posRegister.findUnique({ where: { id } });
    if (!register) return res.status(404).json({ message: "POS олдсонгүй" });
    if (register.activationStatus !== PosActivationStatus.PENDING) {
      return res.status(409).json({ message: `Transition зөвшөөрөгдөхгүй: ${register.activationStatus} → REJECTED` });
    }

    const updated = await prisma.posRegister.update({
      where: { id },
      data: {
        activationStatus: PosActivationStatus.REJECTED,
        isActive: false,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectReason,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_REGISTER_REJECTED,
        ip: req.ip,
        meta: { registerId: id, organizationId: register.organizationId, rejectReason },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("reject pos-register error", error);
    return res.status(500).json({ message: "POS татгаазахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Admin — PosRegister CRUD
 * ─────────────────────────────────────────────────────────────────────── */

// GET /admin/pos-registers?organizationId=<uuid>
router.get("/admin/pos-registers", async (req, res) => {
  const actor = await requireAdminUser(req, res);
  if (!actor) return;

  const organizationId = String(req.query.organizationId || "").trim();
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId шаардлагатай" });
  }

  try {
    const registers = await prisma.posRegister.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { branch: { select: { id: true, name: true } } },
    });
    return res.json(registers);
  } catch (error) {
    console.error("list pos-registers error", error);
    return res.status(500).json({ message: "POS жагсаалт авахад алдаа гарлаа" });
  }
});

// POST /admin/pos-registers
router.post("/admin/pos-registers", async (req, res) => {
  const actor = await requireAdminUser(req, res);
  if (!actor) return;

  const {
    organizationId,
    branchId,
    name,
    label,
    cardEnabled,
    cardProviderType,
    cardTerminalId,
    terminalBridgeUrl,
    qpayEnabled,
    qpayMerchantId,
    qpayTerminalId,
  } = req.body as {
    organizationId?: string;
    branchId?: string;
    name?: string;
    label?: string;
    cardEnabled?: boolean;
    cardProviderType?: string;
    cardTerminalId?: string;
    terminalBridgeUrl?: string;
    qpayEnabled?: boolean;
    qpayMerchantId?: string;
    qpayTerminalId?: string;
  };

  const normalizedName = normalizeRegisterName(name);

  if (!organizationId || !branchId || !normalizedName) {
    return res.status(400).json({ message: "organizationId, branchId, name шаардлагатай" });
  }

  // Validate terminalBridgeUrl if provided
  if (terminalBridgeUrl) {
    try {
      const parsed = new URL(terminalBridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
    }
  }

  if (cardEnabled === true && (!cardProviderType || !cardTerminalId)) {
    return res.status(400).json({ message: "cardEnabled=true үед cardProviderType, cardTerminalId шаардлагатай" });
  }

  if (cardEnabled === false && (cardProviderType || cardTerminalId || terminalBridgeUrl)) {
    return res.status(400).json({
      message: "cardEnabled=false үед cardProviderType, cardTerminalId, terminalBridgeUrl хоосон байх ёстой",
    });
  }

  if (qpayEnabled === true && (!qpayMerchantId || !qpayTerminalId)) {
    return res.status(400).json({ message: "qpayEnabled=true үед qpayMerchantId, qpayTerminalId шаардлагатай" });
  }

  if (qpayEnabled === false && (qpayMerchantId || qpayTerminalId)) {
    return res.status(400).json({
      message: "qpayEnabled=false үед qpayMerchantId, qpayTerminalId хоосон байх ёстой",
    });
  }

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, organizationId: true },
    });

    if (!branch || branch.organizationId !== organizationId) {
      return res.status(400).json({ message: "Сонгосон салбар энэ байгууллагад хамаарахгүй байна" });
    }

    const register = await prisma.posRegister.create({
      data: {
        organizationId,
        branchId,
        name: normalizedName,
        label: label ? String(label).trim() : null,
        cardEnabled: Boolean(cardEnabled),
        cardProviderType: cardProviderType || null,
        cardTerminalId: cardTerminalId || null,
        terminalBridgeUrl: terminalBridgeUrl || null,
        qpayEnabled: Boolean(qpayEnabled),
        qpayMerchantId: qpayMerchantId || null,
        qpayTerminalId: qpayTerminalId || null,
        // Admin-created registers are immediately active and approved
        isActive: true,
        activationStatus: PosActivationStatus.APPROVED,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_REGISTER_CREATED,
        ip: req.ip,
        meta: { registerId: register.id, organizationId, branchId, createdVia: "admin-crud" },
      },
    });

    return res.status(201).json(register);
  } catch (error) {
    const maybePrisma = error as { code?: string; meta?: { target?: unknown } };
    if (maybePrisma?.code === "P2002") {
      const target = Array.isArray(maybePrisma.meta?.target)
        ? maybePrisma.meta?.target.join(",")
        : String(maybePrisma.meta?.target || "");
      return res.status(409).json({
        message: target
          ? `Давхардсан POS тохиргоо байна (${target})`
          : "Давхардсан POS тохиргоо байна",
      });
    }
    console.error("create pos-register error", error);
    return res.status(500).json({ message: "POS үүсгэхэд алдаа гарлаа" });
  }
});

// PATCH /admin/pos-registers/:id
router.patch("/admin/pos-registers/:id", async (req, res) => {
  const actor = await requireAdminUser(req, res);
  if (!actor) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id шаардлагатай" });

  const {
    name,
    label,
    cardEnabled,
    cardProviderType,
    cardTerminalId,
    terminalBridgeUrl,
    qpayEnabled,
    qpayMerchantId,
    qpayTerminalId,
    isActive,
  } = req.body as {
    name?: string;
    label?: string;
    cardEnabled?: boolean;
    cardProviderType?: string;
    cardTerminalId?: string;
    terminalBridgeUrl?: string;
    qpayEnabled?: boolean;
    qpayMerchantId?: string;
    qpayTerminalId?: string;
    isActive?: boolean;
  };

  if (terminalBridgeUrl !== undefined && terminalBridgeUrl !== null && terminalBridgeUrl !== "") {
    try {
      const parsed = new URL(terminalBridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
    }
  }

  try {
    const existing = await prisma.posRegister.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "POS олдсонгүй" });

    const nextCardEnabled = cardEnabled !== undefined ? Boolean(cardEnabled) : existing.cardEnabled;
    const nextCardProviderType =
      nextCardEnabled === false
        ? null
        : cardProviderType !== undefined
          ? cardProviderType || null
          : existing.cardProviderType;
    const nextCardTerminalId =
      nextCardEnabled === false
        ? null
        : cardTerminalId !== undefined
          ? cardTerminalId || null
          : existing.cardTerminalId;
    const nextTerminalBridgeUrl =
      nextCardEnabled === false
        ? null
        : terminalBridgeUrl !== undefined
          ? terminalBridgeUrl || null
          : existing.terminalBridgeUrl;

    if (nextCardEnabled && (!nextCardProviderType || !nextCardTerminalId)) {
      return res.status(400).json({ message: "Card идэвхтэй үед provider болон terminal заавал байна" });
    }

    const nextQpayEnabled = qpayEnabled !== undefined ? Boolean(qpayEnabled) : existing.qpayEnabled;
    const nextQpayMerchantId =
      nextQpayEnabled === false
        ? null
        : qpayMerchantId !== undefined
          ? qpayMerchantId || null
          : existing.qpayMerchantId;
    const nextQpayTerminalId =
      nextQpayEnabled === false
        ? null
        : qpayTerminalId !== undefined
          ? qpayTerminalId || null
          : existing.qpayTerminalId;

    if (nextQpayEnabled && (!nextQpayMerchantId || !nextQpayTerminalId)) {
      return res.status(400).json({ message: "QPay идэвхтэй үед merchant болон terminal заавал байна" });
    }

    const updated = await prisma.posRegister.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(label !== undefined && { label: label ? String(label).trim() : null }),
        cardEnabled: nextCardEnabled,
        cardProviderType: nextCardProviderType,
        cardTerminalId: nextCardTerminalId,
        terminalBridgeUrl: nextTerminalBridgeUrl,
        qpayEnabled: nextQpayEnabled,
        qpayMerchantId: nextQpayMerchantId,
        qpayTerminalId: nextQpayTerminalId,
        ...(isActive !== undefined && {
          isActive: Boolean(isActive),
          ...(Boolean(isActive) && existing.activationStatus === PosActivationStatus.PENDING && {
            activationStatus: PosActivationStatus.APPROVED,
          }),
        }),
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_REGISTER_UPDATED,
        ip: req.ip,
        meta: { registerId: id, actionType: "update" },
      },
    });

    return res.json(updated);
  } catch (error) {
    const maybePrisma = error as { code?: string; meta?: { target?: unknown } };
    if (maybePrisma?.code === "P2002") {
      const target = Array.isArray(maybePrisma.meta?.target)
        ? maybePrisma.meta?.target.join(",")
        : String(maybePrisma.meta?.target || "");
      return res.status(409).json({
        message: target
          ? `Давхардсан POS тохиргоо байна (${target})`
          : "Давхардсан POS тохиргоо байна",
      });
    }
    console.error("update pos-register error", error);
    return res.status(500).json({ message: "POS засахад алдаа гарлаа" });
  }
});

// DELETE /admin/pos-registers/:id
router.delete("/admin/pos-registers/:id", async (req, res) => {
  const actor = await requireAdminUser(req, res);
  if (!actor) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id шаардлагатай" });

  try {
    const existing = await prisma.posRegister.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "POS олдсонгүй" });

    await prisma.posRegister.delete({ where: { id } });

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_REGISTER_DELETED,
        ip: req.ip,
        meta: { registerId: id, actionType: "delete" },
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("delete pos-register error", error);
    return res.status(500).json({ message: "POS Бүртгэл устгахад алдаа гарлаа" });
  }
});

export default router;
