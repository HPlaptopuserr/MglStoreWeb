import { recordMerchantConfigurationChange } from "../../services/merchant-configuration-audit";
import { Router, type Router as ExpressRouter } from "express";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  connectVendorMerchant,
  disconnectVendorMerchant,
  getVendorMerchantStatus,
  normalizeMerchantChannel,
  recoverVendorSystemQrCredentials,
  registerVendorWithSystemQr,
  registerVendorWithQPay,
  saveVendorSystemQrCredentials,
} from "../../services/vendor-merchant.service";
import { getQPayCityList, getQPayDistrictList } from "../../services/qpay";
import {
  getSystemQrCategoryList,
  getSystemQrCityList,
  getSystemQrKhorooList,
} from "../../services/systemqr";
import { OrgRole, prisma } from "@mgl/database";
import { getMinuAgentToken } from "../../services/minu-pos-agent";
import {
  merchantMutationRequiresSettledQr,
} from "../../services/merchant-unsettled-invoice-policy";

import { parseMerchantBankAccounts, resolveBankAccountOwner, resolveBankAccountReader } from "../../services/merchant-bank-accounts";

import { parseMinuRegistration } from "../../services/minu-registration";

const router: ExpressRouter = Router();

function getRequestUserId(request: unknown): string {
  const req = request as { user?: { userId?: string; id?: string }; userId?: string };
  return req.user?.userId || req.user?.id || req.userId || "";
}

// Merchant routing and settlement are controlled by the active organization owner.
router.use('/vendor/merchant', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  return requireAuth(req, res, async () => {
    try {
      const actor = (req as unknown as { user: AuthPayload }).user;
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ success: false, message: 'Тохиргооны мэдээлэл буруу байна.' });
      }
      const organizationId = await resolveBankAccountOwner(actor.userId, req.body.organizationId ?? actor.organizationId);
      if (!organizationId) return res.status(403).json({ success: false, message: 'Төлбөрийн тохиргоог зөвхөн байгууллагын Owner өөрчилнө.' });
      req.body.organizationId = organizationId;
      // Replacing Dynamic QR credentials must not strand invoices awaiting
      // reconciliation. Minu Agent card-terminal settings are independent.
      if (merchantMutationRequiresSettledQr(req.path)) {
        const unsettled = await prisma.qPayInvoice.findFirst({
          where: { organizationId, consumedAt: null, status: { in: ['PENDING', 'PAID'] } },
          select: { id: true },
        });
        if (unsettled) return res.status(409).json({ success: false, message: 'Дуусаагүй QR төлбөр байна. Merchant холболт солихын өмнө төлбөрөө дуусгах эсвэл цуцална уу.' });
      }
      return next();
    } catch (error: unknown) {
      console.error('merchant owner access error', error);
      return res.status(500).json({ success: false, message: 'Төлбөрийн тохиргооны эрх шалгахад алдаа гарлаа.' });
    }
  });
});

function minuConnectErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (/column.*minuAgent|minuAgent.*does not exist|unknown arg.*minuAgent/i.test(message)) {
    return "Minu Agent database migration ороогүй байна. API database migrate хийсний дараа дахин холбоно уу.";
  }

  if (/login|credential|password|unauthorized|401|403|invalid/i.test(message)) {
    return "Minu username эсвэл password буруу байна, эсвэл Agent эрх идэвхгүй байна.";
  }

  if (/fetch failed|timeout|ECONN|ENOTFOUND|Minu API HTTP/i.test(message)) {
    return `Minu API холбогдохгүй байна: ${message}`;
  }

  return message || "Minu Agent холбоход алдаа гарлаа";
}

async function resolveOrganizationId(userId: string, explicitOrgId?: string): Promise<string | null> {
  if (explicitOrgId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: explicitOrgId },
      select: { organizationId: true },
    });
    return member?.organizationId || null;
  }
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  return member?.organizationId || null;
}

