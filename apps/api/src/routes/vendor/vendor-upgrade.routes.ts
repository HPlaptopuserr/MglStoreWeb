import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";

const router: ExpressRouter = Router();

// ─── Plan definitions ──────────────────────────────────────────────────────

export type PlanId = "trial" | "1m" | "3m" | "6m" | "1y";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  durationDays: number;
  maxProducts: number;       // -1 = unlimited
  maxImages: number;         // max images per product, -1 = unlimited
  maxCategories: number;     // -1 = unlimited
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge?: string;
};

export const PLANS: Plan[] = [
  {
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
  },
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
  },
  {
    id: "1y",
    name: "1 Жил",
    price: 449_900,
    durationDays: 365,
    maxProducts: -1,
    maxImages: -1,
    maxCategories: -1,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хамгийн ашигтай",
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getOrgForUser(userId: string, organizationId?: string | null) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(organizationId ? { organizationId } : {}),
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
  if (member?.organization) return member.organization;

  if (!organizationId) return null;
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
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
  });
}

function getRequestUserId(req: any) {
  return req.user?.userId || req.user?.id || req.userId;
}

function getRequestOrganizationId(req: any) {
  return req.user?.organizationId || req.query?.organizationId || req.body?.organizationId || req.organizationId;
}

function activationData(plan: Plan) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  return { now, expiresAt };
}

// ─── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/upgrade/status
 */
router.get("/vendor/upgrade/status", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    const pendingInvoice = await (prisma.orgUpgradePlan as any).findFirst({
      where: { organizationId: org.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    const isActive =
      org.subdomainEnabled && org.planExpiresAt
        ? new Date(org.planExpiresAt) > new Date()
        : false;

    return res.json({
      success: true,
      subdomainEnabled: org.subdomainEnabled,
      subdomain: `${org.slug}.mglstore.mn`,
      planType: org.planType,
      planActivatedAt: org.planActivatedAt,
      planExpiresAt: org.planExpiresAt,
      trialUsed: org.trialUsed,
      isActive,
      currentPlan: org.planType ? getPlan(org.planType) ?? null : null,
      pendingInvoice: pendingInvoice
        ? {
            invoiceId: pendingInvoice.invoiceId,
            invoiceNo: pendingInvoice.invoiceNo,
            qrText: pendingInvoice.qrText,
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
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    if (org.trialUsed) {
      return res.status(400).json({ success: false, message: "Үнэгүй туршилтыг аль хэдийн ашигласан байна" });
    }
    if (org.subdomainEnabled && org.planExpiresAt && new Date(org.planExpiresAt) > new Date()) {
      return res.status(400).json({ success: false, message: "Идэвхтэй план аль хэдийн байна" });
    }

    const plan = getPlan("trial")!;
    const { now, expiresAt } = activationData(plan);

    await (prisma.organization as any).update({
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
 * Body: { planId: "1m" | "3m" | "6m" | "1y" }
 */
router.post("/vendor/upgrade/initiate", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { planId } = req.body as { planId: PlanId };

    const plan = getPlan(planId);
    if (!plan || plan.isTrial) {
      return res.status(400).json({ success: false, message: "Буруу план сонгосон" });
    }

    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    // Cancel stale pending invoices
    await (prisma.orgUpgradePlan as any).updateMany({
      where: { organizationId: org.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const invoiceNo = `UPG-${org.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    const qpayRes = await createQPayInvoice({
      orderId: org.id,
      orderNumber: invoiceNo,
      amount: plan.price,
      description: `MglStore Pro (${plan.name}) - ${org.name}`,
      callbackConfig: { path: "/api/vendor/upgrade/callback", query: { orgId: org.id } },
    });

    await (prisma.orgUpgradePlan as any).create({
      data: {
        organizationId: org.id,
        planType: planId,
        invoiceId: qpayRes.invoice_id,
        invoiceNo,
        qrText: qpayRes.qr_text,
        amount: plan.price,
        status: "PENDING",
      },
    });

    return res.json({
      success: true,
      invoiceId: qpayRes.invoice_id,
      invoiceNo,
      qrText: qpayRes.qr_text,
      amount: plan.price,
      planType: planId,
      plan,
    });
  } catch (error) {
    console.error("upgrade initiate error", error);
    return res.status(500).json({ success: false, message: "QPay нэхэмжлэл үүсгэхэд алдаа гарлаа" });
  }
});

/**
 * POST /api/vendor/upgrade/check/:invoiceId
 */
router.post("/vendor/upgrade/check/:invoiceId", requireAuth, async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { invoiceId } = req.params;

    const org = await getOrgForUser(userId, getRequestOrganizationId(req));
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    const dbPlan = await (prisma.orgUpgradePlan as any).findFirst({
      where: { invoiceId, organizationId: org.id },
    });
    if (!dbPlan) return res.status(404).json({ success: false, message: "Нэхэмжлэл олдсонгүй" });

    if (dbPlan.status === "PAID") {
      return res.json({ success: true, paid: true, message: "Төлбөр аль хэдийн баталгаажсан" });
    }

    const qpayCheck = await checkQPayPayment(invoiceId);
    const isPaid = qpayCheck.count > 0 && qpayCheck.rows.some((r: any) => r.payment_status === "PAID");

    if (isPaid) {
      const plan = getPlan(dbPlan.planType)!;
      const { now, expiresAt } = activationData(plan);

      await prisma.$transaction([
        (prisma.orgUpgradePlan as any).update({
          where: { id: dbPlan.id },
          data: { status: "PAID", paidAt: now, expiresAt },
        }),
        (prisma.organization as any).update({
          where: { id: org.id },
          data: {
            subdomainEnabled: true,
            planType: dbPlan.planType,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
          },
        }),
      ]);

      return res.json({
        success: true,
        paid: true,
        subdomain: `${org.slug}.mglstore.mn`,
        planType: dbPlan.planType,
        expiresAt,
      });
    }

    return res.json({ success: true, paid: false, message: "Төлбөр хүлээгдэж байна" });
  } catch (error) {
    console.error("upgrade check error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/callback  — QPay webhook
 */
router.post("/vendor/upgrade/callback", async (req, res) => {
  try {
    const { orgId } = req.query as { orgId: string };
    const { invoice_id } = req.body || {};
    if (!invoice_id || !orgId) return res.status(400).json({ message: "Missing params" });

    const dbPlan = await (prisma.orgUpgradePlan as any).findFirst({
      where: { invoiceId: invoice_id, organizationId: orgId, status: "PENDING" },
    });
    if (!dbPlan) return res.status(200).json({ message: "already handled" });

    const qpayCheck = await checkQPayPayment(invoice_id);
    const isPaid = qpayCheck.count > 0 && qpayCheck.rows.some((r: any) => r.payment_status === "PAID");

    if (isPaid) {
      const plan = getPlan(dbPlan.planType)!;
      const { now, expiresAt } = activationData(plan);
      await prisma.$transaction([
        (prisma.orgUpgradePlan as any).update({ where: { id: dbPlan.id }, data: { status: "PAID", paidAt: now, expiresAt } }),
        (prisma.organization as any).update({
          where: { id: orgId },
          data: { subdomainEnabled: true, planType: dbPlan.planType, planActivatedAt: now, planExpiresAt: expiresAt },
        }),
      ]);
    }

    return res.status(200).json({ message: "ok" });
  } catch (error) {
    console.error("upgrade callback error", error);
    return res.status(500).json({ message: "error" });
  }
});

export default router;
