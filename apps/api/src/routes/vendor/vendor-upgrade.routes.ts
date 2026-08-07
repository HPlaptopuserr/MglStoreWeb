import { Router, type Request, type Router as ExpressRouter } from "express";
import { Prisma, prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { checkQPayPayment } from "../../services/qpay";
import {
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "../../services/systemqr";
import { syncOwnerPersonalMembershipFromOrgPlan } from "../../services/owner-membership-sync.service";
import { calculatePlanExpiration } from "../../lib/plan-expiration";
import {
  MEMBERSHIP_SPONSORED_PLAN_ID,
  resolveVendorPlanEntitlement,
} from "../../services/vendor-plan-entitlement.service";
import type { AuthPayload } from "../../middleware/auth";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  UpgradeMinuConfigurationError,
  UPGRADE_PAYMENT_ACCOUNT_SETTING_KEY,
  buildUpgradeMinuWebhookUrl,
  calculateUpgradeRenewalExpiration,
  findUpgradePaymentAccountByMerchantCode,
  hasSufficientLegacyQPayPayment,
  resolveUpgradeMinuMerchantConfig,
  resolveUpgradePaymentAccountFromSettings,
  type UpgradeMinuPaymentAccount,
} from "../../services/upgrade-minu.service";

const router: ExpressRouter = Router();

// ─── Plan definitions ──────────────────────────────────────────────────────

export type PlanId = string;

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  durationDays: number;
  maxProducts: number; // -1 = unlimited
  maxImages: number; // max images per product, -1 = unlimited
  maxCategories: number; // -1 = unlimited
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge?: string;
  tier?: "SILVER" | "GOLD" | "PLATINUM";
  durationMonths?: number;
  durationLabel?: string;
  benefits?: string[];
  unavailable?: string[];
};

const TRIAL_PLAN: Plan = {
  id: "trial",
  name: "Үнэгүй туршилт",
  price: 0,
  durationDays: 14,
  maxProducts: 10,
  maxImages: 2,
  maxCategories: 1,
  hasBanner: false,
  hasAnalytics: false,
  isTrial: true,
  durationLabel: "14 хоног",
};

const MEMBERSHIP_VENDOR_LIMITS = {
  maxProducts: -1,
  maxImages: -1,
  maxCategories: -1,
  hasBanner: true,
  hasAnalytics: true,
};

const MEMBERSHIP_SPONSORED_PLAN: Plan = {
  id: MEMBERSHIP_SPONSORED_PLAN_ID,
  name: "Гишүүнчлэлийн эрх",
  price: 0,
  durationDays: 0,
  isTrial: false,
  badge: "Гишүүн",
  benefits: [
    "Түнш байгууллагын Vendor plan",
    "Хязгааргүй бараа болон ангилал",
    "Гишүүнчлэл идэвхтэй хугацаанд ашиглана",
  ],
  ...MEMBERSHIP_VENDOR_LIMITS,
};

