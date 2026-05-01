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

export default router;
