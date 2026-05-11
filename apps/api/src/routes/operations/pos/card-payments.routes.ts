import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
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
    let registerCardTerminalId: string | null = null;
    if (registerId) {
      const register = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: {
          id: true,
          organizationId: true,
          activationStatus: true,
          isActive: true,
          cardTerminalId: true,
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

      registerCardTerminalId = register.cardTerminalId || null;
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
      // terminalId priority: request body → register.cardTerminalId → env PUSH_ECR_TERMINAL_ID
      const effectiveTerminalId = terminalId !== "terminal-1" ? terminalId
        : (registerCardTerminalId || pushEcrDefaultTerminalId || terminalId);

      // referralcode: max 10 chars per Push ECR API spec
      const referralCode = makePushEcrReferral(attempt.id);

      void (async () => {
        try {
          const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/purchase`, {
            method: "POST",
            headers: pushEcrHeaders(),
            body: JSON.stringify({
              terminalId: effectiveTerminalId,
              amount,
              payment: 1, // 1=Card, 4=SocialPay QR, 7=Monpay QR
              referralcode: referralCode,
              skipPrint: false,
            }),
            signal: AbortSignal.timeout(120_000),
          });
          const ecrData = (await ecrRes.json()) as PushEcrPurchaseResponse;
          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: ecrData.succeed ? PosPaymentStatus.APPROVED : PosPaymentStatus.DECLINED,
              transactionId: ecrData.ezTransactionId || ecrData.systemRef || ecrData.traceno || null,
              traceno: ecrData.traceno || null,
              message: ecrData.message || null,
              providerPayload: {
                ...ecrData,
                _referralCode: referralCode,
                _terminalId: effectiveTerminalId,
              } as object,
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

  // terminalId: from request body, fallback to env default
  const terminalId = String(req.body?.terminalId || pushEcrDefaultTerminalId || "");
  if (!terminalId) {
    return res.status(400).json({ message: "terminalId шаардлагатай" });
  }

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/cancel`, {
      method: "POST",
      headers: pushEcrHeaders(),
      // NOTE: Push ECR API has a typo in the param name: 'termianlId' (not 'terminalId')
      body: JSON.stringify({ termianlId: terminalId }),
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

/**
 * POST /pos/payments/push-ecr/inquiry
 * Check status of a Push ECR transaction by referralcode.
 * Useful when polling status after a purchase request.
 */
router.post("/pos/payments/push-ecr/inquiry", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const terminalId = String(req.body?.terminalId || pushEcrDefaultTerminalId || "");
  const referralcode = String(req.body?.referralcode || "").slice(0, 10);

  if (!terminalId || !referralcode) {
    return res.status(400).json({ message: "terminalId болон referralcode шаардлагатай" });
  }

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/inquiry`, {
      method: "POST",
      headers: pushEcrHeaders(),
      body: JSON.stringify({ terminalId, referralcode }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await ecrRes.json()) as PushEcrPurchaseResponse;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      succeed: false,
      message: err instanceof Error ? err.message : "Push ECR inquiry амжилтгүй боллоо",
    });
  }
});

/**
 * POST /pos/payments/push-ecr/healthcheck
 * Check if terminal is online and ready.
 */
router.post("/pos/payments/push-ecr/healthcheck", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const terminalId = String(req.body?.terminalId || pushEcrDefaultTerminalId || "");
  if (!terminalId) {
    return res.status(400).json({ message: "terminalId шаардлагатай" });
  }

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/healthcheck`, {
      method: "POST",
      headers: pushEcrHeaders(),
      body: JSON.stringify({ terminalId }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await ecrRes.json()) as { succeed: boolean; message?: string };
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      succeed: false,
      message: err instanceof Error ? err.message : "Terminal healthcheck амжилтгүй боллоо",
    });
  }
});

/**
 * POST /pos/payments/push-ecr/void
 * Буцаалт хийх — purchase-ийн traceno шаардлагатай.
 */
router.post("/pos/payments/push-ecr/void", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const terminalId = String(req.body?.terminalId || pushEcrDefaultTerminalId || "");
  const traceno = String(req.body?.traceno || "");
  const skipPrint = req.body?.skipPrint === true;

  if (!terminalId) return res.status(400).json({ message: "terminalId шаардлагатай" });
  if (!traceno) return res.status(400).json({ message: "traceno шаардлагатай" });

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/void`, {
      method: "POST",
      headers: pushEcrHeaders(),
      body: JSON.stringify({ terminalId, traceno, skipPrint }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await ecrRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      succeed: false,
      message: err instanceof Error ? err.message : "Push ECR void амжилтгүй боллоо",
    });
  }
});

/**
 * POST /pos/payments/push-ecr/settlement
 * Өдрийн нэгтгэл хийх.
 */
router.post("/pos/payments/push-ecr/settlement", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const terminalId = String(req.body?.terminalId || pushEcrDefaultTerminalId || "");
  const skipPrint = req.body?.skipPrint === true;

  if (!terminalId) return res.status(400).json({ message: "terminalId шаардлагатай" });

  try {
    const ecrRes = await fetch(`${pushEcrBaseUrl}/payment/settlement`, {
      method: "POST",
      headers: pushEcrHeaders(),
      body: JSON.stringify({ terminalId, skipPrint }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await ecrRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      succeed: false,
      message: err instanceof Error ? err.message : "Push ECR settlement амжилтгүй боллоо",
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


export default router;