export const PLANS: Plan[] = [
  {
    id: "silver_1m",
    name: "Silver",
    price: 30_000,
    durationDays: 30,
    isTrial: false,
    tier: "SILVER",
    durationMonths: 1,
    durationLabel: "1 сар",
    benefits: [
      "Стандарт бүтээгдэхүүний хөнгөлөлт",
      "Стандарт хэрэглэгчийн дэмжлэг",
    ],
    unavailable: ["Priority хүргэлтийн үйлчилгээ"],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
  {
    id: "silver_6m",
    name: "Silver",
    price: 180_000,
    durationDays: 180,
    isTrial: false,
    tier: "SILVER",
    durationMonths: 6,
    durationLabel: "6 сарын bundle · 180,000₮",
    benefits: [
      "Стандарт бүтээгдэхүүний хөнгөлөлт",
      "Стандарт хэрэглэгчийн дэмжлэг",
    ],
    unavailable: ["Priority хүргэлтийн үйлчилгээ"],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
  {
    id: "gold_1m",
    name: "Gold",
    price: 50_000,
    durationDays: 30,
    isTrial: false,
    tier: "GOLD",
    durationMonths: 1,
    durationLabel: "1 сар",
    badge: "Санал болгох",
    benefits: [
      "10% нэмэлт дэлгүүрийн хөнгөлөлт",
      "Priority 24/7 support",
      "Үнэгүй хүргэлтийн эрх",
      "Улирлын sale-д түрүүлж оролцох",
    ],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
  {
    id: "gold_6m",
    name: "Gold",
    price: 300_000,
    durationDays: 180,
    isTrial: false,
    tier: "GOLD",
    durationMonths: 6,
    durationLabel: "6 сарын bundle · 300,000₮",
    badge: "Санал болгох",
    benefits: [
      "10% нэмэлт дэлгүүрийн хөнгөлөлт",
      "Priority 24/7 support",
      "Үнэгүй хүргэлтийн эрх",
      "Улирлын sale-д түрүүлж оролцох",
    ],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
  {
    id: "platinum_1m",
    name: "Platinum",
    price: 100_000,
    durationDays: 30,
    isTrial: false,
    tier: "PLATINUM",
    durationMonths: 1,
    durationLabel: "1 сар",
    benefits: [
      "VIP event access",
      "24/7 personal concierge",
      "VIP хөнгөлөлт 25% хүртэл",
      "Premium anniversary gift box",
    ],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
  {
    id: "platinum_6m",
    name: "Platinum",
    price: 600_000,
    durationDays: 180,
    isTrial: false,
    tier: "PLATINUM",
    durationMonths: 6,
    durationLabel: "6 сарын bundle · 600,000₮",
    benefits: [
      "VIP event access",
      "24/7 personal concierge",
      "VIP хөнгөлөлт 25% хүртэл",
      "Premium anniversary gift box",
    ],
    ...MEMBERSHIP_VENDOR_LIMITS,
  },
];

const LEGACY_PLANS: Plan[] = [
  TRIAL_PLAN,
  {
    id: "1m",
    name: "1 Сар",
    price: 49_900,
    durationDays: 30,
    maxProducts: 100,
    maxImages: 5,
    maxCategories: 3,
    hasBanner: true,
    hasAnalytics: false,
    isTrial: false,
    durationMonths: 1,
    durationLabel: "1 сар",
  },
  {
    id: "3m",
    name: "3 Сар",
    price: 129_900,
    durationDays: 90,
    maxProducts: 300,
    maxImages: 10,
    maxCategories: 5,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хэмнэлттэй",
    durationMonths: 3,
    durationLabel: "3 сар",
  },
  {
    id: "6m",
    name: "6 Сар",
    price: 239_900,
    durationDays: 180,
    maxProducts: 500,
    maxImages: 15,
    maxCategories: 10,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Алдартай",
    durationMonths: 6,
    durationLabel: "6 сар",
  },
  {
    id: "1y",
    name: "Энэ оныг дуустал",
    price: 449_900,
    durationDays: 365,
    maxProducts: -1,
    maxImages: -1,
    maxCategories: -1,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хамгийн ашигтай",
    durationMonths: 12,
    durationLabel: "Энэ оныг дуустал",
  },
];

export function getPlan(id: string): Plan | undefined {
  if (id === MEMBERSHIP_SPONSORED_PLAN_ID) return MEMBERSHIP_SPONSORED_PLAN;
  return (
    PLANS.find((p) => p.id === id) ?? LEGACY_PLANS.find((p) => p.id === id)
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getOrgForUser(userId: string, organizationId?: string | null) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      ...(organizationId ? { organizationId } : {}),
      organization: { deletedAt: null },
    },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          subdomainEnabled: true,
          planType: true,
          planActivatedAt: true,
          planExpiresAt: true,
          trialUsed: true,
        },
      },
    },
  });
  return member?.organization ?? null;
}

interface VendorUpgradeRequest extends Request {
  user?: AuthPayload;
}

function getRequestUserId(req: Request): string {
  const userId = (req as VendorUpgradeRequest).user?.userId;
  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }
  return userId;
}

function getRequestOrganizationId(req: Request): string | undefined {
  const request = req as VendorUpgradeRequest;
  const queryOrganizationId = req.query.organizationId;
  const body = req.body as { organizationId?: unknown } | undefined;

  return (
    request.user?.organizationId ??
    (typeof queryOrganizationId === "string"
      ? queryOrganizationId
      : undefined) ??
    (typeof body?.organizationId === "string" ? body.organizationId : undefined)
  );
}

