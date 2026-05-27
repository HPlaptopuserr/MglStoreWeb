import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import express, {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
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

const projectPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) cb(null, true);
    else cb(new Error("Зөвхөн PDF файл байх ёстой"));
  },
});

const router: ExpressRouter = Router();
const LOCAL_SITE_UPLOADS_DIR = path.resolve(
  __dirname,
  "../../../uploads/site-settings",
);

const SETTING_VALUE_MAX_BYTES = 512 * 1024; // 512KB — хэрэв утга үүнээс том бол тайлангаас хасна

type PaidProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  tags?: string[];
  isActive?: boolean;
};

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function getApiBaseUrl(req: Request) {
  const configured =
    process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL;
  const normalized = configured
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

  if (normalized) {
    return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
  }

  return `${req.protocol}://${req.get("host")}`;
}

async function saveLocalSiteUpload(
  req: Request,
  storagePath: string,
  buffer: Buffer,
) {
  const relativePath = storagePath.replace(/\\/g, "/");
  if (relativePath.includes("..")) {
    throw new Error("Invalid upload path");
  }

  const root = path.resolve(LOCAL_SITE_UPLOADS_DIR);
  const destination = path.resolve(root, relativePath);
  if (!destination.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid upload path");
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);

  const urlPath = relativePath.split("/").map(encodeURIComponent).join("/");
  return `${getApiBaseUrl(req)}/api/site-settings/uploads/${urlPath}`;
}

async function uploadSiteFile(
  req: Request,
  storagePath: string,
  buffer: Buffer,
  contentType: string,
) {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase storage env тохиргоо дутуу байна");
    }

    return saveLocalSiteUpload(req, storagePath, buffer);
  }

  const { error } = await getSupabase()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = getSupabase()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function getPaidProjects(): Promise<PaidProject[]> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "paid-projects" },
  });
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
    .map((project) => normalizeFreeProject(project));
}

function getProjectImages(project: PaidProject) {
  const urls = [
    ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
    project.imageUrl,
  ];

  return Array.from(
    new Set(
      urls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeFreeProject(project: PaidProject): PaidProject {
  const imageUrls = getProjectImages(project);

  return {
    ...project,
    price: 0,
    imageUrl: imageUrls[0] ?? project.imageUrl ?? "",
    imageUrls,
  };
}

router.use(
  "/site-settings/uploads",
  express.static(LOCAL_SITE_UPLOADS_DIR, {
    setHeaders(res, filePath) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.removeHeader("Access-Control-Allow-Credentials");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("X-Frame-Options");

      if (filePath.toLowerCase().endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
      }
    },
  }),
);

// GET all site settings as key-value object (public read for web/vendor)
router.get("/site-settings", async (_req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      if (Buffer.byteLength(s.value, "utf8") <= SETTING_VALUE_MAX_BYTES) {
        if (s.key === "paid-projects") {
          obj[s.key] = JSON.stringify(
            getPublicProjects(await getPaidProjects()),
          );
        } else {
          obj[s.key] = s.value;
        }
      }
    }
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
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
router.put(
  "/site-settings/:key",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    const { key } = req.params;
    const { value } = req.body as { value: string };
    if (typeof value !== "string") {
      res.status(400).json({ message: "value шаардлагатай" });
      return;
    }
    if (Buffer.byteLength(value, "utf8") > SETTING_VALUE_MAX_BYTES) {
      res
        .status(413)
        .json({
          message:
            "Утга хэт том байна (512KB хязгаар). Зургийг тусдаа file upload ашиглана уу.",
        });
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
  },
);

// PUT bulk upsert multiple settings at once
router.put(
  "/site-settings",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
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
          }),
        );
      await Promise.all(ops);
      res.json({ message: "Хадгалагдлаа" });
    } catch (error) {
      console.error("bulk site-settings error", error);
      res.status(500).json({ message: "Хадгалахад алдаа гарлаа" });
    }
  },
);

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
      const url = await uploadSiteFile(
        req,
        fileName,
        req.file.buffer,
        req.file.mimetype,
      );
      res.json({ url });
    } catch (err) {
      console.error("banner-upload error", err);
      res.status(500).json({
        message: "Зураг upload хийхэд алдаа гарлаа",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

// POST /site-settings/project-pdf-upload — franchise PDF-г Supabase Storage-д upload хийнэ
router.post(
  "/site-settings/project-pdf-upload",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  projectPdfUpload.single("pdf"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "PDF файл шаардлагатай" });
      return;
    }
    try {
      const fileName = `franchise-pdfs/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
      const url = await uploadSiteFile(
        req,
        fileName,
        req.file.buffer,
        "application/pdf",
      );
      res.json({ url });
    } catch (err) {
      console.error("project-pdf-upload error", err);
      res.status(500).json({
        message: "PDF upload хийхэд алдаа гарлаа",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

// GET /site-settings/projects — public summary list only
router.get("/site-settings/projects", async (_req, res) => {
  try {
    const projects = await getPaidProjects();
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
    res.json({ success: true, projects: getPublicProjects(projects) });
  } catch (error) {
    console.error("get public projects error", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Franchise жагсаалт авахад алдаа гарлаа",
      });
  }
});

// GET /site-settings/projects/:projectId/detail — full detail after payment check
router.get("/site-settings/projects/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;

    const projects = await getPaidProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Franchise олдсонгүй" });
      return;
    }

    res.json({ success: true, project: normalizeFreeProject(project) });
  } catch (error) {
    console.error("get project detail error", error);
    res
      .status(500)
      .json({ success: false, message: "Franchise PDF авахад алдаа гарлаа" });
  }
});

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
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа",
      });
  }
});

// GET /site-settings/mgl-services/qpay/check — Төлбөр шалгах
router.get("/site-settings/mgl-services/qpay/check", async (req, res) => {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId || typeof invoiceId !== "string") {
      res
        .status(400)
        .json({ success: false, message: "invoiceId шаардлагатай" });
      return;
    }

    const result = await checkQPayPayment(invoiceId);
    const isPaid = result.count > 0;

    res.json({ success: true, isPaid, paidAmount: result.paid_amount });
  } catch (error) {
    console.error("mgl-services qpay check error", error);
    res
      .status(500)
      .json({ success: false, message: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

// POST /site-settings/projects/qpay — legacy endpoint; franchise access is free.
router.post("/site-settings/projects/qpay", async (req, res) => {
  try {
    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "projectId шаардлагатай" });
      return;
    }

    const projects = await getPaidProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Franchise олдсонгүй" });
      return;
    }

    res.json({ success: true, free: true, projectId });
  } catch (error: any) {
    console.error("project qpay create error", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Franchise эрх шалгахад алдаа гарлаа",
      });
  }
});

// GET /site-settings/projects/qpay/check — legacy endpoint; always free.
router.get("/site-settings/projects/qpay/check", async (_req, res) => {
  res.json({ success: true, isPaid: true, paidAmount: 0 });
});

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(isTooLarge ? 413 : 400).json({
        message: isTooLarge
          ? "Файлын хэмжээ хэтэрсэн байна"
          : "Файл upload хийхэд алдаа гарлаа",
        detail: error.message,
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    next(error);
  },
);

export default router;
