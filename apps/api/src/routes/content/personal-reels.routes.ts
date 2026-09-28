import {
  Router,
  type Router as ExpressRouter,
  type Request,
  type RequestHandler,
} from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  createReel,
  getReelById,
  listReels,
  softDeleteReel,
  type CreateReelInput,
  type ListReelsInput,
} from "../../services/reel.service";
import {
  removeStoredReelVideo,
  storeReelVideo,
  type StoredReelVideo,
} from "../../services/reel-storage.service";

export const PERSONAL_REEL_MAX_BYTES = 100 * 1024 * 1024;
const mimeTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PERSONAL_REEL_MAX_BYTES,
    files: 1,
    fields: 8,
    fieldSize: 12000,
  },
  fileFilter: (_req, file, done) => done(null, mimeTypes.has(file.mimetype)),
}).single("video");

const uploadVideo: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (!error) return next();
    const tooLarge =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      message: tooLarge
        ? "100 MB-аас бага видео сонгоорой."
        : "Видео файлыг шалгаад дахин сонгоорой.",
    });
  });
};

type PersonalReelOwner = {
  id: string;
  authorId: string | null;
  organizationId: string | null;
  deletedAt: Date | null;
};
interface PersonalReelDependencies {
  authenticate: RequestHandler;
  list: (input: ListReelsInput) => Promise<unknown>;
  create: (input: CreateReelInput) => Promise<unknown>;
  find: (id: string) => Promise<PersonalReelOwner | null>;
  get: (id: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  store: typeof storeReelVideo;
  discard: typeof removeStoredReelVideo;
}

function auth(req: Request) {
  return (req as Request & { user?: AuthPayload }).user;
}

function jsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}

function owns(reel: PersonalReelOwner | null, userId: string): boolean {
  return (
    !!reel &&
    reel.authorId === userId &&
    reel.organizationId === null &&
    reel.deletedAt === null
  );
}

function integer(value: unknown, maximum: number): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : undefined;
}

function isVideo(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  return mime === "video/webm"
    ? buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : buffer.toString("ascii", 4, 8) === "ftyp";
}

export function createPersonalReelsRouter(
  overrides: Partial<PersonalReelDependencies> = {},
): ExpressRouter {
  const deps: PersonalReelDependencies = {
    authenticate: requireAuth,
    list: listReels,
    create: createReel,
    find: (id) =>
      prisma.reel.findUnique({
        where: { id },
        select: {
          id: true,
          authorId: true,
          organizationId: true,
          deletedAt: true,
        },
      }),
    get: (id) => getReelById(id, true),
    remove: softDeleteReel,
    store: storeReelVideo,
    discard: removeStoredReelVideo,
    ...overrides,
  };
  const router = Router();
  const uploadLimit = rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => auth(req)!.userId,
    message: { message: "Нэг минут хүлээгээд дахин илгээнэ үү." },
  });
  router.get("/me/reels/capabilities", deps.authenticate, (_req, res) => {
    res.json({
      enabled: true,
      maxBytes: PERSONAL_REEL_MAX_BYTES,
      maxDurationSeconds: 180,
      visibility: ["PUBLIC", "PRIVATE"],
    });
  });
  router.get("/me/reels", deps.authenticate, async (req, res) => {
    const user = auth(req);
    if (!user) return res.sendStatus(401);
    res.set("Cache-Control", "private, no-store");
    try {
      const result = await deps.list({
        authorId: user.userId,
        organizationId: null,
        includePending: true,
        includePrivate: true,
        limit: Number(req.query.limit || 20),
        cursor:
          typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      });
      return res.json(jsonSafe(result));
    } catch {
      return res
        .status(500)
        .json({ message: "Таны reel-үүдийг ачаалж чадсангүй." });
    }
  });
  router.post(
    "/me/reels",
    deps.authenticate,
    uploadLimit,
    uploadVideo,
    async (req, res) => {
      const user = auth(req);
      if (!user) return res.sendStatus(401);
      const body: Record<string, unknown> = (req.body ?? {}) as Record<
        string,
        unknown
      >;
      const id = typeof body.uploadId === "string" ? body.uploadId : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const caption =
        typeof body.caption === "string" ? body.caption.trim() : "";
      const duration = integer(body.durationSeconds, 180);
      const visibility = body.visibility ?? "PUBLIC";
      if (
        !uuid.test(id) ||
        title.length > 120 ||
        caption.length > 2200 ||
        !duration ||
        (visibility !== "PUBLIC" && visibility !== "PRIVATE")
      ) {
        return res.status(400).json({
          message: "3 минутаас богино видео болон тайлбараа шалгана уу.",
        });
      }
      if (!req.file || !isVideo(req.file.buffer, req.file.mimetype)) {
        return res
          .status(400)
          .json({ message: "MP4, MOV эсвэл WebM видео сонгоорой." });
      }
      let stored: StoredReelVideo | undefined;
      try {
        // The client retains this UUID when retrying an uncertain upload.
        const existing = await deps.find(id);
        if (existing) {
          if (!owns(existing, user.userId)) return res.sendStatus(409);
          return res.status(200).json(jsonSafe(await deps.get(id)));
        }
        stored = await deps.store({
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          authorId: user.userId,
          private: visibility === "PRIVATE",
        });
        const reel = await deps.create({
          id,
          organizationId: null,
          authorId: user.userId,
          visibility,
          title: title || "Миний reel",
          caption: caption || null,
          videoUrl: stored.url,
          storageBucket: stored.storageBucket,
          storagePath: stored.storagePath,
          durationSeconds: duration,
          width: integer(body.width, 16384),
          height: integer(body.height, 16384),
          fileSizeBytes: BigInt(req.file.size),
          mimeType: req.file.mimetype,
        });
        return res.status(201).json(jsonSafe(reel));
      } catch {
        // A DB commit may have succeeded even if signing the response failed.
        // Never delete the file belonging to a successfully persisted reel.
        const existing = await deps.find(id).catch(() => null);
        if (owns(existing, user.userId)) {
          try {
            return res.status(200).json(jsonSafe(await deps.get(id)));
          } catch {
            return res
              .status(503)
              .json({
                message: "Видео хадгалагдсан. Түр хүлээгээд дахин оролдоорой.",
              });
          }
        }
        if (stored) {
          await deps
            .discard(stored)
            .catch(() =>
              console.error("[personal-reels] upload cleanup failed"),
            );
        }
        return res
          .status(500)
          .json({ message: "Видео илгээгдсэнгүй. Дахин оролдоорой." });
      }
    },
  );
  router.delete("/me/reels/:id", deps.authenticate, async (req, res) => {
    const user = auth(req);
    if (!user) return res.sendStatus(401);
    try {
      const reel = await deps.find(req.params.id);
      if (!owns(reel, user.userId)) return res.sendStatus(404);
      await deps.remove(req.params.id);
      return res.json({ ok: true });
    } catch {
      return res
        .status(500)
        .json({ message: "Reel устгагдсангүй. Дахин оролдоорой." });
    }
  });
  return router;
}
