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
import { prisma, PosQPayStatus, type Prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import {
  checkSystemQrPayment,
  createSystemQrInvoice,
  resetSystemQrSubMerchantPassword,
} from "../../services/systemqr";

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
const PROJECT_PAYMENT_TTL_MS = 5 * 60 * 1000;
const CONTRACT_PAYMENT_ACCOUNTS_KEY = "contract-payment-accounts";
const FRANCHISE_ITEMS_KEY = "paid-projects";
const SITE_PROJECTS_KEY = "site-projects";

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
  paymentAccountId?: string;
  paymentMerchantCode?: string;
};

type ProjectPaymentAccount = {
  id?: string;
  label?: string;
  merchantName?: string;
  merchantCode?: string;
  username?: string;
  password?: string;
  bankCode?: string;
  accountNumber?: string;
};

type PaidContentKind = "PROJECT_ACCESS" | "FRANCHISE_ACCESS";

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function getApiBaseUrl(req: Request) {
  const configured =
    process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL;
  const normalized = configured
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

  if (normalized) {
    return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getApiRouteBaseUrl(req: Request) {
  const base = getApiBaseUrl(req).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
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

async function getProjectItems(key: string): Promise<PaidProject[]> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key },
  });
  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getFranchiseProjects(): Promise<PaidProject[]> {
  return getProjectItems(FRANCHISE_ITEMS_KEY);
}

async function getPaidProjects(): Promise<PaidProject[]> {
  return getProjectItems(SITE_PROJECTS_KEY);
}

function normalizeProjectPrice(value: unknown) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
}

function getPublicProjects(projects: PaidProject[]) {
  return projects
    .filter((project) => project.isActive !== false)
    .map((project) => normalizePublicProject(project));
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

function normalizeProject(project: PaidProject): PaidProject {
  const imageUrls = getProjectImages(project);

  return {
    ...project,
    price: normalizeProjectPrice(project.price),
    imageUrl: imageUrls[0] ?? project.imageUrl ?? "",
    imageUrls,
  };
}

function normalizePublicProject(project: PaidProject): PaidProject {
  const normalized = normalizeProject(project);
  return {
    id: normalized.id,
    title: normalized.title,
    category: normalized.category,
    summary: normalized.summary,
    price: normalized.price,
    imageUrl: normalized.imageUrl,
    imageUrls: normalized.imageUrls,
    tags: normalized.tags,
    isActive: normalized.isActive,
  };
}

function normalizeFranchiseProject(project: PaidProject): PaidProject {
  return normalizeProject(project);
}

function isMglStoreFranchise(project: Pick<PaidProject, "title">) {
  const title = String(project.title || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return title.includes("mglstore");
}

function sortMglStoreFranchiseFirst<T extends Pick<PaidProject, "title">>(
  projects: T[],
) {
  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => {
      const aPriority = isMglStoreFranchise(a.project) ? 0 : 1;
      const bPriority = isMglStoreFranchise(b.project) ? 0 : 1;
      return aPriority - bPriority || a.index - b.index;
    })
    .map(({ project }) => project);
}

function getPublicFranchiseProjects(projects: PaidProject[]) {
  return sortMglStoreFranchiseFirst(
    projects
      .filter((project) => project.isActive !== false)
      .map((project) => normalizePublicProject(project)),
  );
}

function projectSaleReference(
  projectId: string,
  kind: PaidContentKind = "PROJECT_ACCESS",
) {
  return `${kind === "FRANCHISE_ACCESS" ? "FRANCHISE" : "PROJECT"}:${projectId}`;
}

function projectPaymentPayload(invoice: {
  webhookPayload: Prisma.JsonValue | null;
}) {
  return (invoice.webhookPayload || {}) as Record<string, unknown>;
}

const normalizeSystemQrLookup = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isSystemQrAuthError = (message: string) =>
  /SystemQR Login Error|Хэрэглэгчийн нэр эсвэл нууц үг|username or password|credential|unauthorized|401|403/i.test(
    message,
  );

const isSystemQrMasterMerchantCode = (merchantCode?: string | null) => {
  const code = normalizeSystemQrLookup(merchantCode);
  const masterUsername = normalizeSystemQrLookup(process.env.SYSTEMQR_USERNAME);
  return Boolean(code && masterUsername && code === masterUsername);
};

async function getProjectPaymentAccounts(): Promise<ProjectPaymentAccount[]> {
  const setting = await prisma.siteSetting
    .findUnique({ where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY } })
    .catch(() => null);
  if (!setting?.value) return [];

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((account) => ({
        id: String(account?.id || "").trim(),
        label: String(account?.label || "").trim(),
        merchantName: String(account?.merchantName || "").trim(),
        merchantCode: String(account?.merchantCode || "").trim(),
        username: String(account?.username || "").trim(),
        password: String(account?.password || "").trim(),
        bankCode: String(account?.bankCode || "").trim(),
        accountNumber: String(account?.accountNumber || "").trim(),
      }))
      .filter(
        (account) =>
          account.merchantCode &&
          !isSystemQrMasterMerchantCode(account.merchantCode),
      );
  } catch {
    return [];
  }
}

