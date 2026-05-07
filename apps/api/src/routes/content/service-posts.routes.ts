import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { requireOrgPermission, assertOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();

const MAX_IMAGES = 5;

// ── GET /service-posts — public list (optionally filtered by organizationId)
router.get("/service-posts", async (req, res) => {
  try {
    const { organizationId, activeOnly } = req.query;

    const posts = await prisma.servicePost.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId: String(organizationId) } : {}),
        ...(activeOnly === "true" ? { isActive: true } : {}),
      },
      include: {
        images: true,
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(posts);
  } catch (error) {
    console.error("get service-posts error", error);
    res.status(500).json({ message: "Үйлчилгээний постуудыг авахад алдаа гарлаа" });
  }
});

// ── GET /service-posts/:id — single post
router.get("/service-posts/:id", async (req, res) => {
  try {
    const post = await prisma.servicePost.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        images: true,
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Пост олдсонгүй" });
    }

    // increment view count without blocking
    prisma.servicePost
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    res.json(post);
  } catch (error) {
    console.error("get service-post error", error);
    res.status(500).json({ message: "Постыг авахад алдаа гарлаа" });
  }
});

// ── POST /service-posts/:id/request — create a customer request for the vendor
router.post("/service-posts/:id/request", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    const { message } = req.body || {};

    if (!user?.userId) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }

    const post = await prisma.servicePost.findFirst({
      where: { id: req.params.id, deletedAt: null, isActive: true },
      select: {
        id: true,
        title: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Үйлчилгээ олдсонгүй" });
    }

    const cleanMessage = typeof message === "string" ? message.trim() : "";
    const description = [
      `Web үйлчилгээний постоос ирсэн хүсэлт: ${post.title}`,
      `Post ID: ${post.id}`,
      cleanMessage ? `Тайлбар: ${cleanMessage}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const request = await prisma.serviceRequest.create({
      data: {
        organizationId: post.organizationId,
        servicePostId: post.id,
        requestedById: user.userId,
        type: "OTHER",
        title: `${post.title} - үйлчилгээний хүсэлт`,
        description,
        status: "PENDING",
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true, phoneNumber: true },
            },
          },
        },
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error("create service-post request error", error);
    res.status(500).json({ message: "Үйлчилгээний хүсэлт илгээхэд алдаа гарлаа" });
  }
});

// ── POST /service-posts — create (vendor)
router.post("/service-posts", requireAuth, requireOrgPermission({ from: "body" }, Permission.MANAGE_SERVICES), async (req, res) => {
  try {
    const { organizationId, title, description, priceText, tags, images, isActive } = req.body;

    if (!organizationId || typeof organizationId !== "string") {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ message: "Гарчиг шаардлагатай" });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ message: "Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой" });
    }

    const imageUrls: string[] = Array.isArray(images) ? images.slice(0, MAX_IMAGES) : [];

    const post = await prisma.servicePost.create({
      data: {
        organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        priceText: priceText?.trim() || null,
        tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string") : [],
        isActive: isActive !== false,
        images: {
          create: imageUrls.map((url) => ({ url })),
        },
      },
      include: { images: true },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("create service-post error", error);
    res.status(500).json({ message: "Пост үүсгэхэд алдаа гарлаа" });
  }
});

// ── PATCH /service-posts/:id — update (vendor)
router.patch("/service-posts/:id", requireAuth, async (req, res) => {
  try {
    const { title, description, priceText, tags, images, isActive } = req.body;

    const existing = await prisma.servicePost.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Пост олдсонгүй" });
    }

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_SERVICES);
    if (!perm) return;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Гарчиг хоосон байж болохгүй" });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({ message: "Гарчиг 200 тэмдэгтээс хэтрэхгүй байх ёстой" });
      }
    }

    // rebuild images if provided
    const updateData: Parameters<typeof prisma.servicePost.update>[0]["data"] = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priceText !== undefined) updateData.priceText = priceText?.trim() || null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string") : [];
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Array.isArray(images)) {
      const imageUrls = images.slice(0, MAX_IMAGES);
      await prisma.servicePostImage.deleteMany({ where: { servicePostId: existing.id } });
      updateData.images = { create: imageUrls.map((url) => ({ url })) };
    }

    const post = await prisma.servicePost.update({
      where: { id: existing.id },
      data: updateData,
      include: { images: true },
    });

    res.json(post);
  } catch (error) {
    console.error("update service-post error", error);
    res.status(500).json({ message: "Пост шинэчлэхэд алдаа гарлаа" });
  }
});

// ── DELETE /service-posts/:id — soft delete (vendor)
router.delete("/service-posts/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.servicePost.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Пост олдсонгүй" });
    }

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_SERVICES);
    if (!perm) return;

    await prisma.servicePost.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: "Пост устгагдлаа" });
  } catch (error) {
    console.error("delete service-post error", error);
    res.status(500).json({ message: "Пост устгахад алдаа гарлаа" });
  }
});

export default router;
