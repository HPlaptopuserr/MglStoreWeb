import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";

const router: ExpressRouter = Router();

const SETTING_VALUE_MAX_BYTES = 512 * 1024; // 512KB — хэрэв утга үүнээс том бол тайлангаас хасна

// GET all site settings as key-value object (public read for web/vendor)
router.get("/site-settings", async (_req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      if (Buffer.byteLength(s.value, "utf8") <= SETTING_VALUE_MAX_BYTES) {
        obj[s.key] = s.value;
      }
    }
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(obj);
  } catch (error) {
    console.error("get site-settings error", error);
    res.status(500).json({ message: "Тохиргоог авахад алдаа гарлаа" });
  }
});

// PUT upsert a single setting
router.put("/site-settings/:key", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (req, res) => {
  const { key } = req.params;
  const { value } = req.body as { value: string };
  if (typeof value !== "string") {
    res.status(400).json({ message: "value шаардлагатай" });
    return;
  }
  if (Buffer.byteLength(value, "utf8") > SETTING_VALUE_MAX_BYTES) {
    res.status(413).json({ message: "Утга хэт том байна (512KB хязгаар). Зургийг тусдаа file upload ашиглана уу." });
    return;
  }
  // Sanitize key: only allow alphanumeric, dashes, underscores
  if (!/^[\w-]+$/.test(key)) {
    res.status(400).json({ message: "Буруу түлхүүр" });
    return;
  }
  try {
    const setting = await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json(setting);
  } catch (error) {
    console.error("put site-settings error", error);
    res.status(500).json({ message: "Хадгалахад алдаа гарлаа" });
  }
});

// PUT bulk upsert multiple settings at once
router.put("/site-settings", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (req, res) => {
  const updates = req.body as Record<string, string>;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    res.status(400).json({ message: "Буруу өгөгдөл" });
    return;
  }
  try {
    const ops = Object.entries(updates)
      .filter(([key]) => /^[\w-]+$/.test(key))
      .map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );
    await Promise.all(ops);
    res.json({ message: "Хадгалагдлаа" });
  } catch (error) {
    console.error("bulk site-settings error", error);
    res.status(500).json({ message: "Хадгалахад алдаа гарлаа" });
  }
});

export default router;
