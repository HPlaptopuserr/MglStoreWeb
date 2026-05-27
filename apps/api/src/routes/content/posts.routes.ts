import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";

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
    const posts = await prisma.post.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
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
        likes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const userId = (req as any).user?.id;
    const formatted = posts.map((post) => {
      const isLiked = userId ? post.likes.some((l) => l.userId === userId) : false;
      return {
        id: post.id,
        author: {
          id: post.author.id,
          fullName: post.author.profile?.fullName || "Ажилтан",
          avatarUrl: post.author.profile?.avatarUrl || null,
          role: post.author.role,
          isOfficial: post.isOfficial,
        },
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
router.post("/posts", requireAuth, upload.array("images", 10), async (req, res) => {
  try {
    const { content, type, tags } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ message: "Постын агуулга шаардлагатай" });
      return;
    }

    const authorId = (req as any).user.id;

    // Process files if uploaded
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      imageUrls = (req.files as Express.Multer.File[]).map(
        (file) => `/api/posts/uploads/${file.filename}`
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
          parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    const validTypes = ["ANNOUNCEMENT", "UPDATE", "ALERT", "PROMOTION", "GENERAL"];
    const postType = validTypes.includes(type) ? type : "GENERAL";

    const post = await prisma.post.create({
      data: {
        authorId,
        content: content.trim(),
        type: postType as any,
        imageUrls,
        tags: parsedTags,
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
});

// ── POST /posts/:id/like — toggle like
router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = (req as any).user.id;

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