async function resolveOwnedOrganizationId(
  userId: string,
  explicitOrgId?: string,
): Promise<string | null> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      ...(explicitOrgId ? { organizationId: explicitOrgId } : {}),
      role: OrgRole.OWNER,
      isActive: true,
      deletedAt: null,
    },
    select: { organizationId: true },
  });
  return member?.organizationId || null;
}

/**
 * GET /api/vendor/merchant/status
 * Get merchant connection status for current vendor
 */
router.get("/vendor/merchant/status", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const explicitOrgId = req.query.organizationId as string | undefined;
    const channel = normalizeMerchantChannel(req.query.channel as string | undefined);
    const organizationId = await resolveOrganizationId(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(404).json({ success: false, error: "Байгууллага олдсонгүй" });
    }

    const status = await getVendorMerchantStatus(organizationId, channel);
    return res.json(status);
  } catch (error) {
    console.error("merchant status error", error);
    return res.status(500).json({
      success: false,
      error: "Серверийн алдаа",
    });
  }
});

/**
 * GET /api/vendor/merchant/minu/status
 * Get Minu Agent merchant connection status for current vendor.
 */
router.get("/vendor/merchant/minu/status", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const explicitOrgId = req.query.organizationId as string | undefined;
    const organizationId = await resolveOrganizationId(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(404).json({ success: false, error: "Байгууллага олдсонгүй" });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        minuAgentEnabled: true,
        minuAgentUsername: true,
        minuAgentPassword: true,
        minuAgentBranchId: true,
        minuAgentConnectedAt: true,
      },
    });

    return res.json({
      success: true,
      isConnected: !!(org?.minuAgentEnabled && org.minuAgentUsername && org.minuAgentPassword && org.minuAgentBranchId),
      username: org?.minuAgentUsername || null,
      branchId: org?.minuAgentBranchId || null,
      passwordSet: !!org?.minuAgentPassword,
      connectedAt: org?.minuAgentConnectedAt?.toISOString() || null,
      orgName: org?.name || "",
    });
  } catch (error) {
    console.error("minu merchant status error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/merchant/minu/connect
 * Store vendor's own Minu Agent merchant credentials.
 */
router.post("/vendor/merchant/minu/connect", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { username, password, branchId, organizationId: explicitOrgId } = req.body as {
      username?: string;
      password?: string;
      branchId?: string;
      organizationId?: string;
    };

    const organizationId = await resolveOrganizationId(userId, explicitOrgId);
    if (!organizationId) {
      return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });
    }

    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { minuAgentPassword: true },
    });

    const nextUsername = String(username || "").trim();
    const nextPassword = String(password || existing?.minuAgentPassword || "").trim();
    const nextBranchId = String(branchId || "").trim();

    if (!nextUsername || !nextPassword || !nextBranchId) {
      return res.status(400).json({
        success: false,
        message: "Minu username, password, branchId шаардлагатай",
      });
    }

    try {
      await getMinuAgentToken({
        username: nextUsername,
        password: nextPassword,
        branchId: nextBranchId,
      });
    } catch (error) {
      console.error("minu agent login verify error", error);
      return res.status(400).json({
        success: false,
        message: minuConnectErrorMessage(error),
      });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        minuAgentEnabled: true,
        minuAgentUsername: nextUsername,
        ...(String(password || "").trim() ? { minuAgentPassword: nextPassword } : {}),
        minuAgentBranchId: nextBranchId,
        minuAgentConnectedAt: new Date(),
      },
    });

    return res.json({ success: true, message: "Minu Agent merchant амжилттай холбогдлоо" });
  } catch (error) {
    console.error("minu merchant connect error", error);
    return res.status(500).json({ success: false, message: minuConnectErrorMessage(error) });
  }
});

/**
 * POST /api/vendor/merchant/minu/disconnect
 */
