import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import {
  normalizeVendorContentReviewStatus,
  VENDOR_CONTENT_REVIEW_STATUSES,
  type VendorContentReviewStatusValue,
} from "../../services/vendor-content-review.service";

const router: ExpressRouter = Router();

const CONTENT_TYPES = ["product", "service", "post"] as const;
type VendorContentType = (typeof CONTENT_TYPES)[number];

function normalizeContentType(value: unknown): VendorContentType | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return CONTENT_TYPES.includes(normalized as VendorContentType)
    ? (normalized as VendorContentType)
    : null;
}

function getUserName(user?: {
  email: string;
  profile: { fullName: string | null; phoneNumber: string | null } | null;
} | null) {
  return user?.profile?.fullName || user?.email || "Тодорхойгүй хэрэглэгч";
}

async function getUsersById(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      email: true,
      profile: { select: { fullName: true, phoneNumber: true } },
    },
  });
  return new Map(users.map((user) => [user.id, user]));
}

router.get(
  "/admin/vendor-content-review",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    try {
      const statusParam = String(req.query.status || "PENDING")
        .trim()
        .toUpperCase();
      const status =
        statusParam === "ALL"
          ? null
          : normalizeVendorContentReviewStatus(statusParam);
      const type = normalizeContentType(req.query.type);
      const limit = Math.min(
        Math.max(Number(req.query.limit || 100), 1),
        300,
      );

      if (statusParam !== "ALL" && !status) {
        return res.status(400).json({ message: "Буруу review status" });
      }

      const whereStatus = status ? { reviewStatus: status } : {};
      const [products, services, posts] = await Promise.all([
        !type || type === "product"
          ? prisma.product.findMany({
              where: { deletedAt: null, ...whereStatus },
              take: limit,
              orderBy: { updatedAt: "desc" },
              include: {
                images: { select: { url: true }, take: 1 },
                organization: {
                  select: { id: true, name: true, slug: true, logoUrl: true },
                },
              },
            })
          : [],
        !type || type === "service"
          ? prisma.servicePost.findMany({
              where: { deletedAt: null, ...whereStatus },
              take: limit,
              orderBy: { updatedAt: "desc" },
              include: {
                images: { select: { url: true }, take: 1 },
                organization: {
                  select: { id: true, name: true, slug: true, logoUrl: true },
                },
              },
            })
          : [],
        !type || type === "post"
          ? prisma.post.findMany({
              where: { organizationId: { not: null }, ...whereStatus },
              take: limit,
              orderBy: { updatedAt: "desc" },
              include: {
                organization: {
                  select: { id: true, name: true, slug: true, logoUrl: true },
                },
              },
            })
          : [],
      ]);

      const usersById = await getUsersById([
        ...products.map((item) => item.submittedById || ""),
        ...services.map((item) => item.submittedById || ""),
        ...posts.map((item) => item.submittedById || item.authorId),
      ]);

      const items = [
        ...products.map((item) => {
          const submittedBy = usersById.get(item.submittedById || "");
          return {
            id: item.id,
            type: "product" as const,
            title: item.name,
            description: item.description,
            priceText: `${Number(item.price).toLocaleString("mn-MN")}₮`,
            imageUrl: item.images[0]?.url || null,
            reviewStatus: item.reviewStatus,
            isActive: item.isActive,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            organization: item.organization,
            submittedBy: submittedBy
              ? {
                  id: submittedBy.id,
                  email: submittedBy.email,
                  fullName: getUserName(submittedBy),
                  phoneNumber: submittedBy.profile?.phoneNumber || null,
                }
              : null,
          };
        }),
        ...services.map((item) => {
          const submittedBy = usersById.get(item.submittedById || "");
          return {
            id: item.id,
            type: "service" as const,
            title: item.title,
            description: item.description,
            priceText: item.priceText,
            imageUrl: item.images[0]?.url || null,
            reviewStatus: item.reviewStatus,
            isActive: item.isActive,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            organization: item.organization,
            submittedBy: submittedBy
              ? {
                  id: submittedBy.id,
                  email: submittedBy.email,
                  fullName: getUserName(submittedBy),
                  phoneNumber: submittedBy.profile?.phoneNumber || null,
                }
              : null,
          };
        }),
        ...posts.map((item) => {
          const submittedBy = usersById.get(item.submittedById || item.authorId);
          return {
            id: item.id,
            type: "post" as const,
            title: item.type,
            description: item.content,
            priceText: null,
            imageUrl: item.imageUrls[0] || null,
            reviewStatus: item.reviewStatus,
            isActive: true,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            organization: item.organization,
            submittedBy: submittedBy
              ? {
                  id: submittedBy.id,
                  email: submittedBy.email,
                  fullName: getUserName(submittedBy),
                  phoneNumber: submittedBy.profile?.phoneNumber || null,
                }
              : null,
          };
        }),
      ]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, limit);

      const counts = await Promise.all(
        VENDOR_CONTENT_REVIEW_STATUSES.map(async (reviewStatus) => {
          const [productCount, serviceCount, postCount] = await Promise.all([
            prisma.product.count({
              where: { deletedAt: null, reviewStatus },
            }),
            prisma.servicePost.count({
              where: { deletedAt: null, reviewStatus },
            }),
            prisma.post.count({
              where: { organizationId: { not: null }, reviewStatus },
            }),
          ]);
          return [reviewStatus, productCount + serviceCount + postCount] as const;
        }),
      );

      res.json({
        items,
        counts: Object.fromEntries(counts),
      });
    } catch (error) {
      console.error("get vendor content review error", error);
      res.status(500).json({ message: "Vendor content review авахад алдаа гарлаа" });
    }
  },
);

router.patch(
  "/admin/vendor-content-review/:type/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    try {
      const type = normalizeContentType(req.params.type);
      const status = normalizeVendorContentReviewStatus(req.body?.status);
      const reviewerId = (req as any).user?.userId ?? null;

      if (!type) return res.status(400).json({ message: "Буруу content type" });
      if (!status || status === "PENDING") {
        return res.status(400).json({ message: "APPROVED эсвэл REJECTED status шаардлагатай" });
      }

      const data = {
        reviewStatus: status as VendorContentReviewStatusValue,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      };

      if (type === "product") {
        const item = await prisma.product.update({
          where: { id: req.params.id },
          data: {
            ...data,
            isActive: status === "APPROVED",
          },
          select: { id: true, reviewStatus: true, isActive: true },
        });
        return res.json(item);
      }

      if (type === "service") {
        const item = await prisma.servicePost.update({
          where: { id: req.params.id },
          data: {
            ...data,
            isActive: status === "APPROVED",
          },
          select: { id: true, reviewStatus: true, isActive: true },
        });
        return res.json(item);
      }

      const item = await prisma.post.update({
        where: { id: req.params.id },
        data,
        select: { id: true, reviewStatus: true },
      });
      return res.json(item);
    } catch (error) {
      console.error("update vendor content review error", error);
      res.status(500).json({ message: "Review status шинэчлэхэд алдаа гарлаа" });
    }
  },
);

export default router;
