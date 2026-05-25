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

type PaidProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  tags?: string[];
  isActive?: boolean;
};

type ProjectAccessPayload = {
  projectId: string;
  invoiceId: string;
  amount: number;
  exp: number;
};

const PROJECT_ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;
const projectAccessSecret = process.env.JWT_SECRET || process.env.QPAY_CLIENT_SECRET || "dev-project-access-secret";

async function getPaidProjects(): Promise<PaidProject[]> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "paid-projects" } });
  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getPublicProjects(projects: PaidProject[]) {
  return projects
    .filter((project) => project.isActive !== false)
    .map(({ details: _details, ...project }) => project);
}

function signProjectAccessPayload(payload: string) {
  return crypto.createHmac("sha256", projectAccessSecret).update(payload).digest("base64url");
}

function createProjectAccessToken(payload: Omit<ProjectAccessPayload, "exp">) {
  const tokenPayload: ProjectAccessPayload = {
    ...payload,
    exp: Date.now() + PROJECT_ACCESS_TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(tokenPayload), "utf8").toString("base64url");
  const signature = signProjectAccessPayload(encoded);
  return `${encoded}.${signature}`;
}

function verifyProjectAccessToken(token?: string): ProjectAccessPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signProjectAccessPayload(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ProjectAccessPayload;
    if (!payload.projectId || !payload.invoiceId || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}
// GET all site settings as key-value object (public read for web/vendor)
router.get("/site-settings", async (_req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      if (Buffer.byteLength(s.value, "utf8") <= SETTING_VALUE_MAX_BYTES) {
        if (s.key === "paid-projects") {
          obj[s.key] = JSON.stringify(getPublicProjects(await getPaidProjects()));
        } else {
          obj[s.key] = s.value;
        }
      }
    }
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(obj);
  } catch (error) {
    console.error("get site-settings error", error);
    res.status(500).json({ message: "Тохиргоог авахад алдаа гарлаа" });
  }
});

// GET all site settings with private values (admin only)
router.get(
  "/site-settings/admin",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (_req, res) => {
    try {
      const settings = await prisma.siteSetting.findMany();
      const obj: Record<string, string> = {};
      for (const s of settings) {
        if (Buffer.byteLength(s.value, "utf8") <= SETTING_VALUE_MAX_BYTES) {
          obj[s.key] = s.value;
        }
      }
      res.json(obj);
    } catch (error) {
      console.error("get admin site-settings error", error);
      res.status(500).json({ message: "Тохиргоог авахад алдаа гарлаа" });
    }
  },
);
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

// GET /site-settings/projects — public summary list only
router.get("/site-settings/projects", async (_req, res) => {
  try {
    const projects = await getPaidProjects();
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({ success: true, projects: getPublicProjects(projects) });
  } catch (error) {
    console.error("get public projects error", error);
    res.status(500).json({ success: false, message: "Төслийн жагсаалт авахад алдаа гарлаа" });
  }
});

// GET /site-settings/projects/:projectId/detail — full detail after payment check
router.get("/site-settings/projects/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;
    const invoiceId = typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    const accessToken = typeof req.query.accessToken === "string" ? req.query.accessToken : "";

    const projects = await getPaidProjects();
    const project = projects.find((item) => item.id === projectId && item.isActive !== false);
    if (!project) {
      res.status(404).json({ success: false, message: "Төсөл олдсонгүй" });
      return;
    }

    const amount = Math.max(0, Number(project.price) || 0);
    if (amount > 0) {
      const payload = verifyProjectAccessToken(accessToken);
      if (
        !payload ||
        payload.projectId !== project.id ||
        payload.invoiceId !== invoiceId ||
        Math.max(0, Number(payload.amount) || 0) !== amount
      ) {
        res.status(403).json({ success: false, message: "Төслийн төлбөрийн эрх баталгаажаагүй байна" });
        return;
      }

      const payment = await checkQPayPayment(invoiceId);
      if (payment.count <= 0) {
        res.status(402).json({ success: false, message: "Төслийн төлбөр төлөгдөөгүй байна" });
        return;
      }
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error("get project detail error", error);
    res.status(500).json({ success: false, message: "Төслийн дэлгэрэнгүй авахад алдаа гарлаа" });
  }
});

// POST /site-settings/projects/qpay — paid project detail access invoice
router.post("/site-settings/projects/qpay", async (req, res) => {
  try {
    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      res.status(400).json({ success: false, message: "projectId шаардлагатай" });
      return;
    }

    const projects = await getPaidProjects();
    const project = projects.find((item) => item.id === projectId && item.isActive !== false);
    if (!project) {
      res.status(404).json({ success: false, message: "Төсөл олдсонгүй" });
      return;
    }

    const amount = Math.max(0, Number(project.price) || 0);
    if (amount <= 0) {
      res.json({ success: true, free: true, projectId });
      return;
    }

    const orderId = crypto.randomUUID();
    const orderNumber = `PRJ-${Date.now().toString().slice(-6)}`;
    const invoice = await createQPayInvoice({
      orderId,
      orderNumber,
      amount,
      description: `MGL Store төсөл: ${project.title}`,
    });

    res.json({
      success: true,
      orderId,
      orderNumber,
      projectId,
      amount,
      invoiceId: invoice.invoice_id,
      accessToken: createProjectAccessToken({ projectId, invoiceId: invoice.invoice_id, amount }),
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls,
    });
  } catch (error: any) {
    console.error("project qpay create error", error);
    res.status(500).json({ success: false, message: error.message || "Төслийн төлбөр үүсгэхэд алдаа гарлаа" });
  }
});

// GET /site-settings/projects/qpay/check — check paid project invoice
router.get("/site-settings/projects/qpay/check", async (req, res) => {
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
    console.error("project qpay check error", error);
    res.status(500).json({ success: false, message: "Төслийн төлбөр шалгахад алдаа гарлаа" });
  }
});
export default router;