router.post("/vendor/merchant/minu/disconnect", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const explicitOrgId = req.body?.organizationId as string | undefined;
    const organizationId = await resolveOrganizationId(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        minuAgentEnabled: false,
        minuAgentUsername: null,
        minuAgentPassword: null,
        minuAgentBranchId: null,
        minuAgentConnectedAt: null,
      },
    });

    return res.json({ success: true, message: "Minu Agent merchant салгагдлаа" });
  } catch (error) {
    console.error("minu merchant disconnect error", error);
    return res.status(500).json({ success: false, message: "Minu Agent салгахад алдаа гарлаа" });
  }
});

/**
 * POST /api/vendor/merchant/connect
 * Connect vendor to QPay multi-merchant account
 * Body: { merchantId: string, merchantKey: string }
 */
router.post("/vendor/merchant/connect", requireAuth, async (req, res) => {
  try {
    const actor = (req as unknown as { user: AuthPayload }).user;
    const userId = actor.userId;
    const { merchantId, merchantKey, invoiceCode, organizationId: explicitOrgId } = req.body;
    const channel = normalizeMerchantChannel(req.body?.channel);

    if (typeof merchantId !== "string" || !merchantId.trim() || typeof merchantKey !== "string" || !merchantKey.trim() || (invoiceCode !== undefined && typeof invoiceCode !== "string")) {
      return res.status(400).json({
        success: false,
        message: "Мерчант ID ба key шаардлагатай",
      });
    }

    const organizationId = await resolveBankAccountOwner(userId, explicitOrgId ?? actor.organizationId);
    if (!organizationId) {
      return res.status(403).json({ success: false, message: "Тухайн байгууллагын Owner эрх шаардлагатай." });
    }

    // Connect merchant
    const result = await connectVendorMerchant(
      organizationId,
      merchantId,
      merchantKey,
      invoiceCode,
      channel,
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    await recordMerchantConfigurationChange(userId, organizationId, channel, "CONNECTED");
    return res.json(result);
  } catch (error) {
    console.error("merchant connect error", error);
    return res.status(500).json({
      success: false,
      message: "Мерчант холбохэд алдаа гарлаа",
    });
  }
});

/**
 * POST /api/vendor/merchant/disconnect
 * Disconnect vendor from multi-merchant account
 */
router.post("/vendor/merchant/disconnect", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const explicitOrgId = req.body?.organizationId as string | undefined;
    const channel = normalizeMerchantChannel(req.body?.channel);
    const organizationId = await resolveBankAccountOwner(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(403).json({ success: false, message: "Тухайн байгууллагын Owner эрх шаардлагатай." });
    }

    // Disconnect merchant
    const result = await disconnectVendorMerchant(organizationId, channel);

    if (!result.success) {
      return res.status(400).json(result);
    }

    await recordMerchantConfigurationChange(userId, organizationId, channel, "DISCONNECTED");
    return res.json(result);
  } catch (error) {
    console.error("merchant disconnect error", error);
    return res.status(500).json({
      success: false,
      message: "Мерчант салгахэд алдаа гарлаа",
    });
  }
});

/**
 * POST /api/vendor/merchant/systemqr/recover-credentials
 * Explicitly reset and persist credentials for the currently connected
 * SystemQR submerchant. This is intentionally never called automatically.
 */
router.post(
  "/vendor/merchant/systemqr/recover-credentials",
  requireAuth,
  async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const explicitOrgId = req.body?.organizationId as string | undefined;
      const channel = normalizeMerchantChannel(req.body?.channel);
      const organizationId = await resolveOwnedOrganizationId(
        userId,
        explicitOrgId,
      );

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Тухайн байгууллагын OWNER эрх шаардлагатай.",
        });
      }

      const result = await recoverVendorSystemQrCredentials(
        organizationId,
        channel,
      );
      if (!result.success) return res.status(400).json(result);

      await recordMerchantConfigurationChange(userId, organizationId, channel, "CREDENTIALS_RECOVERED");
      return res.json({
        success: true,
        message: result.message,
        merchantId: result.merchantId,
      });
    } catch (error) {
      console.error("SystemQR credential recovery error", error);
      return res.status(500).json({
        success: false,
        message: "Minu Dynamic QR нэвтрэх эрх сэргээхэд серверийн алдаа гарлаа.",
      });
    }
  },
);