async function resolveProjectPaymentAccount(project: PaidProject) {
  const accounts = await getProjectPaymentAccounts();
  const paymentAccountId = String(project.paymentAccountId || "").trim();
  const paymentMerchantCode = String(project.paymentMerchantCode || "").trim();

  const explicitAccount = accounts.find(
    (account) =>
      (paymentAccountId && account.id === paymentAccountId) ||
      (paymentMerchantCode && account.merchantCode === paymentMerchantCode),
  );
  if (explicitAccount) return explicitAccount;

  if (!paymentAccountId && !paymentMerchantCode && accounts.length === 1) {
    return accounts[0];
  }

  return null;
}

function getProjectSystemQrAuth(account: ProjectPaymentAccount | null): {
  username?: string;
  password?: string;
} {
  const password = String(account?.password || "").trim();
  if (!account?.merchantCode || !password) return {};

  return {
    username: String(account.username || account.merchantCode).trim(),
    password,
  };
}

async function cacheProjectSystemQrAuth(
  account: ProjectPaymentAccount,
  auth: { username?: string; password?: string },
) {
  const merchantCode = String(account.merchantCode || "").trim();
  const password = String(auth.password || "").trim();
  if (!merchantCode || !password) return;

  const setting = await prisma.siteSetting
    .findUnique({ where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY } })
    .catch(() => null);
  const accounts = setting?.value ? JSON.parse(setting.value) : [];
  if (!Array.isArray(accounts)) return;

  let updated = false;
  const now = new Date().toISOString();
  const nextAccounts = accounts.map((item) => {
    const sameId = account.id && String(item?.id || "").trim() === account.id;
    const sameMerchant =
      merchantCode && String(item?.merchantCode || "").trim() === merchantCode;
    if (!sameId && !sameMerchant) return item;

    updated = true;
    return {
      ...item,
      merchantCode: String(item?.merchantCode || merchantCode).trim(),
      username: String(auth.username || item?.username || merchantCode).trim(),
      password,
      updatedAt: now,
    };
  });

  if (!updated) return;

  await prisma.siteSetting.upsert({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY },
    update: { value: JSON.stringify(nextAccounts) },
    create: {
      key: CONTRACT_PAYMENT_ACCOUNTS_KEY,
      value: JSON.stringify(nextAccounts),
    },
  });
}

async function recoverProjectSystemQrAuth(
  account: ProjectPaymentAccount,
): Promise<{ username?: string; password?: string }> {
  const storedAuth = getProjectSystemQrAuth(account);
  if (storedAuth.password) return storedAuth;

  const merchantCode = String(account.merchantCode || "").trim();
  if (!merchantCode) return storedAuth;

  const reset = await resetSystemQrSubMerchantPassword(merchantCode);
  const auth = {
    username: String(reset.username || account.username || merchantCode).trim(),
    password: reset.password ? String(reset.password).trim() : undefined,
  };
  if (auth.password) await cacheProjectSystemQrAuth(account, auth);
  return auth.password ? auth : storedAuth;
}

