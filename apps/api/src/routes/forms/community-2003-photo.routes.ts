import { Router, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getSupabase, ORG_IMAGES_BUCKET } from "../../lib/supabase";
import { COMMUNITY_PHOTO_MAX_BYTES } from "./community-2003-photo";

const photoDirectory = path.resolve(process.cwd(), "uploads/community-2003");
async function storePhoto(name: string, content: Buffer): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const bucket = getSupabase().storage.from(ORG_IMAGES_BUCKET);
    const key = `community-2003/${name}`;
    const { error } = await bucket.upload(key, content, {
      contentType: "image/webp",
      upsert: false,
    });
    if (error) throw error;
    return bucket.getPublicUrl(key).data.publicUrl;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Photo storage is not configured");
  await mkdir(photoDirectory, { recursive: true });
  await writeFile(path.join(photoDirectory, name), content);
  return `/api/forms/2003/photos/${name}`;
}
export function createCommunityPhotoRouter(
  store: (name: string, content: Buffer) => Promise<string> = storePhoto,
): ExpressRouter {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: COMMUNITY_PHOTO_MAX_BYTES, files: 1, fields: 0 },
  }).single("photo");
  router.post(
    "/forms/2003/photos",
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
    (req, res) => {
      upload(req, res, async (error: unknown) => {
        if (error)
          return res.status(400).json({
            message:
              "JPG, PNG эсвэл WebP зураг, 5 MB хүртэл хэмжээтэй нэг файл сонгоно уу.",
          });
        if (!req.file)
          return res.status(400).json({ message: "Зураг сонгоно уу." });
        let content: Buffer;
        try {
          const image = sharp(req.file.buffer, {
            limitInputPixels: 20_000_000,
            animated: false,
          });
          const metadata = await image.metadata();
          if (
            !metadata.format ||
            !["jpeg", "png", "webp"].includes(metadata.format)
          )
            return res
              .status(400)
              .json({ message: "JPG, PNG эсвэл WebP зураг сонгоно уу." });
          const size = Math.min(
            metadata.width || 640,
            metadata.height || 640,
            640,
          );
          content = await image
            .rotate()
            .resize(size, size, { fit: "cover" })
            .webp({ quality: 82 })
            .toBuffer();
        } catch {
          return res.status(400).json({
            message: "Зургийг уншиж чадсангүй. Өөр зураг сонгоно уу.",
          });
        }
        try {
          const url = await store(`${randomUUID()}.webp`, content);
          return res.status(201).json({ url });
        } catch {
          return res.status(503).json({
            message: "Зураг хадгалахад алдаа гарлаа. Дахин оролдоно уу.",
          });
        }
      });
    },
  );
  router.get("/forms/2003/photos/:name", (req, res) => {
    if (!/^[0-9a-f-]{36}\.webp$/.test(req.params.name))
      return res.sendStatus(404);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(path.join(photoDirectory, req.params.name), (error) => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  });
  return router;
}