/**
 * POST /api/vendor/merchant/systemqr/credentials
 * Validate Minu credentials and save them for the connected merchant.
 */
router.post(
  "/vendor/merchant/systemqr/credentials",
  requireAuth,
  async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const explicitOrgId = req.body?.organizationId as string | undefined;
      const channel = normalizeMerchantChannel(req.body?.channel);
      const organizationId = await resolveOwnedOrganizationId(
        userId,
        explicitOrgId,
      );
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: "Тухайн байгууллагын OWNER эрх шаардлагатай.",
        });
      }

      const result = await saveVendorSystemQrCredentials(
        organizationId,
        String(req.body?.username || ""),
        String(req.body?.password || ""),
        channel,
      );
      if (!result.success) return res.status(400).json(result);
      await recordMerchantConfigurationChange(userId, organizationId, channel, "CREDENTIALS_UPDATED");
      return res.json(result);
    } catch (error) {
      console.error("SystemQR credential save error", error);
      return res.status(500).json({
        success: false,
        message: "Minu credential хадгалахад серверийн алдаа гарлаа.",
      });
    }
  },
);

/**
 * POST /api/vendor/merchant/register
 * Register vendor as a new merchant.
 * Body: { type: "company"|"person", ...fields, bank_accounts: [...] }
 */
router.post("/vendor/merchant/register", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { type, provider, channel: _channel, organizationId: explicitOrgId, ...rest } = req.body;
    const channel = normalizeMerchantChannel(_channel);

    if (!type || (type !== "company" && type !== "person")) {
      return res.status(400).json({ success: false, message: "type: 'company' эсвэл 'person' байх ёстой" });
    }

    const organizationId = await resolveBankAccountOwner(userId, explicitOrgId);
    if (!organizationId) {
      return res.status(403).json({ success: false, message: "Тухайн байгууллагын Owner эрх шаардлагатай." });
    }

    const isSystemQrRegister =
      provider === "systemqr" ||
      Boolean(rest.merchantName && rest.accountNumber && rest.cityId && rest.districtId);

    const minuRegistration = isSystemQrRegister ? parseMinuRegistration(rest, type) : null;
    if (isSystemQrRegister && !minuRegistration) {
      return res.status(400).json({ success: false, message: "Minu бүртгэлийн мэдээлэл буруу байна. Үндсэн данс, эзэмшигч, байршлын мэдээллээ шалгана уу." });
    }
    const result =
      minuRegistration
        ? await registerVendorWithSystemQr(organizationId, minuRegistration, channel)
        : await registerVendorWithQPay(organizationId, { type, ...rest } as any, channel);

    if (!result.success) {
      return res.status(400).json(result);
    }

    await recordMerchantConfigurationChange(userId, organizationId, channel, "REGISTERED");
    return res.json(result);
  } catch (error) {
    console.error("merchant register error", error);
    return res.status(500).json({ success: false, message: "QR merchant бүртгэхэд алдаа гарлаа" });
  }
});

router.get("/vendor/merchant/systemqr/cities", requireAuth, async (_req, res) => {
  try {
    const cities = await getSystemQrCityList();
    return res.json({ cities });
  } catch (error) {
    console.error("systemqr cities error", error);
    return res.status(502).json({ cities: [], message: "Minu Dynamic QR байршлын мэдээлэл авч чадсангүй. API нэвтрэх тохиргоог шалгана уу." });
  }
});

router.get("/vendor/merchant/systemqr/khoroo/:districtId", requireAuth, async (req, res) => {
  try {
    const khoroos = await getSystemQrKhorooList(req.params.districtId);
    return res.json({ khoroos });
  } catch (error) {
    console.error("systemqr khoroo error", error);
    return res.status(502).json({ khoroos: [], message: "Minu Dynamic QR хорооны мэдээлэл авч чадсангүй." });
  }
});