async function createProjectSystemQrInvoiceWithFallback(params: {
  account: ProjectPaymentAccount;
  amount: number;
  referenceNumber: string;
  webhook: string;
}) {
  const invoiceParams = {
    merchantCode: String(params.account.merchantCode || "").trim(),
    amount: params.amount,
    referenceNumber: params.referenceNumber,
    webhook: params.webhook,
  };
  const auth = await recoverProjectSystemQrAuth(params.account);

  try {
    return await createSystemQrInvoice(
      invoiceParams,
      auth.username,
      auth.password,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      (!auth.username && !auth.password) ||
      (!isSystemQrAuthError(message) &&
        !/createInvoice failed \(002\)/i.test(message))
    ) {
      throw error;
    }

    console.warn(
      "project SystemQR subMerchant auth failed; retrying with master token",
      message,
    );
    return createSystemQrInvoice(invoiceParams);
  }
}

async function checkProjectSystemQrPaymentWithFallback(params: {
  account: ProjectPaymentAccount | null;
  merchantCode: string;
  invoiceNumber: string;
}) {
  const checkParams = {
    merchantCode: params.merchantCode,
    invoiceNumber: params.invoiceNumber,
  };
  const auth = getProjectSystemQrAuth(params.account);

  try {
    return await checkSystemQrPayment(
      checkParams,
      auth.username,
      auth.password,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((!auth.username && !auth.password) || !isSystemQrAuthError(message)) {
      throw error;
    }

    console.warn(
      "project SystemQR check auth failed; retrying with master token",
      message,
    );
    return checkSystemQrPayment(checkParams);
  }
}

function projectInvoiceBelongsTo(
  invoice: {
    saleReference: string | null;
    amount: unknown;
    webhookPayload: Prisma.JsonValue | null;
  },
  projectId: string,
  price: number,
  kind: PaidContentKind = "PROJECT_ACCESS",
) {
  const payload = projectPaymentPayload(invoice);
  return (
    invoice.saleReference === projectSaleReference(projectId, kind) &&
    String(payload.kind || "") === kind &&
    String(payload.projectId || "") === projectId &&
    Math.abs(Number(invoice.amount) - price) < 0.01
  );
}

async function refreshProjectInvoicePayment(invoiceId: string) {
  const invoice = await prisma.qPayInvoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return null;

  if (invoice.status === PosQPayStatus.PAID) return invoice;

  if (
    invoice.status === PosQPayStatus.PENDING &&
    invoice.expiresAt <= new Date()
  ) {
    return prisma.qPayInvoice.update({
      where: { id: invoice.id },
      data: { status: PosQPayStatus.EXPIRED },
    });
  }

  if (invoice.status !== PosQPayStatus.PENDING) return invoice;

  const payload = projectPaymentPayload(invoice);
  const provider = String(payload.provider || "QPAY")
    .trim()
    .toUpperCase();

  if (provider === "SYSTEMQR") {
    const providerInvoiceId = String(
      payload.providerInvoiceId || payload.systemQrInvoiceNumber || "",
    ).trim();
    const merchantCode = String(payload.merchantCode || "").trim();
    if (!providerInvoiceId || !merchantCode) return invoice;

    const account = await resolveProjectPaymentAccount({
      id: String(payload.projectId || ""),
      title: String(payload.projectTitle || ""),
      price: Number(invoice.amount),
      paymentAccountId: String(payload.paymentAccountId || ""),
      paymentMerchantCode: merchantCode,
    });
    const check = await checkProjectSystemQrPaymentWithFallback({
      account,
      merchantCode,
      invoiceNumber: providerInvoiceId,
    });

    if (!check.paid) {
      return prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          webhookPayload: {
            ...payload,
            lastPaymentCheck: check,
          } as unknown as Prisma.JsonObject,
        },
      });
    }

    return prisma.qPayInvoice.update({
      where: { id: invoice.id },
      data: {
        status: PosQPayStatus.PAID,
        paidAt: new Date(),
        paymentId: `SYSTEMQR-${providerInvoiceId}`,
        webhookPayload: {
          ...payload,
          lastPaymentCheck: check,
          paidAmount: Number(invoice.amount),
        } as unknown as Prisma.JsonObject,
      },
    });
  }

  const providerInvoiceId = String(payload.providerInvoiceId || "").trim();
  if (!providerInvoiceId) return invoice;

  const check = await checkQPayPayment(providerInvoiceId);
  const rows = Array.isArray(check.rows) ? check.rows : [];
  const paidAmount =
    Number(check.paid_amount || 0) ||
    rows.reduce((sum, row: any) => sum + Number(row.payment_amount || 0), 0);
  const isPaid = check.count > 0 && paidAmount + 0.01 >= Number(invoice.amount);

  if (!isPaid) {
    return prisma.qPayInvoice.update({
      where: { id: invoice.id },
      data: {
        webhookPayload: {
          ...payload,
          lastPaymentCheck: check,
        } as unknown as Prisma.JsonObject,
      },
    });
  }

  const paidRow = rows[0] as Record<string, unknown> | undefined;
  return prisma.qPayInvoice.update({
    where: { id: invoice.id },
    data: {
      status: PosQPayStatus.PAID,
      paidAt: new Date(),
      paymentId: String(paidRow?.payment_id || `project-${invoice.id}`),
      webhookPayload: {
        ...payload,
        lastPaymentCheck: check,
        paidAmount,
      } as unknown as Prisma.JsonObject,
    },
  });
}