function activationData(plan: Plan) {
  const now = new Date();
  const expiresAt = calculatePlanExpiration(plan, now);
  return { now, expiresAt };
}

type UpgradePaymentLink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

function readUpgradePaymentLinks(
  value: Prisma.JsonValue | null,
): UpgradePaymentLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const link = typeof record.link === "string" ? record.link : "";
    if (!link) return [];
    return [
      {
        name: typeof record.name === "string" ? record.name : "Банкны апп",
        description:
          typeof record.description === "string" ? record.description : "",
        logo: typeof record.logo === "string" ? record.logo : "",
        link,
      },
    ];
  });
}

async function activatePaidUpgradeInvoice(
  invoiceId: string,
  organizationId: string,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const invoice = await tx.orgUpgradePlan.findFirst({
            where: { invoiceId, organizationId },
          });
          if (!invoice) throw new Error("Upgrade invoice not found");

          const organization = await tx.organization.findUnique({
            where: { id: organizationId },
            select: { planExpiresAt: true },
          });
          if (!organization) throw new Error("Upgrade organization not found");

          if (invoice.status === "PAID") {
            return {
              planType: invoice.planType,
              expiresAt: invoice.expiresAt ?? organization.planExpiresAt,
              alreadyHandled: true,
            };
          }
          if (invoice.status !== "PENDING") {
            throw new Error(`Upgrade invoice is ${invoice.status}`);
          }

          const plan = getPlan(invoice.planType);
          if (!plan || plan.isTrial) throw new Error("Upgrade plan not found");

          const paidAt = new Date();
          const expiresAt = calculateUpgradeRenewalExpiration(
            plan,
            organization.planExpiresAt,
            paidAt,
          );

          await tx.orgUpgradePlan.update({
            where: { id: invoice.id },
            data: { status: "PAID", paidAt, expiresAt },
          });
          await tx.organization.update({
            where: { id: organizationId },
            data: {
              subdomainEnabled: true,
              planType: invoice.planType,
              planActivatedAt: paidAt,
              planExpiresAt: expiresAt,
            },
          });
          await syncOwnerPersonalMembershipFromOrgPlan({
            prisma: tx,
            organizationId,
            paidAt,
            expiresAt,
          });

          return {
            planType: invoice.planType,
            expiresAt,
            alreadyHandled: false,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === maxAttempts) throw error;
    }
  }

  throw new Error("Upgrade activation failed after retries");
}

async function isUpgradeInvoicePaid(invoice: {
  invoiceId: string;
  amount: Prisma.Decimal;
  paymentProvider: string;
  paymentMerchantCode: string | null;
}) {
  if (invoice.paymentProvider.toUpperCase() === "SYSTEMQR") {
    const config = invoice.paymentMerchantCode
      ? await resolveUpgradeMinuConfigForMerchant(
          invoice.paymentMerchantCode,
        )
      : await resolveCurrentUpgradeMinuConfig();
    const payment = await checkSystemQrPayment(
      {
        merchantCode: invoice.paymentMerchantCode || config.merchantCode,
        invoiceNumber: invoice.invoiceId,
      },
      config.username,
      config.password,
    );
    return payment.paid;
  }

  const payment = await checkQPayPayment(invoice.invoiceId);
  return hasSufficientLegacyQPayPayment(payment, Number(invoice.amount));
}

// ─── Routes ───────────────────────────────────────────────────────────────

function resolveUpgradeMinuConfigFromAccount(
  account: UpgradeMinuPaymentAccount,
) {
  if (!account.username || !account.password) {
    throw new UpgradeMinuConfigurationError(
      "Сонгосон Pro Upgrade Minu дансны username/password хадгалагдаагүй байна. Admin дээр зөв credential-ээ оруулж хадгална уу",
    );
  }

  return resolveUpgradeMinuMerchantConfig(
    {
      ...process.env,
      SYSTEMQR_UPGRADE_USERNAME: account.username,
      SYSTEMQR_UPGRADE_PASSWORD: account.password,
    },
    account.merchantCode,
  );
}

async function resolveUpgradeMinuConfigForMerchant(merchantCode: string) {
  const paymentAccounts = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    select: { value: true },
  });
  const account = findUpgradePaymentAccountByMerchantCode(
    paymentAccounts?.value,
    merchantCode,
  );

  // Existing invoices created before the Admin selector was introduced can
  // still be checked with the server credential.
  return account
    ? resolveUpgradeMinuConfigFromAccount(account)
    : resolveUpgradeMinuMerchantConfig(process.env, merchantCode);
}