router.get("/vendor/merchant/systemqr/categories", requireAuth, async (_req, res) => {
  try {
    const categories = await getSystemQrCategoryList();
    return res.json({ categories });
  } catch (error) {
    console.error("systemqr categories error", error);
    return res.status(502).json({ categories: [], message: "Minu Dynamic QR ангиллын мэдээлэл авч чадсангүй. API нэвтрэх тохиргоог шалгана уу." });
  }
});

/**
 * PUT /api/vendor/merchant/bank-accounts
 * Update bank accounts for connected merchant
 */
router.put("/vendor/merchant/bank-accounts", requireAuth, async (req, res) => {
  try {
    const actor = (req as unknown as { user: AuthPayload }).user;
    const userId = actor.userId;
    const { bank_accounts, organizationId: explicitOrgId } = req.body;
    const channel = normalizeMerchantChannel(req.body?.channel);

    const accounts = parseMerchantBankAccounts(bank_accounts);
    if (!accounts) return res.status(400).json({ success: false, message: "Дансны мэдээлэл буруу байна. Давхардахгүй дансууд, нэг үндсэн данс сонгоно уу." });
    const organizationId = await resolveBankAccountOwner(userId, explicitOrgId ?? actor.organizationId);
    if (!organizationId) return res.status(403).json({ success: false, message: "Дансыг зөвхөн сонгосон байгууллагын Owner өөрчилнө." });

    const merchantStatus = await getVendorMerchantStatus(organizationId, channel);
    if (!merchantStatus.success) return res.status(409).json({ success: false, message: 'Merchant тохиргоог уншиж чадсангүй.' });
    if (merchantStatus.settlementMode === 'PROVIDER') return res.status(409).json({ success: false, message: 'Энэ merchant-ийн хүлээн авах дансыг QR үйлчилгээний гэрээний тохиргооноос өөрчилнө. Дансны дугаар хадгалах нь гэрээний дансыг өөрчлөхгүй.' });
    await prisma.organization.update({
      where: { id: organizationId },
      data: channel === "WEB"
        ? { webQpayBankAccounts: accounts.map((account) => ({ ...account })) }
        : { qpayBankAccounts: accounts.map((account) => ({ ...account })) },
    });

    await recordMerchantConfigurationChange(userId, organizationId, channel, "BANK_ACCOUNTS_UPDATED");
    return res.json({ success: true, message: "Банкны данс амжилттай хадгалагдлаа" });
  } catch (error) {
    console.error("bank-accounts update error", error);
    return res.status(500).json({ success: false, message: "Данс хадгалахад алдаа гарлаа" });
  }
});

/**
 * GET /api/vendor/merchant/bank-accounts
 * Get saved bank accounts for connected merchant
 */
