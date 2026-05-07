import type { Request, Response, NextFunction } from "express";
import { prisma } from "@mgl/database";
import { resolvePlan, getPlan, type Plan } from "../routes/vendor/vendor-upgrade.routes";

async function getOrgForRequest(req: Request) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return null;

  const member = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          planType: true,
          planExpiresAt: true,
          trialUsed: true,
        },
      },
    },
  });
  return member?.organization ?? null;
}

async function getOrgById(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      planType: true,
      planExpiresAt: true,
      trialUsed: true,
    },
  });
}

export function isPlanActive(org: { planExpiresAt: Date | string | null }): boolean {
  if (!org.planExpiresAt) return false;
  return new Date(org.planExpiresAt) > new Date();
}

async function getPlanForOrg(org: { planType: string | null }): Promise<Plan | undefined> {
  if (!org.planType) return undefined;
  return (await resolvePlan(org.planType)) ?? getPlan(org.planType);
}

export function requireActivePlan(source: "body" | "query" | "user" = "body") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let org: Awaited<ReturnType<typeof getOrgById>> | null = null;

      if (source === "user") {
        org = await getOrgForRequest(req);
      } else {
        const orgId = (source === "body" ? req.body?.organizationId : req.query?.organizationId) as string | undefined;
        org = orgId ? await getOrgById(orgId) : await getOrgForRequest(req);
      }

      if (!org) {
        return res.status(404).json({ message: "Байгууллага олдсонгүй", code: "ORG_NOT_FOUND" });
      }

      if (!isPlanActive(org)) {
        return res.status(403).json({
          message: org.planExpiresAt
            ? "Таны план дууссан байна. Үргэлжлүүлэхийн тулд сунгана уу."
            : "Энэ үйлдлийг хийхийн тулд идэвхтэй план шаардлагатай.",
          code: "PLAN_EXPIRED",
          upgradeUrl: "/upgrade",
        });
      }

      (req as any).vendorOrg = org;
      next();
    } catch (err) {
      console.error("requireActivePlan error", err);
      next(err);
    }
  };
}

export function checkProductLimit(count = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = (req as any).vendorOrg as Awaited<ReturnType<typeof getOrgById>>;
      if (!org || !org.planType) return next();

      const plan = await getPlanForOrg(org);
      if (!plan || plan.maxProducts === -1) return next();

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

export function checkImportLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = (req as any).vendorOrg as Awaited<ReturnType<typeof getOrgById>>;
      if (!org || !org.planType) return next();

      const plan = await getPlanForOrg(org);
      if (!plan || plan.maxProducts === -1) return next();

      const currentCount = await prisma.product.count({
        where: { organizationId: org.id, deletedAt: null },
      });

      if (currentCount >= plan.maxProducts) {
        return res.status(403).json({
          message: `Таны план дээд тал нь ${plan.maxProducts} бараа зөвшөөрдөг. Одоо ${currentCount} бараа бүртгэлтэй байна.`,
          code: "PRODUCT_LIMIT_REACHED",
          limit: plan.maxProducts,
          current: currentCount,
          upgradeUrl: "/upgrade",
        });
      }

      (req as any).remainingProductSlots = plan.maxProducts - currentCount;
      next();
    } catch (err) {
      console.error("checkImportLimit error", err);
      next(err);
    }
  };
}
