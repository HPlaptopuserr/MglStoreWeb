import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  connectVendorMerchant,
  disconnectVendorMerchant,
  getVendorMerchantStatus,
  registerVendorWithQPay,
} from "../../services/vendor-merchant.service";
import { getQPayCityList, getQPayDistrictList } from "../../services/qpay";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

/**
 * GET /api/vendor/merchant/status
 * Get merchant connection status for current vendor
 */
router.get("/vendor/merchant/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;

    // Get user's organization
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: "Байгууллага олдсонгүй",
      });
    }

    const status = await getVendorMerchantStatus(member.organizationId);
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
 * POST /api/vendor/merchant/connect
 * Connect vendor to QPay multi-merchant account
 * Body: { merchantId: string, merchantKey: string }
 */
router.post("/vendor/merchant/connect", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { merchantId, merchantKey, invoiceCode } = req.body;

    if (!merchantId || !merchantKey) {
      return res.status(400).json({
        success: false,
        message: "Мерчант ID ба key шаардлагатай",
      });
    }

    // Get user's organization
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Байгууллага олдсонгүй",
      });
    }

    // Connect merchant
    const result = await connectVendorMerchant(
      member.organizationId,
      merchantId,
      merchantKey,
      invoiceCode,
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

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
    const userId = (req as any).userId as string;

    // Get user's organization
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Байгууллага олдсонгүй",
      });
    }

    // Disconnect merchant
    const result = await disconnectVendorMerchant(member.organizationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

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
 * POST /api/vendor/merchant/register
 * Register vendor as a new QPay QuickQR merchant.
 * Body: { type: "company"|"person", ...fields, bank_accounts: [...] }
 */
router.post("/vendor/merchant/register", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { type, ...rest } = req.body;

    if (!type || (type !== "company" && type !== "person")) {
      return res.status(400).json({ success: false, message: "type: 'company' эсвэл 'person' байх ёстой" });
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });
    }

    const result = await registerVendorWithQPay(member.organizationId, { type, ...rest } as any);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("merchant register error", error);
    return res.status(500).json({ success: false, message: "QPay бүртгэхэд алдаа гарлаа" });
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
    const userId = (req as any).userId as string;
    const { registerNumber } = req.params;

    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    if (!member) {
      return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });
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

    // Try QPay merchant lookup endpoint
    const lookupRes = await fetch(`${quickqrBaseUrl}/merchant/${encodeURIComponent(registerNumber)}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!lookupRes.ok) {
      // Try alternative search endpoint
      const searchRes = await fetch(`${quickqrBaseUrl}/merchant?register_number=${encodeURIComponent(registerNumber)}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!searchRes.ok) {
        return res.status(404).json({
          success: false,
          message: "QPay системд энэ регистрийн дугааратай мерчант олдсонгүй. QPay-тай шууд холбоо бариарай.",
        });
      }

      const searchData = await searchRes.json() as Record<string, unknown>;
      const merchantId = String(searchData.merchant_id || searchData.username || searchData.id || "");
      const merchantKey = String(searchData.merchant_key || searchData.password || searchData.secret || "");

      if (!merchantId || !merchantKey) {
        return res.status(404).json({ success: false, message: "Мерчант мэдээлэл олдсонгүй" });
      }

      // Auto-connect
      await prisma.organization.update({
        where: { id: member.organizationId },
        data: {
          qpayMerchantId: merchantId,
          qpayMerchantKey: merchantKey,
          qpayEnabled: true,
          qpayConnectedAt: new Date(),
        },
      });

      return res.json({ success: true, merchantId, message: "Мерчант мэдээлэл олдоод холбогдлоо" });
    }

    const data = await lookupRes.json() as Record<string, unknown>;
    const merchantId = String(data.merchant_id || data.username || data.id || "");
    const merchantKey = String(data.merchant_key || data.password || data.secret || "");

    if (!merchantId || !merchantKey) {
      return res.status(404).json({ success: false, message: "Мерчант credential олдсонгүй — QPay-тай холбоо барина уу" });
    }

    // Auto-connect
    await prisma.organization.update({
      where: { id: member.organizationId },
      data: {
        qpayMerchantId: merchantId,
        qpayMerchantKey: merchantKey,
        qpayEnabled: true,
        qpayConnectedAt: new Date(),
      },
    });

    return res.json({ success: true, merchantId, message: "Мерчант мэдээлэл олдоод амжилттай холбогдлоо" });
  } catch (error) {
    console.error("merchant recover error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

export default router;

