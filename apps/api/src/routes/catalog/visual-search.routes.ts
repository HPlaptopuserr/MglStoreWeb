import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import {
  VisualSearchError,
  visualSearchEnabled,
} from "../../services/visual-search/visual-search-errors";
import { searchCatalogByImage } from "../../services/visual-search/visual-search-service";
import { visualSearchReadiness } from "../../services/visual-search/visual-search-snapshot";
import { parseVisualSearchOptions } from "../../services/visual-search/visual-search-options";

function sendError(res: Response, error: VisualSearchError) {
  if (res.destroyed || res.writableEnded) return;
  if (error.status === 429) res.setHeader("Retry-After", "2");
  res
    .status(error.status)
    .json({
      code: error.code,
      message: error.message,
      requestId: res.getHeader("X-Request-Id"),
      retryable: [429, 503].includes(error.status),
    });
}

export function createVisualSearchRouter(
  search: typeof searchCatalogByImage = searchCatalogByImage,
  isEnabled: () => boolean = visualSearchEnabled,
  readiness = search === searchCatalogByImage
    ? visualSearchReadiness
    : async () => ({ ready: true, degraded: false }),
): Router {
  const router: Router = Router();
  router.use(
    ["/catalog/visual-search", "/catalog/search/capabilities"],
    (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Request-Id", randomUUID());
      next();
    },
  );
  router.get("/catalog/search/capabilities", async (_req, res) => {
    const enabled = isEnabled();
    const status = enabled
      ? await readiness()
      : { ready: false, degraded: false };
    res.json({
      image: {
        enabled,
        ...status,
        maxBytes: 5 * 1024 * 1024,
        formats: ["jpeg", "png", "webp"],
        responseVersion: 2,
        hybrid: true,
        filters: ["inStock", "priceMin", "priceMax", "sort"],
      },
    });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 6,
      fieldSize: 1024,
      parts: 8,
    },
  }).single("image");
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      sendError(
        res,
        new VisualSearchError(
          429,
          "VISUAL_SEARCH_RATE_LIMIT",
          "Түр хүлээгээд дахин хайна уу.",
        ),
      ),
  });
  let requestsInFlight = 0;
  router.post("/catalog/visual-search", limiter, async (req, res) => {
    if (!isEnabled())
      return sendError(
        res,
        new VisualSearchError(
          503,
          "VISUAL_SEARCH_NOT_READY",
          "Зургаар хайх үйлчилгээ түр ажиллахгүй байна.",
        ),
      );
    // Bound buffers before awaiting readiness or reading multipart data.
    if (requestsInFlight >= 5)
      return sendError(
        res,
        new VisualSearchError(
          429,
          "VISUAL_SEARCH_BUSY",
          "Түр хүлээгээд дахин хайна уу.",
        ),
      );
    requestsInFlight++;
    const abort = new AbortController();
    const closed = () => {
      if (!res.writableEnded) abort.abort();
    };
    res.on("close", closed);
    try {
      if (!(await readiness()).ready)
        throw new VisualSearchError(
          503,
          "VISUAL_SEARCH_NOT_READY",
          "Зургийн хайлт бэлтгэгдэж байна. Нэрээр нь хайх боломжтой.",
        );
      if (abort.signal.aborted) return;
      await new Promise<void>((resolve, reject) =>
        upload(req, res, (error: unknown) =>
          error ? reject(error) : resolve(),
        ),
      );
      if (!req.file)
        throw new VisualSearchError(
          400,
          "IMAGE_REQUIRED",
          "Хайх зургаа сонгоно уу.",
        );
      const options = parseVisualSearchOptions(req.body as unknown);
      const result = await search(req.file.buffer, options, abort.signal);
      if (!res.destroyed)
        res.json({ ...result, requestId: res.getHeader("X-Request-Id") });
    } catch (error: unknown) {
      if (error instanceof multer.MulterError) {
        const large = error.code === "LIMIT_FILE_SIZE";
        sendError(
          res,
          new VisualSearchError(
            large ? 413 : 400,
            large ? "IMAGE_TOO_LARGE" : "INVALID_UPLOAD",
            large
              ? "5 MB-аас бага зураг сонгоно уу."
              : "Зураг болон хайлтын нөхцөлөө шалгана уу.",
          ),
        );
      } else if (error instanceof VisualSearchError) sendError(res, error);
      else {
        console.error("Visual search unavailable", {
          requestId: res.getHeader("X-Request-Id"),
          reason: error instanceof Error ? error.name : "UnknownError",
        });
        sendError(
          res,
          new VisualSearchError(
            503,
            "VISUAL_SEARCH_UNAVAILABLE",
            "Зургийн хайлт түр ажиллахгүй байна. Дахин оролдоорой.",
          ),
        );
      }
    } finally {
      res.off("close", closed);
      if (req.file) req.file.buffer = Buffer.alloc(0);
      requestsInFlight--;
    }
  });
  return router;
}
export default createVisualSearchRouter();