router.get("/vendor/merchant/bank-accounts", requireAuth, async (req, res) => {
  try {
    const actor = (req as unknown as { user: AuthPayload }).user;
    const userId = actor.userId;
    const explicitOrgId = req.query.organizationId as string | undefined;
    const channel = normalizeMerchantChannel(req.query.channel as string | undefined);
    const member = await resolveBankAccountReader(userId, explicitOrgId ?? actor.organizationId);

    if (!member) {
      return res.status(403).json({ success: false, error: "Дансны мэдээлэл харах эрхгүй байна." });
    }

    const org = await prisma.organization.findUnique({
      where: { id: member.organizationId },
      select: { qpayBankAccounts: true, webQpayBankAccounts: true },
    });

    if (!org) return res.status(404).json({ success: false, error: "Байгууллага олдсонгүй" });

    return res.json({
      success: true,
      canEdit: member.role === "OWNER",
      bank_accounts: channel === "WEB" ? org.webQpayBankAccounts || [] : org.qpayBankAccounts || [],
    });
  } catch (error) {
    console.error("bank-accounts get error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

/**
 * GET /api/vendor/merchant/cities
 * Returns QPay city/aimag list for registration form
 */
router.get("/vendor/merchant/cities", requireAuth, async (_req, res) => {
  try {
    const cities = await getQPayCityList();
    return res.json({ cities });
  } catch {
    return res.json({ cities: [] });
  }
});

/**
 * GET /api/vendor/merchant/districts/:cityCode
 * Returns QPay district list for a given city
 */
router.get("/vendor/merchant/districts/:cityCode", requireAuth, async (req, res) => {
  try {
    const { cityCode } = req.params;
    const districts = await getQPayDistrictList(cityCode);
    return res.json({ districts });
  } catch {
    return res.json({ districts: [] });
  }
});

/**
 * GET /api/vendor/merchant/recover/:registerNumber
 * Try to recover merchant credentials from QPay QuickQR by register number.
 * Returns { success, merchantId, merchantKey } if found, then auto-connects.
 */
router.get("/vendor/merchant/recover/:registerNumber", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { registerNumber } = req.params;
    const explicitOrgId = req.query.organizationId as string | undefined;
    const channel = normalizeMerchantChannel(req.query.channel as string | undefined);
    const organizationId = await resolveBankAccountOwner(userId, explicitOrgId);

    if (!organizationId) {
      return res.status(403).json({ success: false, message: "Тухайн байгууллагын Owner эрх шаардлагатай." });
    }

    // Try QPay QuickQR merchant lookup by register number
    const quickqrBaseUrl = process.env.QPAY_QUICKQR_BASE_URL || "";
    const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
    const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();

    if (!quickqrBaseUrl || !masterUsername || !masterPassword) {
      return res.status(503).json({ success: false, message: "QPay тохиргоо дутуу байна" });
    }

    // Get master token
    const credentials = Buffer.from(`${masterUsername}:${masterPassword}`).toString("base64");
    const terminalId = (process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername).trim();
    const tokenRes = await fetch(`${quickqrBaseUrl}/auth/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify({ terminal_id: terminalId }),
    });

    if (!tokenRes.ok) {
      return res.status(502).json({ success: false, message: "QPay auth алдаа гарлаа" });
    }

    const { access_token } = await tokenRes.json() as { access_token: string };

    // Search merchant list for matching register number
    const listRes = await fetch(`${quickqrBaseUrl}/merchant/list`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ offset: { page_number: 1, page_limit: 100 } }),
    });

    if (!listRes.ok) {
      return res.status(404).json({
        success: false,
        message: "QPay мерчант жагсаалт авахэд алдаа гарлаа. QPay-тай шууд холбоо бариарай.",
      });
    }

    const listData = await listRes.json() as Record<string, unknown>;

    const rows = (listData.rows || listData.merchants || listData.data || listData) as Record<string, unknown>[];
    if (!Array.isArray(rows)) {
      return res.status(404).json({ success: false, message: "Мерчант жагсаалт олдсонгүй" });
    }

    const match = rows.find((m) => {
      const reg = String(m.register_number || m.register_no || m.register || "").toLowerCase();
      return reg === registerNumber.toLowerCase();
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: `"${registerNumber}" регистрийн дугааратай мерчант QPay системд олдсонгүй.`,
      });
    }

    const merchantId = String(match.merchant_id || match.id || match.username || "");
    const merchantKey = String(match.merchant_key || match.password || match.secret || "");


    if (!merchantId) {
      return res.status(404).json({ success: false, message: "Мерчант ID олдсонгүй — QPay-тай холбоо барина уу" });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: channel === "WEB"
        ? {
            webQpayMerchantId: merchantId,
            webQpayMerchantKey: merchantKey || null,
            webQpayEnabled: true,
            webQpayConnectedAt: new Date(),
          }
        : {
            qpayMerchantId: merchantId,
            qpayMerchantKey: merchantKey || null,
            qpayEnabled: true,
            qpayConnectedAt: new Date(),
          },
    });

    await recordMerchantConfigurationChange(userId, organizationId, channel, "CREDENTIALS_RECOVERED");
    return res.json({ success: true, merchantId, message: "Мерчант мэдээлэл олдоод амжилттай холбогдлоо" });
  } catch (error) {
    console.error("merchant recover error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

export default router;
