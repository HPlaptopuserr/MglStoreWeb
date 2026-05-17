import crypto from "crypto";
import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB raw — browser already compressed
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Зөвхөн зураг файл байх ёстой"));
  },
});

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

// POST /site-settings/banner-upload — зургийг Supabase Storage-д upload хийж URL буцаана
router.post(
  "/site-settings/banner-upload",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  bannerUpload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "Зураг файл шаардлагатай" });
      return;
    }
    try {
      const ext = req.file.mimetype === "image/png" ? ".png" : ".jpg";
      const fileName = `banners/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      const { error } = await getSupabase().storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (error) {
        res.status(500).json({ message: "Зураг хадгалахад алдаа гарлаа", detail: error.message });
        return;
      }
      const { data } = getSupabase().storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(fileName);
      res.json({ url: data.publicUrl });
    } catch (err) {
      console.error("banner-upload error", err);
      res.status(500).json({ message: "Зураг upload хийхэд алдаа гарлаа" });
    }
  },
);

// POST /site-settings/mgl-services/qpay — MGL үйлчилгээ захиалах үед QPay нэхэмжлэх үүсгэх
router.post("/site-settings/mgl-services/qpay", async (req, res) => {
  try {
    const { total, items } = req.body;
    if (!total || isNaN(Number(total))) {
      res.status(400).json({ success: false, message: "Буруу үнийн дүн" });
      return;
    }
    
    const orderId = crypto.randomUUID();
    const orderNumber = `SVC-${Date.now().toString().slice(-6)}`;
    const description = `MGL Store Үйлчилгээ: ${items?.length} төрөл`;

    const invoice = await createQPayInvoice({
      orderId,
      orderNumber,
      amount: Number(total),
      description,
    });

    res.json({
      success: true,
      orderId,
      orderNumber,
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls,
    });
  } catch (error: any) {
    console.error("mgl-services qpay create error", error);
    res.status(500).json({ success: false, message: error.message || "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа" });
  }
});

// GET /site-settings/mgl-services/qpay/check — Төлбөр шалгах
router.get("/site-settings/mgl-services/qpay/check", async (req, res) => {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId || typeof invoiceId !== "string") {
      res.status(400).json({ success: false, message: "invoiceId шаардлагатай" });
      return;
    }

    const result = await checkQPayPayment(invoiceId);
    const isPaid = result.count > 0;

    res.json({ success: true, isPaid, paidAmount: result.paid_amount });
  } catch (error) {
    console.error("mgl-services qpay check error", error);
    res.status(500).json({ success: false, message: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

export default router;
