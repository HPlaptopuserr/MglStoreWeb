import express, { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import {
  ReelInteractionType,
  VendorContentReviewStatus,
  type Prisma,
} from "@mgl/database";
import { Permission } from "@mgl/types";
import {
  optionalAuth,
  requireAnyAdmin,
  requireAuth,
  type AuthPayload,
} from "../../middleware/auth";
import { assertOrgPermission } from "../../services/permission.service";
import {
  createReel,
  getReelById,
  listReels,
  recordReelInteraction,
  reviewReel,
  setReelLike,
  softDeleteReel,
  updateReel,
} from "../../services/reel.service";
import {
  LOCAL_REELS_UPLOAD_DIR,
  REELS_BUCKET,
  storeReelVideo,
} from "../../services/reel-storage.service";

const router: ExpressRouter = Router();

const REEL_VIDEO_LIMIT_BYTES = Number(
  process.env.REEL_VIDEO_LIMIT_BYTES || 250 * 1024 * 1024,
);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REEL_VIDEO_LIMIT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Зөвхөн MP4, WebM, MOV видео файл зөвшөөрөгдөнө"));
    }
  },
});

router.use("/reels/uploads", express.static(LOCAL_REELS_UPLOAD_DIR));

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function asOptionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const text = asString(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  if (typeof value === "object") return value as Prisma.InputJsonValue;
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed === null ? undefined : (parsed as Prisma.InputJsonValue);
  } catch {
    return undefined;
  }
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) =>
      typeof current === "bigint" ? current.toString() : current,
    ),
  ) as T;
}

function getAuth(req: express.Request) {
  return (req as any).user as AuthPayload | undefined;
}

router.get("/reels/health", (_req, res) => {
  return res.json({
    bucket: REELS_BUCKET,
    storage:
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
        ? "supabase"
        : "local",
    maxMb: Math.round(REEL_VIDEO_LIMIT_BYTES / 1024 / 1024),
  });
});

router.get("/reels", optionalAuth, async (req, res) => {
  try {
    const result = await listReels({
      organizationId: asOptionalString(req.query.organizationId) || undefined,
      businessCategoryId:
        asOptionalString(req.query.businessCategoryId) || undefined,
      productId: asOptionalString(req.query.productId) || undefined,
      authorId: asOptionalString(req.query.authorId) || undefined,
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
      cursor: asOptionalString(req.query.cursor) || undefined,
    });

    return res.json(toJsonSafe(result));
  } catch (error) {
    console.error("[reels:list]", error);
    return res
      .status(500)
      .json({ message: "Reel жагсаалт авахад алдаа гарлаа" });
  }
});

router.get("/vendor/reels", requireAuth, async (req, res) => {
  try {
    const organizationId = asString(req.query.organizationId);
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }

    const permission = await assertOrgPermission(
      req,
      res,
      organizationId,
      Permission.MANAGE_PRODUCTS,
    );
    if (!permission) return;

    const result = await listReels({
      organizationId,
      includePending: true,
      limit: Number(req.query.limit || 20),
      offset: Number(req.query.offset || 0),
      cursor: asOptionalString(req.query.cursor) || undefined,
    });

    return res.json(toJsonSafe(result));
  } catch (error) {
    console.error("[vendor:reels:list]", error);
    return res
      .status(500)
      .json({ message: "Vendor reel жагсаалт авахад алдаа гарлаа" });
  }
});

router.get("/reels/:id", optionalAuth, async (req, res) => {
  try {
    const reel = await getReelById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel олдсонгүй" });
    return res.json(toJsonSafe(reel));
  } catch (error) {
    console.error("[reels:get]", error);
    return res.status(500).json({ message: "Reel авахад алдаа гарлаа" });
  }
});

router.post(
  "/reels",
  requireAuth,
  videoUpload.single("video"),
  async (req, res) => {
    try {
      const user = getAuth(req);
      const organizationId = asString(req.body.organizationId);
      if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });
      if (!organizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "video файл шаардлагатай" });
      }

      const permission = await assertOrgPermission(
        req,
        res,
        organizationId,
        Permission.MANAGE_PRODUCTS,
      );
      if (!permission) return;

      const stored = await storeReelVideo({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        organizationId,
      });

      const reel = await createReel({
        organizationId,
        authorId: user.userId,
        title: asOptionalString(req.body.title),
        caption: asOptionalString(req.body.caption),
        description: asOptionalString(req.body.description),
        businessCategoryId: asOptionalString(req.body.businessCategoryId),
        productId: asOptionalString(req.body.productId),
        videoUrl: stored.url,
        thumbnailUrl: asOptionalString(req.body.thumbnailUrl),
        storageBucket: stored.storageBucket,
        storagePath: stored.storagePath,
        durationSeconds: asOptionalNumber(req.body.durationSeconds),
        width: asOptionalNumber(req.body.width),
        height: asOptionalNumber(req.body.height),
        fileSizeBytes: BigInt(req.file.size),
        mimeType: req.file.mimetype,
        tags: parseTags(req.body.tags),
        metadata: parseMetadata(req.body.metadata),
      });

      return res.status(201).json(toJsonSafe(reel));
    } catch (error) {
      console.error("[reels:create]", error);
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Reel оруулахад алдаа гарлаа",
      });
    }
  },
);