async function ensurePaidProjectAccess({
  projectId,
  invoiceId,
  price,
  kind = "PROJECT_ACCESS",
}: {
  projectId: string;
  invoiceId?: string;
  price: number;
  kind?: PaidContentKind;
}) {
  if (price <= 0) return true;
  if (!invoiceId) return false;

  const invoice = await refreshProjectInvoicePayment(invoiceId);
  if (!invoice) return false;

  return (
    invoice.status === PosQPayStatus.PAID &&
    projectInvoiceBelongsTo(invoice, projectId, price, kind)
  );
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
        if (s.key === FRANCHISE_ITEMS_KEY) {
          obj[s.key] = JSON.stringify(
            getPublicFranchiseProjects(await getFranchiseProjects()),
          );
        } else if (s.key === SITE_PROJECTS_KEY) {
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
      res.status(413).json({
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

// POST /site-settings/project-pdf-upload — төслийн PDF-г Supabase Storage-д upload хийнэ
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
      const fileName = `project-pdfs/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
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

// GET /site-settings/franchise — public Franchise summary list.
router.get("/site-settings/franchise", async (_req, res) => {
  try {
    const projects = await getFranchiseProjects();
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
    res.json({ success: true, projects: getPublicFranchiseProjects(projects) });
  } catch (error) {
    console.error("get franchise list error", error);
    res.status(500).json({
      success: false,
      message: "Franchise мэдээлэл авахад алдаа гарлаа",
    });
  }
});

// GET /site-settings/franchise/:projectId/detail — full Franchise detail.
router.get("/site-settings/franchise/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : undefined;

    const projects = await getFranchiseProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Franchise олдсонгүй" });
      return;
    }

    const normalized = normalizeFranchiseProject(project);
    const hasAccess = await ensurePaidProjectAccess({
      projectId,
      invoiceId,
      price: normalizeProjectPrice(normalized.price),
      kind: "FRANCHISE_ACCESS",
    });
    if (!hasAccess) {
      res.status(402).json({
        success: false,
        requiresPayment: true,
        message: "Franchise дэлгэрэнгүй мэдээлэл үзэхийн тулд төлбөр төлнө үү",
      });
      return;
    }

    res.json({ success: true, project: normalized });
  } catch (error) {
    console.error("get franchise detail error", error);
    res.status(500).json({
      success: false,
      message: "Franchise мэдээлэл авахад алдаа гарлаа",
    });
  }
});

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
    res.status(500).json({
      success: false,
      message: "Төслийн жагсаалт авахад алдаа гарлаа",
    });
  }
});

// GET /site-settings/projects/:projectId/detail — full detail after payment check
router.get("/site-settings/projects/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : undefined;

    const projects = await getPaidProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Төсөл олдсонгүй" });
      return;
    }

    const normalized = normalizeProject(project);
    const hasAccess = await ensurePaidProjectAccess({
      projectId,
      invoiceId,
      price: normalizeProjectPrice(normalized.price),
    });
    if (!hasAccess) {
      res.status(402).json({
        success: false,
        requiresPayment: true,
        message: "Дэлгэрэнгүй мэдээлэл үзэхийн тулд төлбөр төлнө үү",
      });
      return;
    }

    res.json({ success: true, project: normalized });
  } catch (error) {
    console.error("get project detail error", error);
    res.status(500).json({
      success: false,
      message: "Төслийн мэдээлэл авахад алдаа гарлаа",
    });
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
    res.status(500).json({
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

// POST /site-settings/projects/systemqr — project detail access Minu Dynamic QR invoice.
const createProjectSystemQrPaymentSession = async (
  req: Request,
  res: Response,
) => {
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
      res.status(404).json({ success: false, message: "Төсөл олдсонгүй" });
      return;
    }

    const normalized = normalizeProject(project);
    const amount = normalizeProjectPrice(normalized.price);
    if (amount <= 0) {
      res.json({ success: true, free: true, projectId });
      return;
    }

    const expiresAt = new Date(Date.now() + PROJECT_PAYMENT_TTL_MS);
    const account = await resolveProjectPaymentAccount(normalized);
    if (!account?.merchantCode) {
      res.status(400).json({
        success: false,
        message:
          "Энэ төслийн төлбөр орох Minu Dynamic QR данс сонгогдоогүй байна. Admin дээр Төсөл засахдаа төлбөрийн данс сонгоно уу.",
      });
      return;
    }

    const invoice = await prisma.qPayInvoice.create({
      data: {
        amount,
        qrText: "",
        status: PosQPayStatus.PENDING,
        expiresAt,
        saleReference: projectSaleReference(projectId),
        webhookPayload: {
          kind: "PROJECT_ACCESS",
          provider: "SYSTEMQR",
          projectId,
          projectTitle: normalized.title,
          paymentAccountId: account.id || "",
          paymentAccountLabel: account.label || account.merchantName || "",
          merchantCode: account.merchantCode,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      const systemQr = await createProjectSystemQrInvoiceWithFallback({
        account,
        referenceNumber: `PRJ-${invoice.id.slice(0, 8).toUpperCase()}`,
        amount,
        webhook: `${getApiRouteBaseUrl(req)}/site-settings/projects/systemqr/callback?invoiceId=${invoice.id}`,
      });

      const updated = await prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          qrText: systemQr.qrText,
          webhookPayload: {
            kind: "PROJECT_ACCESS",
            provider: "SYSTEMQR",
            projectId,
            projectTitle: normalized.title,
            paymentAccountId: account.id || "",
            paymentAccountLabel: account.label || account.merchantName || "",
            paymentAccountBankCode: account.bankCode || "",
            paymentAccountNumber: account.accountNumber || "",
            merchantCode: account.merchantCode,
            providerInvoiceId: systemQr.invoiceId,
            systemQrInvoiceNumber: systemQr.invoiceId,
            qrImage: "",
            deepLinks: systemQr.urls as unknown as Prisma.JsonArray,
          } as unknown as Prisma.JsonObject,
        },
      });

      res.json({
        success: true,
        free: false,
        projectId,
        invoiceId: updated.id,
        provider: "SYSTEMQR",
        providerInvoiceId: systemQr.invoiceId,
        amount,
        qrText: systemQr.qrText,
        qrImage: "",
        urls: systemQr.urls,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (systemQrError) {
      await prisma.qPayInvoice.delete({ where: { id: invoice.id } });
      throw systemQrError;
    }
  } catch (error: any) {
    console.error("project systemqr create error", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Төслийн Dynamic QR төлбөр үүсгэхэд алдаа гарлаа",
    });
  }
};

const createFranchiseSystemQrPaymentSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "projectId шаардлагатай" });
      return;
    }

    const projects = await getFranchiseProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Franchise олдсонгүй" });
      return;
    }

    const normalized = normalizeFranchiseProject(project);
    const amount = normalizeProjectPrice(normalized.price);
    if (amount <= 0) {
      res.json({ success: true, free: true, projectId });
      return;
    }

    const expiresAt = new Date(Date.now() + PROJECT_PAYMENT_TTL_MS);
    const account = await resolveProjectPaymentAccount(normalized);
    if (!account?.merchantCode) {
      res.status(400).json({
        success: false,
        message:
          "Энэ franchise-ийн төлбөр орох Minu Dynamic QR данс сонгогдоогүй байна. Admin дээр Franchise засахдаа төлбөрийн данс сонгоно уу.",
      });
      return;
    }

    const invoice = await prisma.qPayInvoice.create({
      data: {
        amount,
        qrText: "",
        status: PosQPayStatus.PENDING,
        expiresAt,
        saleReference: projectSaleReference(projectId, "FRANCHISE_ACCESS"),
        webhookPayload: {
          kind: "FRANCHISE_ACCESS",
          provider: "SYSTEMQR",
          projectId,
          projectTitle: normalized.title,
          paymentAccountId: account.id || "",
          paymentAccountLabel: account.label || account.merchantName || "",
          merchantCode: account.merchantCode,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      const systemQr = await createProjectSystemQrInvoiceWithFallback({
        account,
        referenceNumber: `FRN-${invoice.id.slice(0, 8).toUpperCase()}`,
        amount,
        webhook: `${getApiRouteBaseUrl(
          req,
        )}/site-settings/franchise/systemqr/callback?invoiceId=${invoice.id}`,
      });

      const updated = await prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          qrText: systemQr.qrText,
          webhookPayload: {
            kind: "FRANCHISE_ACCESS",
            provider: "SYSTEMQR",
            projectId,
            projectTitle: normalized.title,
            paymentAccountId: account.id || "",
            paymentAccountLabel: account.label || account.merchantName || "",
            paymentAccountBankCode: account.bankCode || "",
            paymentAccountNumber: account.accountNumber || "",
            merchantCode: account.merchantCode,
            providerInvoiceId: systemQr.invoiceId,
            systemQrInvoiceNumber: systemQr.invoiceId,
            qrImage: "",
            deepLinks: systemQr.urls as unknown as Prisma.JsonArray,
          } as unknown as Prisma.JsonObject,
        },
      });

      res.json({
        success: true,
        free: false,
        projectId,
        invoiceId: updated.id,
        provider: "SYSTEMQR",
        providerInvoiceId: systemQr.invoiceId,
        amount,
        qrText: systemQr.qrText,
        qrImage: "",
        urls: systemQr.urls,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (systemQrError) {
      await prisma.qPayInvoice.delete({ where: { id: invoice.id } });
      throw systemQrError;
    }
  } catch (error: any) {
    console.error("franchise systemqr create error", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Franchise Dynamic QR төлбөр үүсгэхэд алдаа гарлаа",
    });
  }
};

router.post(
  "/site-settings/projects/systemqr",
  createProjectSystemQrPaymentSession,
);
router.post(
  "/site-settings/projects/qpay",
  createProjectSystemQrPaymentSession,
);
router.post(
  "/site-settings/franchise/systemqr",
  createFranchiseSystemQrPaymentSession,
);
router.post(
  "/site-settings/franchise/qpay",
  createFranchiseSystemQrPaymentSession,
);

// GET /site-settings/projects/systemqr/check — project detail payment check.
const checkProjectPaymentSession = async (req: Request, res: Response) => {
  try {
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : "";
    if (!invoiceId) {
      res
        .status(400)
        .json({ success: false, message: "invoiceId шаардлагатай" });
      return;
    }

    const invoice = await refreshProjectInvoicePayment(invoiceId);
    if (!invoice) {
      res.status(404).json({ success: false, message: "Нэхэмжлэх олдсонгүй" });
      return;
    }

    const payload = projectPaymentPayload(invoice);
    const belongsToProject =
      !projectId ||
      (String(payload.kind || "") === "PROJECT_ACCESS" &&
        String(payload.projectId || "") === projectId &&
        invoice.saleReference === projectSaleReference(projectId));

    res.json({
      success: true,
      isPaid: invoice.status === PosQPayStatus.PAID && belongsToProject,
      status: invoice.status,
      paidAmount:
        Number((payload.lastPaymentCheck as any)?.paid_amount || 0) ||
        Number(payload.paidAmount || 0),
      expiresAt: invoice.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("project qpay check error", error);
    res
      .status(500)
      .json({ success: false, message: "Төлбөр шалгахад алдаа гарлаа" });
  }
};

router.get(
  "/site-settings/projects/systemqr/check",
  checkProjectPaymentSession,
);
router.get("/site-settings/projects/qpay/check", checkProjectPaymentSession);

const checkFranchisePaymentSession = async (req: Request, res: Response) => {
  try {
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : "";
    if (!invoiceId) {
      res
        .status(400)
        .json({ success: false, message: "invoiceId шаардлагатай" });
      return;
    }

    const invoice = await refreshProjectInvoicePayment(invoiceId);
    if (!invoice) {
      res.status(404).json({ success: false, message: "Нэхэмжлэх олдсонгүй" });
      return;
    }

    const payload = projectPaymentPayload(invoice);
    const belongsToFranchise =
      !projectId ||
      (String(payload.kind || "") === "FRANCHISE_ACCESS" &&
        String(payload.projectId || "") === projectId &&
        invoice.saleReference ===
          projectSaleReference(projectId, "FRANCHISE_ACCESS"));

    res.json({
      success: true,
      isPaid: invoice.status === PosQPayStatus.PAID && belongsToFranchise,
      status: invoice.status,
      paidAmount:
        Number((payload.lastPaymentCheck as any)?.paid_amount || 0) ||
        Number(payload.paidAmount || 0),
      expiresAt: invoice.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("franchise qpay check error", error);
    res
      .status(500)
      .json({ success: false, message: "Төлбөр шалгахад алдаа гарлаа" });
  }
};

router.get(
  "/site-settings/franchise/systemqr/check",
  checkFranchisePaymentSession,
);
router.get("/site-settings/franchise/qpay/check", checkFranchisePaymentSession);

const handleProjectPaymentCallback = async (req: Request, res: Response) => {
  try {
    const invoiceId = String(
      req.query.invoiceId || req.body?.invoiceId || "",
    ).trim();
    if (invoiceId) {
      await refreshProjectInvoicePayment(invoiceId);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("project systemqr callback error", error);
    res.status(200).json({ ok: false });
  }
};

router.all(
  "/site-settings/projects/systemqr/callback",
  handleProjectPaymentCallback,
);
router.all(
  "/site-settings/projects/qpay/callback",
  handleProjectPaymentCallback,
);
router.all(
  "/site-settings/franchise/systemqr/callback",
  handleProjectPaymentCallback,
);
router.all(
  "/site-settings/franchise/qpay/callback",
  handleProjectPaymentCallback,
);

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
