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
const BRIDGE_CARD_PROVIDERS = new Set(["ANDROID_PGW", "QPOSLANE", "GANTIGO", "IDPAY"]);
const isBridgeCardProvider = (provider: string | null | undefined) =>
  Boolean(provider && BRIDGE_CARD_PROVIDERS.has(provider));
const isTerminalIdOptionalProvider = (provider: string | null | undefined) => provider === "ANDROID_PGW";
const normalizeNullableString = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};
const normalizeCardTerminalId = (provider: string | null | undefined, value: unknown) =>
  isTerminalIdOptionalProvider(provider) ? null : normalizeNullableString(value);

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
        organization: {
          select: {
            minuAgentEnabled: true,
            minuAgentUsername: true,
            minuAgentBranchId: true,
          },
        },
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

    // Merge org-level QPay availability so frontend shows accurate status
    const org = await prisma.organization.findUnique({
      where: { id: register.organizationId },
      select: { qpayEnabled: true },
    });
    const effectiveQpayEnabled = register.qpayEnabled || (org?.qpayEnabled ?? false);

    const { organization, ...safeRegister } = register;
    return res.json({
      ...safeRegister,
      effectiveQpayEnabled,
      minuAgentEnabled: organization.minuAgentEnabled,
      minuAgentUsername: organization.minuAgentUsername,
      minuAgentBranchId: organization.minuAgentBranchId,
    });
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

    // Inherit org-level QPay config so vendor doesn't need admin to re-enable it
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { qpayEnabled: true, qpayMerchantId: true },
    });

    const created = await prisma.posRegister.create({
      data: {
        organizationId,
        branchId,
        name,
        isActive: false,
        activationStatus: PosActivationStatus.PENDING,
        qpayEnabled: org?.qpayEnabled ?? false,
        qpayMerchantId: org?.qpayMerchantId ?? null,
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
 * Vendor — list own org's approved POS registers
 * GET /pos/registers/mine
 * Returns all APPROVED+active registers for the authenticated vendor's org.
 * ─────────────────────────────────────────────────────────────────────── */
router.get("/pos/registers/mine", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;

  const organizationId = actor.organizationId;
  if (!organizationId) {
    return res.status(400).json({ message: "Байгууллагатай холбоогүй хэрэглэгч" });
  }

  try {
    const registers = await prisma.posRegister.findMany({
      where: {
        organizationId,
        isActive: true,
        activationStatus: PosActivationStatus.APPROVED,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        label: true,
        branchId: true,
        organizationId: true,
        cardEnabled: true,
        cardProviderType: true,
        cardTerminalId: true,
        terminalBridgeUrl: true,
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayTerminalId: true,
        isActive: true,
        activationStatus: true,
        branch: { select: { id: true, name: true } },
        organization: {
          select: {
            minuAgentEnabled: true,
            minuAgentUsername: true,
            minuAgentPassword: true,
            minuAgentBranchId: true,
            minuAgentConnectedAt: true,
          },
        },
      },
    });
    return res.json(registers.map(({ organization, ...register }) => ({
      ...register,
      minuAgentEnabled: organization.minuAgentEnabled,
      minuAgentUsername: organization.minuAgentUsername,
      minuAgentBranchId: organization.minuAgentBranchId,
      minuAgentConnectedAt: organization.minuAgentConnectedAt,
      minuAgentPasswordSet: !!organization.minuAgentPassword,
    })));
  } catch (error) {
    console.error("list own registers error", error);
    return res.status(500).json({ message: "POS жагсаалт авахад алдаа гарлаа" });
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
      include: {
        branch: { select: { id: true, name: true } },
        organization: {
          select: {
            minuAgentEnabled: true,
            minuAgentUsername: true,
            minuAgentPassword: true,
            minuAgentBranchId: true,
            minuAgentConnectedAt: true,
          },
        },
      },
    });
    return res.json(registers.map(({ organization, ...register }) => ({
      ...register,
      minuAgentEnabled: organization.minuAgentEnabled,
      minuAgentUsername: organization.minuAgentUsername,
      minuAgentBranchId: organization.minuAgentBranchId,
      minuAgentConnectedAt: organization.minuAgentConnectedAt,
      minuAgentPasswordSet: !!organization.minuAgentPassword,
    })));
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
    minuAgentUsername,
    minuAgentPassword,
    minuAgentBranchId,
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
    minuAgentUsername?: string;
    minuAgentPassword?: string;
    minuAgentBranchId?: string;
  };

  const normalizedName = normalizeRegisterName(name);
  const normalizedCardProviderType = normalizeNullableString(cardProviderType);
  const normalizedCardTerminalId = normalizeCardTerminalId(normalizedCardProviderType, cardTerminalId);
  const normalizedTerminalBridgeUrl = normalizeNullableString(terminalBridgeUrl);
  const normalizedQpayMerchantId = normalizeNullableString(qpayMerchantId);
  const normalizedQpayTerminalId = normalizeNullableString(qpayTerminalId);

  if (!organizationId || !branchId || !normalizedName) {
    return res.status(400).json({ message: "organizationId, branchId, name шаардлагатай" });
  }

  // Validate terminalBridgeUrl if provided
  if (normalizedTerminalBridgeUrl) {
    try {
      const parsed = new URL(normalizedTerminalBridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
    }
  }

  if (cardEnabled === true && !normalizedCardProviderType) {
    return res.status(400).json({ message: "cardEnabled=true үед cardProviderType шаардлагатай" });
  }

  if (cardEnabled === true && !isTerminalIdOptionalProvider(normalizedCardProviderType) && !normalizedCardTerminalId) {
    return res.status(400).json({ message: "cardEnabled=true үед cardTerminalId шаардлагатай" });
  }

  if (cardEnabled === true && isBridgeCardProvider(normalizedCardProviderType) && !normalizedTerminalBridgeUrl) {
    return res.status(400).json({ message: "Bridge provider үед terminalBridgeUrl шаардлагатай" });
  }

  if (cardEnabled === false && (normalizedCardProviderType || normalizedCardTerminalId || normalizedTerminalBridgeUrl)) {
    return res.status(400).json({
      message: "cardEnabled=false үед cardProviderType, cardTerminalId, terminalBridgeUrl хоосон байх ёстой",
    });
  }

  if (qpayEnabled === true && (!normalizedQpayMerchantId || !normalizedQpayTerminalId)) {
    return res.status(400).json({ message: "qpayEnabled=true үед qpayMerchantId, qpayTerminalId шаардлагатай" });
  }

  if (qpayEnabled === false && (normalizedQpayMerchantId || normalizedQpayTerminalId)) {
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

    const hasMinuCredentialInput = [minuAgentUsername, minuAgentPassword, minuAgentBranchId].some((value) =>
      String(value || "").trim(),
    );
    let nextMinuUsername = "";
    let nextMinuPassword = "";
    let nextMinuBranchId = "";
    let shouldUpdateMinuAgentConfig = false;
    if (cardEnabled === true && normalizedCardProviderType === "MINU_AGENT") {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          minuAgentEnabled: true,
          minuAgentUsername: true,
          minuAgentPassword: true,
          minuAgentBranchId: true,
        },
      });
      nextMinuUsername = String(minuAgentUsername ?? org?.minuAgentUsername ?? "").trim();
      nextMinuPassword = String(minuAgentPassword || org?.minuAgentPassword || "").trim();
      nextMinuBranchId = String(minuAgentBranchId ?? org?.minuAgentBranchId ?? "").trim();
      if (!nextMinuUsername || !nextMinuPassword || !nextMinuBranchId) {
        return res.status(400).json({
          message: "MINU_AGENT үед Minu username, password, branchId шаардлагатай. Vendor profile эсвэл энэ POS form дээр Minu merchant тохиргоог бүрэн оруулна уу.",
        });
      }
      shouldUpdateMinuAgentConfig = hasMinuCredentialInput || org?.minuAgentEnabled !== true;
    }

    const register = await prisma.posRegister.create({
      data: {
        organizationId,
        branchId,
        name: normalizedName,
        label: label ? String(label).trim() : null,
        cardEnabled: Boolean(cardEnabled),
        cardProviderType: normalizedCardProviderType,
        cardTerminalId: normalizedCardTerminalId,
        terminalBridgeUrl: normalizedTerminalBridgeUrl,
        qpayEnabled: Boolean(qpayEnabled),
        qpayMerchantId: normalizedQpayMerchantId,
        qpayTerminalId: normalizedQpayTerminalId,
        // Admin-created registers are immediately active and approved
        isActive: true,
        activationStatus: PosActivationStatus.APPROVED,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    if (cardEnabled === true && normalizedCardProviderType === "MINU_AGENT" && shouldUpdateMinuAgentConfig) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          minuAgentEnabled: true,
          minuAgentUsername: nextMinuUsername,
          minuAgentPassword: nextMinuPassword,
          minuAgentBranchId: nextMinuBranchId,
          minuAgentConnectedAt: new Date(),
        },
      });
    }

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
    minuAgentUsername,
    minuAgentPassword,
    minuAgentBranchId,
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
    minuAgentUsername?: string;
    minuAgentPassword?: string;
    minuAgentBranchId?: string;
    isActive?: boolean;
  };

  const normalizedInputTerminalBridgeUrl =
    terminalBridgeUrl !== undefined ? normalizeNullableString(terminalBridgeUrl) : undefined;

  if (normalizedInputTerminalBridgeUrl) {
    try {
      const parsed = new URL(normalizedInputTerminalBridgeUrl);
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
    const normalizedInputCardProviderType =
      cardProviderType !== undefined ? normalizeNullableString(cardProviderType) : undefined;
    const normalizedInputCardTerminalId =
      cardTerminalId !== undefined ? normalizeNullableString(cardTerminalId) : undefined;
    const nextCardProviderType =
      nextCardEnabled === false
        ? null
        : normalizedInputCardProviderType !== undefined
          ? normalizedInputCardProviderType
          : existing.cardProviderType;
    const nextCardTerminalId =
      nextCardEnabled === false || isTerminalIdOptionalProvider(nextCardProviderType)
        ? null
        : normalizedInputCardTerminalId !== undefined
          ? normalizedInputCardTerminalId
          : existing.cardTerminalId;
    const nextTerminalBridgeUrl =
      nextCardEnabled === false
        ? null
        : normalizedInputTerminalBridgeUrl !== undefined
          ? normalizedInputTerminalBridgeUrl
          : existing.terminalBridgeUrl;

    if (nextCardEnabled && !nextCardProviderType) {
      return res.status(400).json({ message: "Card идэвхтэй үед provider заавал байна" });
    }

    if (nextCardEnabled && !isTerminalIdOptionalProvider(nextCardProviderType) && !nextCardTerminalId) {
      return res.status(400).json({ message: "Card идэвхтэй үед terminal заавал байна" });
    }

    if (nextCardEnabled && isBridgeCardProvider(nextCardProviderType) && !nextTerminalBridgeUrl) {
      return res.status(400).json({ message: "Bridge provider үед terminalBridgeUrl заавал байна" });
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

    const hasMinuCredentialInput = [minuAgentUsername, minuAgentPassword, minuAgentBranchId].some((value) =>
      String(value || "").trim(),
    );
    let nextMinuUsername = "";
    let nextMinuPassword = "";
    let nextMinuBranchId = "";
    let shouldUpdateMinuAgentConfig = false;
    if (nextCardEnabled && nextCardProviderType === "MINU_AGENT") {
      const org = await prisma.organization.findUnique({
        where: { id: existing.organizationId },
        select: {
          minuAgentEnabled: true,
          minuAgentUsername: true,
          minuAgentPassword: true,
          minuAgentBranchId: true,
        },
      });
      nextMinuUsername = String(minuAgentUsername ?? org?.minuAgentUsername ?? "").trim();
      nextMinuPassword = String(minuAgentPassword || org?.minuAgentPassword || "").trim();
      nextMinuBranchId = String(minuAgentBranchId ?? org?.minuAgentBranchId ?? "").trim();
      if (!nextMinuUsername || !nextMinuPassword || !nextMinuBranchId) {
        return res.status(400).json({
          message: "MINU_AGENT үед Minu username, password, branchId шаардлагатай. Vendor profile эсвэл энэ POS form дээр Minu merchant тохиргоог бүрэн оруулна уу.",
        });
      }
      shouldUpdateMinuAgentConfig = hasMinuCredentialInput || org?.minuAgentEnabled !== true;
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

    if (nextCardEnabled && nextCardProviderType === "MINU_AGENT" && shouldUpdateMinuAgentConfig) {
      await prisma.organization.update({
        where: { id: existing.organizationId },
        data: {
          minuAgentEnabled: true,
          minuAgentUsername: nextMinuUsername,
          ...(String(minuAgentPassword || "").trim()
            ? { minuAgentPassword: String(minuAgentPassword).trim() }
            : {}),
          minuAgentBranchId: nextMinuBranchId,
          minuAgentConnectedAt: new Date(),
        },
      });
    }

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