router.patch("/reels/:id", requireAuth, async (req, res) => {
  try {
    const existing = await getReelById(req.params.id, true);
    if (!existing?.organizationId) {
      return res.status(404).json({ message: "Reel олдсонгүй" });
    }

    const permission = await assertOrgPermission(
      req,
      res,
      existing.organizationId,
      Permission.MANAGE_PRODUCTS,
    );
    if (!permission) return;

    const reel = await updateReel(req.params.id, {
      title:
        req.body.title === undefined
          ? undefined
          : asOptionalString(req.body.title),
      caption:
        req.body.caption === undefined
          ? undefined
          : asOptionalString(req.body.caption),
      description:
        req.body.description === undefined
          ? undefined
          : asOptionalString(req.body.description),
      businessCategoryId:
        req.body.businessCategoryId === undefined
          ? undefined
          : asOptionalString(req.body.businessCategoryId),
      productId:
        req.body.productId === undefined
          ? undefined
          : asOptionalString(req.body.productId),
      thumbnailUrl:
        req.body.thumbnailUrl === undefined
          ? undefined
          : asOptionalString(req.body.thumbnailUrl),
      tags: req.body.tags === undefined ? undefined : parseTags(req.body.tags),
    });

    return res.json(toJsonSafe(reel));
  } catch (error) {
    console.error("[reels:update]", error);
    return res.status(500).json({ message: "Reel шинэчлэхэд алдаа гарлаа" });
  }
});

router.delete("/reels/:id", requireAuth, async (req, res) => {
  try {
    const existing = await getReelById(req.params.id, true);
    if (!existing?.organizationId) {
      return res.status(404).json({ message: "Reel олдсонгүй" });
    }

    const permission = await assertOrgPermission(
      req,
      res,
      existing.organizationId,
      Permission.MANAGE_PRODUCTS,
    );
    if (!permission) return;

    await softDeleteReel(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    console.error("[reels:delete]", error);
    return res.status(500).json({ message: "Reel устгахад алдаа гарлаа" });
  }
});

router.post("/reels/:id/events", optionalAuth, async (req, res) => {
  try {
    const type = asString(req.body.type).toUpperCase() as ReelInteractionType;
    if (!Object.values(ReelInteractionType).includes(type)) {
      return res.status(400).json({ message: "event type буруу байна" });
    }

    const user = getAuth(req);
    const interaction = await recordReelInteraction({
      reelId: req.params.id,
      userId: user?.userId,
      visitorId: asOptionalString(req.body.visitorId) || undefined,
      type,
      watchSeconds: asOptionalNumber(req.body.watchSeconds),
      watchPercent: asOptionalNumber(req.body.watchPercent),
      source: asOptionalString(req.body.source),
      metadata: parseMetadata(req.body.metadata),
    });

    return res.status(201).json(toJsonSafe(interaction));
  } catch (error) {
    console.error("[reels:event]", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Reel event хадгалахад алдаа гарлаа",
    });
  }
});

router.post("/reels/:id/like", optionalAuth, async (req, res) => {
  try {
    const user = getAuth(req);
    const liked = req.body.liked === true;
    const result = await setReelLike({
      reelId: req.params.id,
      liked,
      userId: user?.userId,
      visitorId: asOptionalString(req.body.visitorId) || undefined,
      source: asOptionalString(req.body.source),
    });

    return res.json(result);
  } catch (error) {
    console.error("[reels:like]", error);
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Reel like шинэчлэхэд алдаа гарлаа",
    });
  }
});

router.patch(
  "/admin/reels/:id/review",
  requireAuth,
  requireAnyAdmin,
  async (req, res) => {
    try {
      const status = asString(
        req.body.reviewStatus,
      ).toUpperCase() as VendorContentReviewStatus;
      if (!Object.values(VendorContentReviewStatus).includes(status)) {
        return res.status(400).json({ message: "reviewStatus буруу байна" });
      }

      const user = getAuth(req);
      if (!user) return res.status(401).json({ message: "Нэвтрээгүй байна" });

      const reel = await reviewReel(req.params.id, user.userId, status);
      return res.json(toJsonSafe(reel));
    } catch (error) {
      console.error("[reels:review]", error);
      return res
        .status(500)
        .json({ message: "Reel review хийхэд алдаа гарлаа" });
    }
  },
);

export default router;
