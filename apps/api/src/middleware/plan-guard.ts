/**
 * Plan Guard Middleware
 * Enforces vendor subscription plan limits on protected routes.
 */
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@mgl/database";
import { isFullAdmin } from "@mgl/types";
import { getPlan } from "../routes/vendor/vendor-upgrade.routes";
import { resolveVendorPlanEntitlement } from "../services/vendor-plan-entitlement.service";

type VendorPlanOrganization = NonNullable<
  Awaited<ReturnType<typeof resolveVendorPlanEntitlement>>
>;

interface VendorPlanRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
  vendorOrg?: VendorPlanOrganization;
  remainingProductSlots?: number;
}

// ─── Helper: get org from authenticated user ──────────────────────────
async function getOrgForRequest(req: Request) {
  const userId = (req as VendorPlanRequest).user?.userId;
  if (!userId) return null;

  const member = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          subdomainEnabled: true,
          planType: true,
          planExpiresAt: true,
          trialUsed: true,
        },
      },
    },
  });
  return member?.organization
    ? resolveVendorPlanEntitlement(member.organization.id)
    : null;
}

// ─── Helper: get org from body/query organizationId ──────────────────
async function getOrgById(orgId: string) {
  return resolveVendorPlanEntitlement(orgId);
}

// ─── Determine if plan is currently active ───────────────────────────
export function isPlanActive(org: {
  isActive?: boolean;
  subdomainEnabled: boolean;
  planExpiresAt: Date | string | null;
}): boolean {
  if (typeof org.isActive === "boolean") return org.isActive;
  if (!org.subdomainEnabled) return false;
  if (!org.planExpiresAt) return false;
  return new Date(org.planExpiresAt) > new Date();
}

// ─── requireActivePlan ───────────────────────────────────────────────
/**
 * Middleware: ensure the vendor org has an active (non-expired) plan.
 * Reads organizationId from: body → query → resolves via user's membership.
 */
export function requireActivePlan(source: "body" | "query" | "user" = "body") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req as VendorPlanRequest;
      const userRole = request.user?.role;
      if (userRole && isFullAdmin(userRole)) {
        return next();
      }

      let org: Awaited<ReturnType<typeof getOrgById>> | null = null;

      if (source === "user") {
        org = await getOrgForRequest(req);
      } else {
        const orgId = (
          source === "body"
            ? req.body?.organizationId
            : req.query?.organizationId
        ) as string | undefined;
        if (orgId) {
          org = await getOrgById(orgId);
        } else {
          // Fall back to user's org
          org = await getOrgForRequest(req);
        }
      }

      if (!org) {
        return res.status(404).json({
          message: "Байгууллага олдсонгүй",
          code: "ORG_NOT_FOUND",
        });
      }

      if (!org.isActive) {
        return res.status(403).json({
          message:
            org.effectivePlanExpiresAt || org.planExpiresAt
              ? "Таны план дууссан байна. Үргэлжлүүлэхийн тулд сунгана уу."
              : "Энэ үйлдлийг хийхийн тулд идэвхтэй план шаардлагатай.",
          code: "PLAN_EXPIRED",
          upgradeUrl: "/upgrade",
        });
      }

      // Attach org to request for downstream use
      request.vendorOrg = org;
      next();
    } catch (err) {
      console.error("requireActivePlan error", err);
      next(err);
    }
  };
}

// ─── checkProductLimit ───────────────────────────────────────────────
/**
 * Checks if adding `count` more products would exceed the plan's maxProducts.
 * Call AFTER requireActivePlan (uses req.vendorOrg).
 */
export function checkProductLimit(count = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = (req as VendorPlanRequest).vendorOrg;
      if (!org || !org.effectivePlanType) return next();

      const plan = getPlan(org.effectivePlanType);
      if (!plan || plan.maxProducts === -1) {
        // Unlimited
        return next();
      }

      const currentCount = await prisma.product.count({
        where: { organizationId: org.id, deletedAt: null },
      });

      if (currentCount + count > plan.maxProducts) {
        return res.status(403).json({
          message: `Таны план дээд тал нь ${plan.maxProducts} бараа зөвшөөрдөг. Одоо ${currentCount} бараа бүртгэлтэй байна. Дахин нэмэхийн тулд планаа сунга.`,
          code: "PRODUCT_LIMIT_REACHED",
          limit: plan.maxProducts,
          current: currentCount,
          upgradeUrl: "/upgrade",
        });
      }

      next();
    } catch (err) {
      console.error("checkProductLimit error", err);
      next(err);
    }
  };
}

// ─── checkImportLimit ───────────────────────────────────────────────
/**
 * For bulk import — checks if adding `rowCount` products would exceed the limit.
 * rowCount is extracted from req.body.rowCount or defaults to 1.
 */
export function checkImportLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req as VendorPlanRequest;
      const org = request.vendorOrg;
      if (!org || !org.effectivePlanType) return next();

      const plan = getPlan(org.effectivePlanType);
      if (!plan || plan.maxProducts === -1) return next();

      const currentCount = await prisma.product.count({
        where: { organizationId: org.id, deletedAt: null },
      });

      // We can't know exact count before parsing, so just warn if already at limit
      if (currentCount >= plan.maxProducts) {
        return res.status(403).json({
          message: `Таны план дээд тал нь ${plan.maxProducts} бараа зөвшөөрдөг. Одоо ${currentCount} бараа бүртгэлтэй байна.`,
          code: "PRODUCT_LIMIT_REACHED",
          limit: plan.maxProducts,
          current: currentCount,
          upgradeUrl: "/upgrade",
        });
      }

      // Attach remaining slots for downstream use
      request.remainingProductSlots = plan.maxProducts - currentCount;
      next();
    } catch (err) {
      console.error("checkImportLimit error", err);
      next(err);
    }
  };
}