async function resolveCurrentUpgradeMinuConfig() {
  const settings = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          UPGRADE_PAYMENT_ACCOUNT_SETTING_KEY,
          CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const settingByKey = new Map(
    settings.map((setting) => [setting.key, setting.value]),
  );
  const adminSelection = settingByKey.get(
    UPGRADE_PAYMENT_ACCOUNT_SETTING_KEY,
  );

  if (adminSelection === undefined) {
    throw new UpgradeMinuConfigurationError(
      "Admin → Тохиргоо → Төлбөрийн данс хэсэгт Pro Upgrade-ийн Minu дансаа сонгоно уу",
    );
  }

  const account = resolveUpgradePaymentAccountFromSettings(
    adminSelection,
    settingByKey.get(CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY),
  );
  if (!account) {
    throw new UpgradeMinuConfigurationError(
      "Admin → Тохиргоо → Төлбөрийн данс хэсэгт Pro Upgrade-ийн Minu дансаа сонгоно уу",
    );
  }

  return resolveUpgradeMinuConfigFromAccount(account);
}

async function isCurrentUpgradeMinuConfigured() {
  try {
    await resolveCurrentUpgradeMinuConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/vendor/upgrade/status
 */
router.get("/vendor/upgrade/status", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org)
      return res
        .status(404)
        .json({ success: false, message: "Байгууллага олдсонгүй" });
    const entitlement = await resolveVendorPlanEntitlement(org.id);
    if (!entitlement)
      return res
        .status(404)
        .json({ success: false, message: "Байгууллага олдсонгүй" });

    const pendingInvoice = await prisma.orgUpgradePlan.findFirst({
      where: { organizationId: org.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      subdomainEnabled: org.subdomainEnabled,
      subdomain: `${org.slug}.mglstore.mn`,
      planType: entitlement.effectivePlanType,
      planActivatedAt: entitlement.effectivePlanActivatedAt,
      planExpiresAt: entitlement.effectivePlanExpiresAt,
      trialUsed: org.trialUsed,
      isActive: entitlement.isActive,
      paymentConfigured: await isCurrentUpgradeMinuConfigured(),
      entitlementSource: entitlement.source,
      currentPlan: entitlement.effectivePlanType
        ? (getPlan(entitlement.effectivePlanType) ?? null)
        : null,
      pendingInvoice: pendingInvoice
        ? {
            invoiceId: pendingInvoice.invoiceId,
            invoiceNo: pendingInvoice.invoiceNo,
            qrText: pendingInvoice.qrText,
            paymentProvider: pendingInvoice.paymentProvider,
            deepLinks: readUpgradePaymentLinks(pendingInvoice.deepLinks),
            amount: Number(pendingInvoice.amount),
            planType: pendingInvoice.planType,
            createdAt: pendingInvoice.createdAt,
          }
        : null,
      plans: PLANS,
    });
  } catch (error) {
    console.error("upgrade status error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/trial
 * Activate free trial (once per org)
 */
router.post("/vendor/upgrade/trial", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org)
      return res
        .status(404)
        .json({ success: false, message: "Байгууллага олдсонгүй" });

    if (org.trialUsed) {
      return res.status(400).json({
        success: false,
        message: "Үнэгүй туршилтыг аль хэдийн ашигласан байна",
      });
    }
    if (
      org.subdomainEnabled &&
      org.planExpiresAt &&
      new Date(org.planExpiresAt) > new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Идэвхтэй план аль хэдийн байна" });
    }

    const plan = getPlan("trial")!;
    const { now, expiresAt } = activationData(plan);

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subdomainEnabled: true,
        planType: "trial",
        planActivatedAt: now,
        planExpiresAt: expiresAt,
        trialUsed: true,
      },
    });

    return res.json({
      success: true,
      subdomain: `${org.slug}.mglstore.mn`,
      planType: "trial",
      expiresAt,
    });
  } catch (error) {
    console.error("trial activate error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/initiate
 * Body: { planId: "silver_1m" | "silver_6m" | ... }
 */
router.post("/vendor/upgrade/initiate", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { planId } = req.body as { planId: PlanId };

    const plan = getPlan(planId);
    if (!plan || plan.isTrial) {
      return res
        .status(400)
        .json({ success: false, message: "Буруу план сонгосон" });
    }

    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org)
      return res
        .status(404)
        .json({ success: false, message: "Байгууллага олдсонгүй" });

    const minuConfig = await resolveCurrentUpgradeMinuConfig();
    const existingInvoice = await prisma.orgUpgradePlan.findFirst({
      where: { organizationId: org.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (existingInvoice) {
      if (existingInvoice.planType !== planId) {
        return res.status(409).json({
          success: false,
          message:
            "Өмнөх QR нэхэмжлэл хүлээгдэж байна. Төлбөрөө шалгасны дараа өөр багц сонгоно уу.",
          pendingInvoice: {
            invoiceId: existingInvoice.invoiceId,
            invoiceNo: existingInvoice.invoiceNo,
            qrText: existingInvoice.qrText,
            paymentProvider: existingInvoice.paymentProvider,
            deepLinks: readUpgradePaymentLinks(existingInvoice.deepLinks),
            amount: Number(existingInvoice.amount),
            planType: existingInvoice.planType,
            createdAt: existingInvoice.createdAt,
          },
        });
      }

      return res.json({
        success: true,
        reused: true,
        invoiceId: existingInvoice.invoiceId,
        invoiceNo: existingInvoice.invoiceNo,
        qrText: existingInvoice.qrText,
        paymentProvider: existingInvoice.paymentProvider,
        deepLinks: readUpgradePaymentLinks(existingInvoice.deepLinks),
        amount: Number(existingInvoice.amount),
        planType: existingInvoice.planType,
        plan,
      });
    }

    const invoiceNo = `UPG-${org.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    const webhook = buildUpgradeMinuWebhookUrl(invoiceNo, org.id);
    const minuInvoice = await createSystemQrInvoice(
      {
        merchantCode: minuConfig.merchantCode,
        referenceNumber: invoiceNo,
        amount: plan.price,
        ...(webhook ? { webhook } : {}),
      },
      minuConfig.username,
      minuConfig.password,
    );

    await prisma.orgUpgradePlan.create({
      data: {
        organizationId: org.id,
        planType: planId,
        invoiceId: minuInvoice.invoiceId,
        invoiceNo,
        qrText: minuInvoice.qrText,
        deepLinks: minuInvoice.urls as unknown as Prisma.InputJsonValue,
        paymentProvider: "SYSTEMQR",
        paymentMerchantCode: minuConfig.merchantCode,
        amount: plan.price,
        status: "PENDING",
      },
    });

    return res.json({
      success: true,
      paymentProvider: "SYSTEMQR",
      invoiceId: minuInvoice.invoiceId,
      invoiceNo,
      qrText: minuInvoice.qrText,
      deepLinks: minuInvoice.urls,
      amount: plan.price,
      planType: planId,
      plan,
    });
  } catch (error) {
    console.error("upgrade initiate error", error);
    if (error instanceof UpgradeMinuConfigurationError) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Minu Dynamic QR нэхэмжлэл үүсгэхэд алдаа гарлаа",
      ...(process.env.NODE_ENV !== "production"
        ? {
            detail:
              error instanceof Error ? error.message : String(error),
          }
        : {}),
    });
  }
});

/**
 * POST /api/vendor/upgrade/cancel/:invoiceId
 * Stops an unpaid local checkout so the vendor can choose another plan.
 * The provider invoice may remain visible at Minu, but a later callback for
 * the cancelled row is intentionally ignored and can never activate access.
 */
router.post("/vendor/upgrade/cancel/:invoiceId", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { invoiceId } = req.params;
    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Байгууллага олдсонгүй",
      });
    }

    const invoice = await prisma.orgUpgradePlan.findFirst({
      where: { invoiceId, organizationId: org.id },
      select: { id: true, status: true },
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Нэхэмжлэл олдсонгүй",
      });
    }
    if (invoice.status === "PAID") {
      return res.status(409).json({
        success: false,
        message: "Төлбөр баталгаажсан тул нэхэмжлэлийг цуцлах боломжгүй",
      });
    }
    if (invoice.status !== "PENDING") {
      return res.json({ success: true, cancelled: true });
    }

    const cancelled = await prisma.orgUpgradePlan.updateMany({
      where: { id: invoice.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count !== 1) {
      return res.status(409).json({
        success: false,
        message: "Нэхэмжлэлийн төлөв өөрчлөгдсөн байна. Дахин шалгана уу",
      });
    }

    return res.json({ success: true, cancelled: true });
  } catch (error) {
    console.error("upgrade cancel error", error);
    return res.status(500).json({
      success: false,
      message: "Нэхэмжлэл цуцлахад серверийн алдаа гарлаа",
    });
  }
});

/**
 * POST /api/vendor/upgrade/check/:invoiceId
 */
router.post(
  "/vendor/upgrade/check/:invoiceId",
  requireAuth,
  async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const { invoiceId } = req.params;

      const org = await getOrgForUser(userId, getRequestOrganizationId(req));
      if (!org)
        return res
          .status(404)
          .json({ success: false, message: "Байгууллага олдсонгүй" });

      const dbPlan = await prisma.orgUpgradePlan.findFirst({
        where: { invoiceId, organizationId: org.id },
      });
      if (!dbPlan)
        return res
          .status(404)
          .json({ success: false, message: "Нэхэмжлэл олдсонгүй" });

      if (dbPlan.status === "PAID") {
        return res.json({
          success: true,
          paid: true,
          message: "Төлбөр аль хэдийн баталгаажсан",
        });
      }
      if (dbPlan.status !== "PENDING") {
        return res.status(409).json({
          success: false,
          paid: false,
          message: "Энэ нэхэмжлэл идэвхгүй болсон байна",
        });
      }

      const isPaid = await isUpgradeInvoicePaid(dbPlan);

      if (isPaid) {
        const activation = await activatePaidUpgradeInvoice(invoiceId, org.id);

        return res.json({
          success: true,
          paid: true,
          subdomain: `${org.slug}.mglstore.mn`,
          planType: activation.planType,
          expiresAt: activation.expiresAt,
        });
      }

      return res.json({
        success: true,
        paid: false,
        message: "Төлбөр хүлээгдэж байна",
      });
    } catch (error) {
      console.error("upgrade check error", error);
      if (error instanceof UpgradeMinuConfigurationError) {
        return res.status(503).json({
          success: false,
          paid: false,
          message: error.message,
        });
      }
      return res
        .status(500)
        .json({ success: false, message: "Серверийн алдаа" });
    }
  },
);

/**
 * POST /api/vendor/upgrade/callback — Minu Dynamic QR / legacy QPay webhook
 */
router.post("/vendor/upgrade/callback", async (req, res) => {
  try {
    const orgId = String(req.query.orgId || req.query.orderId || "").trim();
    const invoiceNo = String(req.query.invoiceNo || "").trim();
    const callbackInvoiceId = String(
      req.body?.invoice_id ||
        req.body?.invoiceId ||
        req.body?.invoice_number ||
        req.body?.invoiceNumber ||
        req.query.invoice_id ||
        req.query.invoiceId ||
        req.query.invoice_number ||
        req.query.invoiceNumber ||
        "",
    ).trim();
    if (!callbackInvoiceId && !invoiceNo) {
      return res.status(400).json({ message: "Missing invoice identifier" });
    }

    const dbPlan = await prisma.orgUpgradePlan.findFirst({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        OR: [
          ...(callbackInvoiceId ? [{ invoiceId: callbackInvoiceId }] : []),
          ...(invoiceNo ? [{ invoiceNo }] : []),
        ],
      },
    });
    if (!dbPlan) return res.status(200).json({ message: "invoice ignored" });
    if (dbPlan.status === "PAID") {
      return res.status(200).json({ message: "already handled" });
    }
    if (dbPlan.status !== "PENDING") {
      return res.status(200).json({ message: "invoice inactive" });
    }

    const isPaid = await isUpgradeInvoicePaid(dbPlan);

    if (isPaid) {
      await activatePaidUpgradeInvoice(dbPlan.invoiceId, dbPlan.organizationId);
    }

    return res.status(200).json({ message: isPaid ? "ok" : "payment pending" });
  } catch (error) {
    console.error("upgrade callback error", error);
    return res.status(500).json({ message: "error" });
  }
});

export default router;
