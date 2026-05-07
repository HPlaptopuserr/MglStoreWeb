import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";

const router: ExpressRouter = Router();

/**
 * GET /api/admin/upgrade-plans
 * List all plans (admin sees inactive too)
 */
router.get(
  "/admin/upgrade-plans",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (_req, res) => {
    try {
      const plans = await (prisma.upgradePlan as any).findMany({
        orderBy: { sortOrder: "asc" },
      });
      return res.json({
        success: true,
        plans: plans.map((p: any) => ({ ...p, price: Number(p.price) })),
      });
    } catch (err) {
      console.error("list upgrade plans error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

/**
 * POST /api/admin/upgrade-plans
 * Create a new plan
 */
router.post(
  "/admin/upgrade-plans",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const {
        code, name, description, price, durationDays,
        maxProducts, maxImages, maxCategories,
        hasBanner, hasAnalytics, isTrial,
        badge, isRecommended, isActive, sortOrder,
      } = req.body;

      if (!code || !name || price == null || !durationDays) {
        return res.status(400).json({ success: false, message: "code, name, price, durationDays шаардлагатай" });
      }

      // Ensure only one recommended plan
      if (isRecommended) {
        await (prisma.upgradePlan as any).updateMany({
          where: { isRecommended: true },
          data: { isRecommended: false },
        });
      }

      const plan = await (prisma.upgradePlan as any).create({
        data: {
          code,
          name,
          description: description ?? null,
          price,
          durationDays: Number(durationDays),
          maxProducts: Number(maxProducts ?? 0),
          maxImages: Number(maxImages ?? 0),
          maxCategories: Number(maxCategories ?? 0),
          hasBanner: Boolean(hasBanner),
          hasAnalytics: Boolean(hasAnalytics),
          isTrial: Boolean(isTrial),
          badge: badge ?? null,
          isRecommended: Boolean(isRecommended),
          isActive: isActive !== false,
          sortOrder: Number(sortOrder ?? 0),
        },
      });

      return res.json({ success: true, plan: { ...plan, price: Number(plan.price) } });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ success: false, message: "Ийм code бүхий багц аль хэдийн байна" });
      }
      console.error("create upgrade plan error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

/**
 * PUT /api/admin/upgrade-plans/:id
 * Update a plan
 */
router.put(
  "/admin/upgrade-plans/:id",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name, description, price, durationDays,
        maxProducts, maxImages, maxCategories,
        hasBanner, hasAnalytics, isTrial,
        badge, isRecommended, isActive, sortOrder,
      } = req.body;

      const existing = await (prisma.upgradePlan as any).findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: "Багц олдсонгүй" });

      // Ensure only one recommended plan
      if (isRecommended && !existing.isRecommended) {
        await (prisma.upgradePlan as any).updateMany({
          where: { isRecommended: true, id: { not: id } },
          data: { isRecommended: false },
        });
      }

      const updated = await (prisma.upgradePlan as any).update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(durationDays !== undefined ? { durationDays: Number(durationDays) } : {}),
          ...(maxProducts !== undefined ? { maxProducts: Number(maxProducts) } : {}),
          ...(maxImages !== undefined ? { maxImages: Number(maxImages) } : {}),
          ...(maxCategories !== undefined ? { maxCategories: Number(maxCategories) } : {}),
          ...(hasBanner !== undefined ? { hasBanner: Boolean(hasBanner) } : {}),
          ...(hasAnalytics !== undefined ? { hasAnalytics: Boolean(hasAnalytics) } : {}),
          ...(isTrial !== undefined ? { isTrial: Boolean(isTrial) } : {}),
          ...(badge !== undefined ? { badge: badge || null } : {}),
          ...(isRecommended !== undefined ? { isRecommended: Boolean(isRecommended) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
          ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        },
      });

      return res.json({ success: true, plan: { ...updated, price: Number(updated.price) } });
    } catch (err) {
      console.error("update upgrade plan error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

/**
 * PATCH /api/admin/upgrade-plans/:id/toggle
 * Toggle isActive
 */
router.patch(
  "/admin/upgrade-plans/:id/toggle",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await (prisma.upgradePlan as any).findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: "Багц олдсонгүй" });

      const updated = await (prisma.upgradePlan as any).update({
        where: { id },
        data: { isActive: !existing.isActive },
      });

      return res.json({ success: true, plan: { ...updated, price: Number(updated.price) } });
    } catch (err) {
      console.error("toggle upgrade plan error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

/**
 * DELETE /api/admin/upgrade-plans/:id
 * Soft-delete by setting isActive=false (hard delete only if no invoices)
 */
router.delete(
  "/admin/upgrade-plans/:id",
  requireAuth,
  requirePlatformPermission(Permission.VIEW_SYSTEM_DASHBOARD),
  async (req, res) => {
    try {
      const { id } = req.params;
      const invoiceCount = await (prisma.orgUpgradePlan as any).count({ where: { planId: id } });

      if (invoiceCount > 0) {
        // Soft delete — keep for historical invoices
        await (prisma.upgradePlan as any).update({ where: { id }, data: { isActive: false } });
        return res.json({ success: true, message: "Багцыг идэвхгүй болгосон (нэхэмжлэлтэй учир устгаагүй)" });
      }

      await (prisma.upgradePlan as any).delete({ where: { id } });
      return res.json({ success: true, message: "Багц устгагдлаа" });
    } catch (err) {
      console.error("delete upgrade plan error", err);
      return res.status(500).json({ success: false, message: "Серверийн алдаа" });
    }
  }
);

export default router;
