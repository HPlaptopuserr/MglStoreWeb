import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";
import { PLANS, getPlan } from "../vendor/vendor-upgrade.routes";

const router: ExpressRouter = Router();

/**
 * GET /api/admin/vendors/:orgId/plan-history
 * Returns plan grant & payment history for a vendor
 */
router.get(
  "/admin/vendors/:orgId/plan-history",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const org = await (prisma.organization as any).findFirst({
        where: { id: orgId, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          planType: true,
          planActivatedAt: true,
          planExpiresAt: true,
          trialUsed: true,
          subdomainEnabled: true,
        },
      });

      if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

      const history = await (prisma.orgUpgradePlan as any).findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          plan: { select: { name: true, code: true } },
        },
      });

      const isActive =
        org.subdomainEnabled && org.planExpiresAt
          ? new Date(org.planExpiresAt) > new Date()
          : false;

      return res.json({
        success: true,
        org: {
          ...org,
          isActive,
          currentPlan: org.planType ? getPlan(org.planType) ?? null : null,
        },
        plans: PLANS,
        history: history.map((h: any) => ({
          id: h.id,
          planType: h.planType,
          planName: h.plan?.name ?? getPlan(h.planType)?.name ?? h.planType,
          amount: Number(h.amount),
          status: h.status,
          paidAt: h.paidAt,
          expiresAt: h.expiresAt,
          createdAt: h.createdAt,
          grantedByAdmin: h.grantedByAdmin,
          grantNote: h.grantNote,
          grantedById: h.grantedById,
        })),
      });
    } catch (err) {
      console.error("admin plan history error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

/**
 * POST /api/admin/vendors/:orgId/grant-plan
 * Grant a plan for free to a vendor (no payment required)
 * Body: { planId: string, note: string, customDays?: number }
 */
router.post(
  "/admin/vendors/:orgId/grant-plan",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { planId, note, customDays } = req.body as {
        planId: string;
        note: string;
        customDays?: number;
      };
      const adminUserId = (req as any).user?.userId;

      if (!planId || !note?.trim()) {
        return res.status(400).json({ success: false, message: "planId болон note шаардлагатай" });
      }

      const plan = getPlan(planId);
      if (!plan) {
        return res.status(400).json({ success: false, message: "Буруу план сонгосон" });
      }

      const org = await (prisma.organization as any).findFirst({
        where: { id: orgId, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });

      if (!org) return res.status(404).json({ success: false, message: "Байгууллага олдсонгүй" });

      const now = new Date();
      const days = customDays && customDays > 0 ? customDays : plan.durationDays;
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const invoiceNo = `GRANT-${org.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
      const invoiceId = `admin-grant-${org.id.slice(0, 8)}-${Date.now()}`;

      await (prisma as any).$transaction([
        (prisma.orgUpgradePlan as any).create({
          data: {
            organizationId: org.id,
            planType: planId,
            invoiceId,
            invoiceNo,
            qrText: "",
            amount: 0,
            status: "PAID",
            paidAt: now,
            expiresAt,
            grantedByAdmin: true,
            grantNote: note.trim(),
            grantedById: adminUserId ?? null,
          },
        }),
        (prisma.organization as any).update({
          where: { id: org.id },
          data: {
            subdomainEnabled: true,
            planType: planId,
            planActivatedAt: now,
            planExpiresAt: expiresAt,
            ...(plan.isTrial ? { trialUsed: true } : {}),
          },
        }),
      ]);

      return res.json({
        success: true,
        message: `${plan.name} багцыг амжилттай нэмлээ`,
        planType: planId,
        expiresAt,
        days,
      });
    } catch (err) {
      console.error("admin grant plan error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

export default router;
