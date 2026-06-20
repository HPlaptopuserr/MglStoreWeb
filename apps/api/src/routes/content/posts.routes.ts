import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma, VendorContentReviewStatus } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { assertOrgPermission } from "../../services/permission.service";
import { getReviewStatusForVendorMutation } from "../../services/vendor-content-review.service";

const uploadsDir = path.resolve(__dirname, "../../../uploads/posts");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `post-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router: ExpressRouter = Router();

// ── Serve uploaded files ─────────────────────────────────────────────────
router.use("/posts/uploads", (req, res) => {
  const filePath = path.join(uploadsDir, path.basename(req.path));
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// ── GET /posts — list of feed posts
router.get("/posts", async (req, res) => {
  try {
    const type = req.query.type as string;
    const rawLimit = parseInt(String(req.query.limit || ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(50, rawLimit) : 0;
    const rawOffset = parseInt(String(req.query.offset || ""), 10);
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId.trim()
        : "";
    const posts = await prisma.post.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(organizationId
          ? { reviewStatus: "APPROVED" }
          : { OR: [{ organizationId: null }, { reviewStatus: "APPROVED" }] }),
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
          },
        },
        likes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      ...(limit > 0
        ? { skip: offset, take: limit }
        : offset > 0
          ? { skip: offset }
          : {}),
    });

    const userId = (req as any).user?.userId;
    const formatted = posts.map((post) => {
      const isLiked = userId
        ? post.likes.some((l) => l.userId === userId)
        : false;
      return {
        id: post.id,
        author: {
          id: post.author.id,
          fullName: post.author.profile?.fullName || "Ажилтан",
          avatarUrl: post.author.profile?.avatarUrl || null,
          role: post.author.role,
          isOfficial: post.isOfficial,
        },
        organization: post.organization,
        type: post.type,
        content: post.content,
        imageUrls: post.imageUrls,
        tags: post.tags,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isLiked,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("GET /posts error", error);
    res.status(500).json({ message: "Мэдээ ачаалахад алдаа гарлаа" });
  }
});

// ── POST /posts — create a feed post
router.post(
  "/posts",
  requireAuth,
  upload.array("images", 10),
  async (req, res) => {
    try {
      const { content, type, tags, organizationId } = req.body;
      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        res.status(400).json({ message: "Постын агуулга шаардлагатай" });
        return;
      }

      const authorId = (req as any).user.userId;
      const targetOrganizationId =
        typeof organizationId === "string" && organizationId.trim()
          ? organizationId.trim()
          : null;

      if (targetOrganizationId) {
        const permission = await assertOrgPermission(
          req,
          res,
          targetOrganizationId,
          Permission.MANAGE_SERVICES,
        );
        if (!permission) return;
      }

      // Process files if uploaded
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        imageUrls = (req.files as Express.Multer.File[]).map(
          (file) => `/api/posts/uploads/${file.filename}`,
        );
      } else if (req.body.imageUrls) {
        imageUrls = Array.isArray(req.body.imageUrls)
          ? req.body.imageUrls
          : [req.body.imageUrls];
      }

      // Process tags
      let parsedTags: string[] = [];
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string") {
          try {
            parsedTags = JSON.parse(tags);
          } catch {
            parsedTags = tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
          }
        }
      }

      const validTypes = [
        "ANNOUNCEMENT",
        "UPDATE",
        "ALERT",
        "PROMOTION",
        "GENERAL",
      ];
      const postType = validTypes.includes(type) ? type : "GENERAL";

      const reviewData = targetOrganizationId
        ? await getReviewStatusForVendorMutation()
        : {
            reviewStatus: VendorContentReviewStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedById: null,
          };

      const post = await prisma.post.create({
        data: {
          authorId,
          submittedById: authorId,
          organizationId: targetOrganizationId,
          content: content.trim(),
          type: postType as any,
          imageUrls,
          tags: parsedTags,
          isOfficial: Boolean(targetOrganizationId),
          ...reviewData,
        },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
      });

      res.status(201).json({
        id: post.id,
        author: {
          id: post.author.id,
          fullName: post.author.profile?.fullName || "Ажилтан",
          avatarUrl: post.author.profile?.avatarUrl || null,
          role: post.author.role,
          isOfficial: post.isOfficial,
        },
        organization: post.organization,
        type: post.type,
        content: post.content,
        imageUrls: post.imageUrls,
        tags: post.tags,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isLiked: false,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });
    } catch (error) {
      console.error("POST /posts error", error);
      res.status(500).json({ message: "Пост үүсгэхэд алдаа гарлаа" });
    }
  },
);

// ── PATCH /posts/:id — update an organization feed post
router.patch("/posts/:id", requireAuth, async (req, res) => {
  try {
    const { content, type } = req.body as {
      content?: string;
      type?: string;
    };

    const existing = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, organizationId: true },
    });
    if (!existing) {
      return res.status(404).json({ message: "Пост олдсонгүй" });
    }

    const userId = (req as any).user?.userId;
    if (existing.organizationId) {
      const permission = await assertOrgPermission(
        req,
        res,
        existing.organizationId,
        Permission.MANAGE_SERVICES,
      );
      if (!permission) return;
    } else if (existing.authorId !== userId) {
      return res.status(403).json({ message: "Пост засах эрхгүй байна" });
    }

    const data: Parameters<typeof prisma.post.update>[0]["data"] = {};
    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({ message: "Постын агуулга шаардлагатай" });
      }
      data.content = content.trim();
    }
    if (type !== undefined) {
      const validTypes = [
        "ANNOUNCEMENT",
        "UPDATE",
        "ALERT",
        "PROMOTION",
        "GENERAL",
      ];
      data.type = (validTypes.includes(type) ? type : "GENERAL") as any;
    }
    if (existing.organizationId) {
      Object.assign(data, {
        ...(await getReviewStatusForVendorMutation()),
        submittedById: userId,
      });
    }

    const post = await prisma.post.update({
      where: { id: existing.id },
      data,
    });

    return res.json(post);
  } catch (error) {
    console.error("PATCH /posts/:id error", error);
    return res.status(500).json({ message: "Пост засахад алдаа гарлаа" });
  }
});

// ── DELETE /posts/:id — remove an organization feed post
router.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, organizationId: true },
    });
    if (!existing) {
      return res.status(404).json({ message: "Пост олдсонгүй" });
    }

    const userId = (req as any).user?.userId;
    if (existing.organizationId) {
      const permission = await assertOrgPermission(
        req,
        res,
        existing.organizationId,
        Permission.MANAGE_SERVICES,
      );
      if (!permission) return;
    } else if (existing.authorId !== userId) {
      return res.status(403).json({ message: "Пост устгах эрхгүй байна" });
    }

    await prisma.post.delete({ where: { id: existing.id } });
    return res.json({ message: "Пост устгагдлаа" });
  } catch (error) {
    console.error("DELETE /posts/:id error", error);
    return res.status(500).json({ message: "Пост устгахад алдаа гарлаа" });
  }
});

// ── POST /posts/:id/like — toggle like
router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = (req as any).user.userId;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      res.status(404).json({ message: "Пост олдсонгүй" });
      return;
    }

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.postLike.delete({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      res.json({ liked: false });
    } else {
      await prisma.$transaction([
        prisma.postLike.create({
          data: {
            postId,
            userId,
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      res.json({ liked: true });
    }
  } catch (error) {
    console.error("POST /posts/:id/like error", error);
    res.status(500).json({ message: "Үйлдэл хийхэд алдаа гарлаа" });
  }
});

export default router;
