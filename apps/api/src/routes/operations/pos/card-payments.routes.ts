import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import {
  checkMinuAgentTransaction,
  createMinuAgentInvoice,
  type MinuAgentContext,
} from "../../../services/minu-pos-agent";
import {
  requirePosUser, requireAdminUser, normalizePaymentMethod, normalizeRegisterName,
  roundMoney, moneyMatches, signPayload, timingSafeEqualHex, getHeaderValue,
  parseBridgeResultStatus, parseQPaySuccess, parseOptionalDate,
  makePushEcrReferral, pushEcrHeaders, pushEcrBaseUrl,
  allowPosSimulation, isProdLikeEnv, bridgeSharedSecret,
  bridgeChargeTimeoutMs, pushEcrDefaultTerminalId, MONEY_EPSILON,
  type AuthUser, type ApiError, type SaleLineInput, type SalePaymentLineInput,
  type CreateSaleBody, type PushEcrPurchaseResponse, toApiError, parseAuthClaims, runtimeEnv,
} from "./_shared";

const router: ExpressRouter = Router();
const LOCAL_BRIDGE_CARD_PROVIDERS = new Set(["ANDROID_PGW", "QPOSLANE", "GANTIGO", "IDPAY"]);

type CardAttemptResponseSource = {
  id: string;
  amount: unknown;
  terminalId: string;
  bridgeUrl: string | null;
  status: PosPaymentStatus;
  transactionId: string | null;
  message: string | null;
  providerPayload?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const parseLooseKeyValueText = (raw: string) => {
  const result: Record<string, unknown> = {};
  const pairPattern = /([A-Za-z][A-Za-z0-9_]*)\s*[:=]\s*("(?:\\.|[^"])*"|[^,}\r\n>]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(raw))) {
    result[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return result;
};

const extractAttemptEbarimt = (payload: unknown) => {
  if (!isRecord(payload)) return null;

  const candidates: Record<string, unknown>[] = [payload];
  for (const key of ["parsed", "ebarimt", "eBarimt", "ebarimtReceipt", "receipt", "taxReceipt", "checkTxn"]) {
    const nested = payload[key];
    if (isRecord(nested)) candidates.push(nested);
  }

  const raw = firstString(payload.raw, payload.rawText);
  if (raw) candidates.push(parseLooseKeyValueText(raw));

  for (const candidate of candidates) {
    const billId = firstString(
      candidate.ebarimtBillId,
      candidate.billId,
      candidate.bill_id,
      candidate.ebillId,
      candidate.ebarimt_id,
      candidate.ebarimtId,
    );
    const qrData = firstString(
      candidate.ebarimtQrData,
      candidate.qrData,
      candidate.qr_data,
      candidate.qrText,
      candidate.qr_text,
      candidate.qrCode,
      candidate.qr_code,
    );
    const lottery = firstString(
      candidate.ebarimtLottery,
      candidate.lottery,
      candidate.lotteryNo,
      candidate.lottery_no,
      candidate.luckyNo,
    );

    if (billId || qrData || lottery) {
      return {
        billId: billId || null,
        qrData: qrData || null,
        lottery: lottery || null,
        source: firstString(candidate.ebarimtSource, candidate.source) || "CARD_TERMINAL",
      };
    }
  }

  return null;
};

const toCardAttemptResponse = (attempt: CardAttemptResponseSource) => ({
  attemptId: attempt.id,
  amount: Number(attempt.amount),
  terminalId: attempt.terminalId,
  bridgeUrl: attempt.bridgeUrl,
  status: attempt.status,
  transactionId: attempt.transactionId || undefined,
  message: attempt.message || undefined,
  ebarimt: extractAttemptEbarimt(attempt.providerPayload),
  createdAt: attempt.createdAt.toISOString(),
  updatedAt: attempt.updatedAt.toISOString(),
});

async function getMinuAgentContextForRegister(registerId: string | null): Promise<MinuAgentContext | null> {
  if (!registerId) return null;

  const register = await prisma.posRegister.findUnique({
    where: { id: registerId },
    select: {
      organization: {
        select: {
          minuAgentEnabled: true,
          minuAgentUsername: true,
          minuAgentPassword: true,
          minuAgentBranchId: true,
        },
      },
    },
  });

  const org = register?.organization;
  if (!org?.minuAgentEnabled || !org.minuAgentUsername || !org.minuAgentPassword || !org.minuAgentBranchId) {
    return null;
  }

  return {
    username: org.minuAgentUsername,
    password: org.minuAgentPassword,
    branchId: org.minuAgentBranchId,
  };
}

router.post("/pos/payments/card/authorize", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const amount = Number(req.body?.amount || 0);
  const terminalId = String(req.body?.terminalId || "terminal-1");
  const bridgeUrl: string | null = req.body?.bridgeUrl || null;
  const registerId: string | null = req.body?.registerId || null;
  const bodyOrganizationId: string | null = req.body?.organizationId || null;
  const clientBridge = req.body?.clientBridge === true;

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "CARD amount буруу байна" });
  }

  // Detect cloud terminal providers early so we can skip local bridge validation
  let cardProviderType: string | null = null;
  let isPushEcr = false;
  let isMinuAgent = false;
  let isAndroidPgw = false;
  if (registerId) {
    const regForProvider = await prisma.posRegister.findUnique({
      where: { id: registerId },
      select: {
        cardProviderType: true,
        organization: { select: { minuAgentEnabled: true } },
      },
    });
    cardProviderType = regForProvider?.cardProviderType ?? null;
    isPushEcr = cardProviderType === "PUSH_ECR";
    isMinuAgent =
      cardProviderType === "MINU_AGENT" ||
      (!cardProviderType && regForProvider?.organization.minuAgentEnabled === true);
    isAndroidPgw = cardProviderType === "ANDROID_PGW";
  }
  const isLocalBridgeProvider = Boolean(
    cardProviderType && LOCAL_BRIDGE_CARD_PROVIDERS.has(cardProviderType)
  );

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

  if (!bridgeUrl && isLocalBridgeProvider) {
    return res.status(400).json({
      message: `${cardProviderType} terminalBridgeUrl тохируулаагүй байна. POS Register дээр Bridge URL оруулна уу.`,
    });
  }

  if (!bridgeUrl && !allowPosSimulation && !isPushEcr && !isMinuAgent) {
    return res.status(400).json({
      message:
        "Card simulation идэвхгүй байна. terminalBridgeUrl тохируулж bridge-р authorize хийнэ үү.",
    });
  }

  const usesLocalBridge = Boolean(bridgeUrl && !isPushEcr && !isMinuAgent);

  if (clientBridge && !isAndroidPgw) {
    return res.status(400).json({
      message: "clientBridge горим зөвхөн ANDROID_PGW terminal дээр дэмжигдэнэ",
    });
  }

  if (usesLocalBridge && isProdLikeEnv && !bridgeSharedSecret && !clientBridge) {
    return res.status(500).json({
      message: "POS bridge shared secret тохируулаагүй байна",
    });
  }

  try {
    let effectiveOrganizationId: string | null = null;
    let registerCardTerminalId: string | null = null;
    let minuAgentContext: MinuAgentContext | null = null;
    if (registerId) {
      const register = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: {
          id: true,
          organizationId: true,
          activationStatus: true,
          isActive: true,
          cardTerminalId: true,
          organization: {
            select: {
              minuAgentEnabled: true,
              minuAgentUsername: true,
              minuAgentPassword: true,
              minuAgentBranchId: true,
            },
          },
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

      if (isMinuAgent) {
        const org = register.organization;
        if (!org.minuAgentEnabled || !org.minuAgentUsername || !org.minuAgentPassword || !org.minuAgentBranchId) {
          return res.status(400).json({
            message: "Энэ байгууллагын Minu Agent merchant тохиргоо бүрэн биш байна",
          });
        }
        minuAgentContext = {
          username: org.minuAgentUsername,
          password: org.minuAgentPassword,
          branchId: org.minuAgentBranchId,
        };
      }
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
        bridgeUrl: usesLocalBridge ? bridgeUrl : null,
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

    if (usesLocalBridge && clientBridge) {
      await prisma.cardPaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          providerPayload: {
            provider: "ANDROID_PGW",
            mode: "client-bridge",
            terminalId,
          } as object,
        },
      });
    } else if (usesLocalBridge) {
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
            signal: AbortSignal.timeout(bridgeChargeTimeoutMs),
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
    } else if (isMinuAgent) {
      const effectiveTerminalId = terminalId !== "terminal-1" ? terminalId : (registerCardTerminalId || terminalId);
      const invoice = `MGL-${attempt.id.replace(/-/g, "").slice(0, 24).toUpperCase()}`;

      void (async () => {
        try {
          if (!effectiveTerminalId || effectiveTerminalId === "terminal-1") {
            throw new Error("Minu terminalId тохируулаагүй байна. POS Register дээр terminalId оруулна уу.");
          }

          const minuResult = await createMinuAgentInvoice({
            context: minuAgentContext!,
            terminalId: effectiveTerminalId,
            amount,
            invoice,
            purchaseType: "card",
          });

          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              terminalId: effectiveTerminalId,
              message: minuResult.message || "Minu terminal руу төлбөр илгээгдлээ",
              providerPayload: {
                provider: "MINU_AGENT",
                invoice,
                terminalId: effectiveTerminalId,
                branchId: minuAgentContext?.branchId || null,
                createInvoice: minuResult.raw,
              } as object,
            },
          });
        } catch (err) {
          await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PosPaymentStatus.FAILED,
              message: err instanceof Error ? err.message : "Minu Agent холболт амжилтгүй боллоо",
              providerPayload: {
                provider: "MINU_AGENT",
                invoice,
                terminalId: effectiveTerminalId,
                branchId: minuAgentContext?.branchId || null,
              } as object,
            },
          });
        }
      })();
    } else if (allowPosSimulation && !isPushEcr && !isMinuAgent && !isLocalBridgeProvider) {
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

    return res.status(201).json(toCardAttemptResponse(attempt));
  } catch (error) {
    console.error("card authorize error", error);
    return res.status(500).json({ message: "Card authorize хийхэд алдаа гарлаа" });
  }
});

