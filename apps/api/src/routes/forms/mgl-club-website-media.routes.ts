import { requireClubAdmin } from "./mgl-club-access";
import { Router, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";
import { getSupabase, ORG_IMAGES_BUCKET } from "../../lib/supabase";
const directory = path.resolve(process.cwd(), "uploads/mgl-club-website");
export function createClubWebsiteMediaRouter(
  store: (name: string, bytes: Buffer) => Promise<string> = storeImage,
): ExpressRouter {
  const router = Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
    }).single("image");
  router.post(
    "/forms/mgl-club/my-companies/:id/website/images",
    requireAuth,
    requireClubAdmin,
    rateLimit({
      windowMs: 60000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
    async (req, res) => {
      try {
        const id = String(req.params.id);
        if (!/^[0-9a-f-]{36}$/i.test(id)) return res.sendStatus(403);
        const row = await prisma.formResponse.findFirst({
          where: { id, form: { slug: "mgl-club", isActive: true } },
        });
        const raw = row?.data;
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
          return res.sendStatus(403);
      } catch {
        return res
          .status(503)
          .json({ message: "Байгууллагын эрхийг шалгаж чадсангүй." });
      }
      upload(req, res, async (error: unknown) => {
        if (error || !req.file)
          return res.status(400).json({
            message:
              "JPG, PNG, WebP зураг, 10 MB хүртэл хэмжээтэй нэг файл сонгоно уу.",
          });
        let content: Buffer;
        try {
          const image = sharp(req.file.buffer, {
            limitInputPixels: 24_000_000,
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
          content = await image
            .rotate()
            .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        } catch {
          return res.status(400).json({ message: "Зургийг уншиж чадсангүй." });
        }
        try {
          return res
            .status(201)
            .json({ url: await store(`${randomUUID()}.webp`, content) });
        } catch {
          return res
            .status(503)
            .json({ message: "Зураг хадгалж чадсангүй. Дахин оролдоно уу." });
        }
      });
    },
  );
  router.get("/forms/mgl-club/website-images/:name", (req, res) => {
    if (!/^[0-9a-f-]{36}\.webp$/i.test(req.params.name))
      return res.sendStatus(404);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(path.join(directory, req.params.name), (error) => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  });
  return router;
}
async function storeImage(name: string, bytes: Buffer): Promise<string> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const bucket = getSupabase().storage.from(ORG_IMAGES_BUCKET),
      key = `mgl-club/website/${name}`;
    const { error } = await bucket.upload(key, bytes, {
      contentType: "image/webp",
      upsert: false,
    });
    if (error) throw error;
    return bucket.getPublicUrl(key).data.publicUrl;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Image storage unavailable");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), bytes);
  return `/api/forms/mgl-club/website-images/${name}`;
}
