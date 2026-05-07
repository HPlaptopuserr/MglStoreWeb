import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import type { Decimal } from "@prisma/client/runtime/library";

const router: ExpressRouter = Router();

// ─── Types ───────────────────────────────────────────────────────────────────

export type Plan = {
  id: string;
  code?: string;
  name: string;
  price: number;
  durationDays: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge?: string | null;
  description?: string | null;
  isRecommended?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

// ─── Fallback plans (used when UpgradePlan table is empty) ──────────────────

export const FALLBACK_PLANS: Plan[] = [
  {
    id: "trial",
    code: "trial",
    name: "Үнэгүй туршилт",
    price: 0,
    durationDays: 14,
    maxProducts: 30,
    maxImages: 3,
    maxCategories: 5,
    hasBanner: true,
    hasAnalytics: false,
    isTrial: true,
    badge: "Үнэгүй",
    sortOrder: 1,
  },
  {
    id: "1m",
    code: "monthly",
    name: "1 Сар",
    description: "Шинээр эхэлж байгаа дэлгүүрт",
    price: 49_900,
    durationDays: 30,
    maxProducts: 150,
    maxImages: 5,
    maxCategories: 10,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    sortOrder: 2,
  },
  {
    id: "3m",
    code: "quarterly",
    name: "3 Сар",
    description: "Тогтвортой ашиглах хамгийн тохиромжтой",
    price: 129_900,
    durationDays: 90,
    maxProducts: 500,
    maxImages: 8,
    maxCategories: 20,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хамгийн тохиромжтой",
    isRecommended: true,
    sortOrder: 3,
  },
  {
    id: "6m",
    code: "half_year",
    name: "6 Сар",
    description: "Борлуулалт идэвхтэй дэлгүүрт",
    price: 239_900,
    durationDays: 180,
    maxProducts: 1000,
    maxImages: 10,
    maxCategories: 50,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хэмнэлттэй",
    sortOrder: 4,
  },
  {
    id: "1y",
    code: "yearly",
    name: "1 Жил",
    description: "Брэндээ урт хугацаанд хөгжүүлэхэд",
    price: 449_900,
    durationDays: 365,
    maxProducts: 3000,
    maxImages: 15,
    maxCategories: 100,
    hasBanner: true,
    hasAnalytics: true,
    isTrial: false,
    badge: "Хамгийн ашигтай",
    sortOrder: 5,
  },
];

// ─── DB helpers ──────────────────────────────────────────────────────────────

function dbPlanToPlain(p: {
  id: string; code: string; name: string; description: string | null;
  price: Decimal; durationDays: number; maxProducts: number; maxImages: number;
  maxCategories: number; hasBanner: boolean; hasAnalytics: boolean; isTrial: boolean;
  badge: string | null; isRecommended: boolean; isActive: boolean; sortOrder: number;
}): Plan {
  return { ...p, price: Number(p.price) };
}

export async function getActivePlans(): Promise<Plan[]> {
  const rows = await (prisma.upgradePlan as any).findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.length ? rows.map(dbPlanToPlain) : FALLBACK_PLANS;
}

export async function resolvePlan(idOrCode: string): Promise<Plan | undefined> {
  const row = await (prisma.upgradePlan as any).findFirst({
    where: { isActive: true, OR: [{ id: idOrCode }, { code: idOrCode }] },
  });
  if (row) return dbPlanToPlain(row);
  return FALLBACK_PLANS.find((p) => p.id === idOrCode || p.code === idOrCode);
}

export function getPlan(idOrCode: string): Plan | undefined {
  return FALLBACK_PLANS.find((p) => p.id === idOrCode || p.code === idOrCode);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrgForUser(userId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
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

function activationData(plan: Plan) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  return { now, expiresAt };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/upgrade/status
 */
router.get("/vendor/upgrade/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const org = await getOrgForUser(userId);
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    const pendingInvoice = await (prisma.orgUpgradePlan as any).findFirst({
      where: { organizationId: org.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    const isActive = org.planExpiresAt ? new Date(org.planExpiresAt) > new Date() : false;
    const plans = await getActivePlans();

    let currentPlan: Plan | null = null;
    if (org.planType) currentPlan = (await resolvePlan(org.planType)) ?? null;

    return res.json({
      success: true,
      planType: org.planType,
      planActivatedAt: org.planActivatedAt,
      planExpiresAt: org.planExpiresAt,
      trialUsed: org.trialUsed,
      isActive,
      currentPlan,
      pendingInvoice: pendingInvoice
        ? {
            invoiceId: pendingInvoice.invoiceId,
            invoiceNo: pendingInvoice.invoiceNo,
            qrText: pendingInvoice.qrText,
            amount: Number(pendingInvoice.amount),
            planType: pendingInvoice.planType,
            planId: pendingInvoice.planId ?? null,
            createdAt: pendingInvoice.createdAt,
          }
        : null,
      plans,
    });
  } catch (error) {
    console.error("upgrade status error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/trial
 */
router.post("/vendor/upgrade/trial", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const org = await getOrgForUser(userId);
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    if (org.trialUsed) {
      return res.status(400).json({ success: false, message: "Үнэгүй туршилтыг аль хэдийн ашигласан байна" });
    }
    if (org.planExpiresAt && new Date(org.planExpiresAt) > new Date()) {
      return res.status(400).json({ success: false, message: "Идэвхтэй план аль хэдийн байна" });
    }

    const plans = await getActivePlans();
    const trialPlan = plans.find((p) => p.isTrial) ?? FALLBACK_PLANS.find((p) => p.isTrial)!;
    const { now, expiresAt } = activationData(trialPlan);

    await (prisma.organization as any).update({
      where: { id: org.id },
      data: {
        planType: trialPlan.code ?? "trial",
        planActivatedAt: now,
        planExpiresAt: expiresAt,
        trialUsed: true,
      },
    });

    return res.json({ success: true, planType: trialPlan.code ?? "trial", expiresAt });
  } catch (error) {
    console.error("trial activate error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/initiate
 * Body: { planId: "<DB uuid or code>" }
 */
router.post("/vendor/upgrade/initiate", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { planId } = req.body as { planId: string };
    if (!planId) return res.status(400).json({ success: false, message: "planId шаардлагатай" });

    const plan = await resolvePlan(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Сонгосон багц олдсонгүй" });
    if (plan.isTrial) return res.status(400).json({ success: false, message: "Үнэгүй туршилтыг /trial endpoint-оор идэвхжүүл" });

    const org = await getOrgForUser(userId);
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

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
        ...(plan.id !== (plan.code ?? plan.id) ? { planId: plan.id } : {}),
        planType: plan.code ?? plan.id,
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
      planType: plan.code ?? plan.id,
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
    const userId = (req as any).userId as string;
    const { invoiceId } = req.params;

    const org = await getOrgForUser(userId);
    if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

    const dbRecord = await (prisma.orgUpgradePlan as any).findFirst({
      where: { invoiceId, organizationId: org.id },
    });
    if (!dbRecord) return res.status(404).json({ success: false, message: "Нэхэмжлэл олдсонгүй" });
    if (dbRecord.status === "PAID") return res.json({ success: true, paid: true, message: "Төлбөр аль хэдийн баталгаажсан" });

    const qpayCheck = await checkQPayPayment(invoiceId);
    const isPaid = qpayCheck.count > 0 && qpayCheck.rows.some((r: any) => r.payment_status === "PAID");

    if (isPaid) {
      const plan = (await resolvePlan(dbRecord.planType)) ?? getPlan(dbRecord.planType);
      if (!plan) return res.status(500).json({ success: false, message: "Багцын мэдээлэл олдсонгүй" });

      const { now, expiresAt } = activationData(plan);
      await prisma.$transaction([
        (prisma.orgUpgradePlan as any).update({ where: { id: dbRecord.id }, data: { status: "PAID", paidAt: now, expiresAt } }),
        (prisma.organization as any).update({
          where: { id: org.id },
          data: { planType: dbRecord.planType, planActivatedAt: now, planExpiresAt: expiresAt },
        }),
      ]);

      return res.json({ success: true, paid: true, planType: dbRecord.planType, expiresAt });
    }

    return res.json({ success: true, paid: false, message: "Төлбөр хүлээгдэж байна" });
  } catch (error) {
    console.error("upgrade check error", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

/**
 * POST /api/vendor/upgrade/callback — QPay webhook
 */
router.post("/vendor/upgrade/callback", async (req, res) => {
  try {
    const { orgId } = req.query as { orgId: string };
    const { invoice_id } = req.body || {};
    if (!invoice_id || !orgId) return res.status(400).json({ message: "Missing params" });

    const dbRecord = await (prisma.orgUpgradePlan as any).findFirst({
      where: { invoiceId: invoice_id, organizationId: orgId, status: "PENDING" },
    });
    if (!dbRecord) return res.status(200).json({ message: "already handled" });

    const qpayCheck = await checkQPayPayment(invoice_id);
    const isPaid = qpayCheck.count > 0 && qpayCheck.rows.some((r: any) => r.payment_status === "PAID");

    if (isPaid) {
      const plan = (await resolvePlan(dbRecord.planType)) ?? getPlan(dbRecord.planType);
      if (!plan) return res.status(200).json({ message: "plan not found" });

      const { now, expiresAt } = activationData(plan);
      await prisma.$transaction([
        (prisma.orgUpgradePlan as any).update({ where: { id: dbRecord.id }, data: { status: "PAID", paidAt: now, expiresAt } }),
        (prisma.organization as any).update({
          where: { id: orgId },
          data: { planType: dbRecord.planType, planActivatedAt: now, planExpiresAt: expiresAt },
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