router.post("/pos/payments/card/client-bridge-result", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const attemptId = String(req.body?.attemptId || "").trim();
  const result = req.body?.result;

  if (!attemptId || !result || typeof result !== "object" || Array.isArray(result)) {
    return res.status(400).json({ message: "attemptId болон terminal result шаардлагатай" });
  }

  try {
    const attempt = await prisma.cardPaymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return res.status(404).json({ message: "Card attempt олдсонгүй" });

    if (actor.role !== "ADMIN" && attempt.organizationId && !(await hasOrgMembership(actor.id, attempt.organizationId))) {
      return res.status(403).json({ message: "Өөр байгууллагын card attempt шинэчлэх боломжгүй" });
    }

    if (attempt.status !== PosPaymentStatus.PENDING) {
      return res.json(toCardAttemptResponse(attempt));
    }

    const bridgeData = result as Record<string, unknown>;
    const statusText = firstString(bridgeData.status, bridgeData.Status).toUpperCase();
    const newStatus = parseBridgeResultStatus(statusText);
    const transactionId = firstString(
      bridgeData.transactionId,
      bridgeData.rrn,
      bridgeData.RRN,
      bridgeData.invoice,
      bridgeData.traceNo,
    );
    const traceNo = firstString(bridgeData.traceno, bridgeData.traceNo, bridgeData.rrn, bridgeData.RRN);
    const message = firstString(bridgeData.message, bridgeData.desc, bridgeData.description);

    const updated = await prisma.cardPaymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: newStatus,
        transactionId: transactionId || null,
        traceno: traceNo || null,
        message: message || null,
        providerPayload: {
          ...bridgeData,
          mode: "client-bridge",
        } as object,
      },
    });

    return res.json(toCardAttemptResponse(updated));
  } catch (error) {
    console.error("client bridge result error", error);
    return res.status(500).json({ message: "Card terminal үр дүн хадгалахад алдаа гарлаа" });
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
    let freshAttempt = attempt;
    const payload = attempt.providerPayload as Record<string, unknown> | null;
    if (
      attempt.status === PosPaymentStatus.PENDING &&
      payload?.provider === "MINU_AGENT" &&
      typeof payload.invoice === "string"
    ) {
      try {
        const minuAgentContext = await getMinuAgentContextForRegister(attempt.registerId);
        if (!minuAgentContext) {
          throw new Error("Minu Agent merchant тохиргоо олдсонгүй");
        }
        const minuStatus = await checkMinuAgentTransaction(minuAgentContext, payload.invoice);
        if (minuStatus.approved) {
          freshAttempt = await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PosPaymentStatus.APPROVED,
              transactionId: minuStatus.transactionId || null,
              traceno: minuStatus.entity?.rrn || null,
              message: minuStatus.message || "Minu terminal payment approved",
              providerPayload: {
                ...payload,
                checkTxn: minuStatus.raw,
              } as object,
            },
          });
        } else if (!minuStatus.pending) {
          freshAttempt = await prisma.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: PosPaymentStatus.DECLINED,
              message: minuStatus.message || `Minu terminal status: ${minuStatus.status}`,
              providerPayload: {
                ...payload,
                checkTxn: minuStatus.raw,
              } as object,
            },
          });
        }
      } catch (err) {
        freshAttempt = await prisma.cardPaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            message: err instanceof Error ? err.message : "Minu status шалгахад алдаа гарлаа",
          },
        });
      }
    }

    return res.json({
      attemptId: freshAttempt.id,
      amount: Number(freshAttempt.amount),
      terminalId: freshAttempt.terminalId,
      bridgeUrl: freshAttempt.bridgeUrl,
      status: freshAttempt.status,
      transactionId: freshAttempt.transactionId,
      message: freshAttempt.message,
      createdAt: freshAttempt.createdAt.toISOString(),
      updatedAt: freshAttempt.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("card status error", error);
    return res.status(500).json({ message: "Card статус авахад алдаа гарлаа" });
  }
});


export default router;
