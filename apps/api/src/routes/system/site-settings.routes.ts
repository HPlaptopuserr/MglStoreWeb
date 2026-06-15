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
import {
  optionalAuth,
  requireAuth,
  requirePlatformPermission,
} from "../../middleware/auth";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import { createPdfPreviewBuffer } from "../../lib/pdf-preview";
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

const PROJECT_PDF_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;
const PROJECT_PDF_PREVIEW_PROCESSING_LIMIT_BYTES = 25 * 1024 * 1024;

const projectPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROJECT_PDF_UPLOAD_LIMIT_BYTES },
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
const SITE_STUDY_KEY = "site-study";
const SITE_STUDY_SETTINGS_KEY = "site-study-settings";
const FREE_PDF_PREVIEW_PAGE_COUNT = 3;
const VENDOR_FEATURE_KEYS = new Set([
  "pos-enabled",
  "web-products-enabled",
  "supply-products-enabled",
  "preorder-products-enabled",
  "service-posts-enabled",
]);

function activePrimeUserWhere(userId: string): Prisma.UserWhereInput {
  return {
    id: userId,
    isPrime: true,
    isActive: true,
    deletedAt: null,
    OR: [
      { membershipExpiresAt: null },
      { membershipExpiresAt: { gt: new Date() } },
    ],
  };
}

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
  pdfPreviewUrl?: string;
  pdfThumbnailUrl?: string;
  teacherInfo?: string;
  duration?: string;
  capacity?: string;
  courseDate?: string;
  courseTime?: string;
  deliveryType?: string;
  location?: string;
  address?: string;
  registrationLabel?: string;
  scheduleNote?: string;
  priceNote?: string;
  originalPrice?: number;
  tags?: string[];
  isActive?: boolean;
  featuredOrder?: number;
  paymentAccountId?: string;
  paymentMerchantCode?: string;
  contractTemplateId?: string;
  contractUrl?: string;
  responsiblePeople?: ProjectResponsiblePerson[];
};

type ProjectResponsiblePerson = {
  id?: string;
  name?: string;
  role?: string;
  responsibility?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
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
type PaidAccessSource = "PROJECT" | "FRANCHISE";
type StudyRegistrationKind = "FREE" | "PRIME" | "PAID";

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

function getPublicPdfPreviewUrl(
  req: Request,
  project: Pick<PaidProject, "id" | "pdfUrl">,
  kind: "project" | "franchise",
) {
  const fileUrl = String(project.pdfUrl || "").trim();
  const projectId = String(project.id || "").trim();
  if (!fileUrl || !projectId) return "";

  return `${getApiRouteBaseUrl(req)}/site-settings/${kind === "franchise" ? "franchise" : "projects"}/${encodeURIComponent(projectId)}/preview-pdf`;
}

function isAllowedPdfPreviewSource(req: Request, fileUrl: string) {
  try {
    const target = new URL(fileUrl);
    const apiBase = new URL(getApiBaseUrl(req));
    if (target.origin === apiBase.origin) return true;

    const supabaseUrl = process.env.SUPABASE_URL
      ? new URL(process.env.SUPABASE_URL)
      : null;
    if (supabaseUrl && target.hostname === supabaseUrl.hostname) return true;
    if (target.hostname === "storage.mglstore.mn") return true;

    return target.protocol === "https:" && target.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
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

async function getStudyProjects(): Promise<PaidProject[]> {
  return getProjectItems(SITE_STUDY_KEY);
}

async function getStudySettings() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: SITE_STUDY_SETTINGS_KEY },
  });
  if (!setting?.value) return null;
  try {
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeProjectPrice(value: unknown) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
}

function getPublicProjects(projects: PaidProject[], req?: Request) {
  return projects
    .filter((project) => project.isActive !== false)
    .map((project) => normalizePublicProject(project, req, "project"));
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

function normalizeResponsiblePeople(project: PaidProject) {
  const people = Array.isArray(project.responsiblePeople)
    ? project.responsiblePeople
    : [];

  return people
    .map((person) => ({
      id: String(person?.id || "").trim(),
      name: String(person?.name || "").trim(),
      role: String(person?.role || "").trim(),
      responsibility: String(person?.responsibility || "").trim(),
      phone: String(person?.phone || "").trim(),
      email: String(person?.email || "").trim(),
      avatarUrl: String(person?.avatarUrl || "").trim(),
    }))
    .filter(
      (person) =>
        person.name ||
        person.role ||
        person.responsibility ||
        person.phone ||
        person.email ||
        person.avatarUrl,
    )
    .map((person, index) => ({
      ...person,
      id: person.id || `responsible-${index + 1}`,
    }));
}

function normalizeProject(project: PaidProject): PaidProject {
  const imageUrls = getProjectImages(project);
  const contractTemplateId = String(project.contractTemplateId || "").trim();
  const responsiblePeople = normalizeResponsiblePeople(project);

  return {
    ...project,
    price: normalizeProjectPrice(project.price),
    featuredOrder:
      Number.isFinite(Number(project.featuredOrder)) &&
      Number(project.featuredOrder) > 0
        ? Math.round(Number(project.featuredOrder))
        : 0,
    imageUrl: imageUrls[0] ?? project.imageUrl ?? "",
    imageUrls,
    contractTemplateId,
    contractUrl: contractTemplateId
      ? `/contract/sign/${encodeURIComponent(contractTemplateId)}`
      : undefined,
    responsiblePeople,
  };
}

function normalizePublicProject(
  project: PaidProject,
  req?: Request,
  kind: "project" | "franchise" = "project",
): PaidProject {
  const normalized = normalizeProject(project);
  const previewUrl =
    normalized.pdfPreviewUrl ||
    (req ? getPublicPdfPreviewUrl(req, normalized, kind) : "");

  return {
    id: normalized.id,
    title: normalized.title,
    category: normalized.category,
    summary: normalized.summary,
    price: normalized.price,
    imageUrl: normalized.imageUrl,
    imageUrls: normalized.imageUrls,
    pdfPreviewUrl: previewUrl || undefined,
    pdfThumbnailUrl: normalized.pdfThumbnailUrl,
    tags: normalized.tags,
    isActive: normalized.isActive,
    contractTemplateId: normalized.contractTemplateId,
    contractUrl: normalized.contractUrl,
    responsiblePeople: normalized.responsiblePeople,
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

function getPublicFranchiseProjects(projects: PaidProject[], req?: Request) {
  return sortMglStoreFranchiseFirst(
    projects
      .filter((project) => project.isActive !== false)
      .map((project) => normalizePublicProject(project, req, "franchise")),
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

function paidAccessSourceFromKind(kind: PaidContentKind): PaidAccessSource {
  return kind === "FRANCHISE_ACCESS" ? "FRANCHISE" : "PROJECT";
}

function paidAccessLabelFromSource(sourceType: PaidAccessSource) {
  return sourceType === "FRANCHISE" ? "Franchise" : "Төсөл";
}

function paidAccessFileName(project: PaidProject) {
  const cleanTitle = String(project.title || "MGL файл")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleanTitle || "MGL файл"}.pdf`;
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

const isSystemQrMasterAccount = (
  account: Pick<
    ProjectPaymentAccount,
    "merchantCode" | "username" | "accountNumber"
  >,
) => {
  const masterUsername = normalizeSystemQrLookup(process.env.SYSTEMQR_USERNAME);
  const masterAccountNumber = normalizeSystemQrLookup(
    process.env.SYSTEMQR_MASTER_ACCOUNT_NUMBER ||
      process.env.SYSTEMQR_ACCOUNT_NUMBER,
  );
  const merchantCode = normalizeSystemQrLookup(account.merchantCode);
  const username = normalizeSystemQrLookup(account.username);
  const accountNumber = normalizeSystemQrLookup(account.accountNumber);

  return (
    isSystemQrMasterMerchantCode(merchantCode) ||
    Boolean(masterUsername && username === masterUsername) ||
    Boolean(masterAccountNumber && accountNumber === masterAccountNumber)
  );
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
        (account) => account.merchantCode && !isSystemQrMasterAccount(account),
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

async function createProjectSystemQrInvoice(params: {
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

  if (!auth.username || !auth.password) {
    throw new Error(
      "Сонгосон Minu Dynamic QR дансны нэвтрэх эрх хадгалагдаагүй байна. Admin дээр тухайн дансыг дахин холбож хадгална уу.",
    );
  }

  try {
    return await createSystemQrInvoice(
      invoiceParams,
      auth.username,
      auth.password,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      isSystemQrAuthError(message) ||
      /createInvoice failed \(002\)/i.test(message)
    ) {
      throw new Error(
        "Сонгосон Minu Dynamic QR дансаар invoice үүсгэж чадсангүй. Буруу данс руу төлбөр орохоос сэргийлж master account-аар retry хийсэнгүй. Admin дээр тухайн дансны merchant code/password-ийг шалгаад дахин хадгална уу.",
      );
    }

    throw error;
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
  userId,
  projectId,
  project,
  invoiceId,
  price,
  kind = "PROJECT_ACCESS",
}: {
  userId?: string;
  projectId: string;
  project: PaidProject;
  invoiceId?: string;
  price: number;
  kind?: PaidContentKind;
}) {
  if (price <= 0) return true;

  const sourceType = paidAccessSourceFromKind(kind);
  if (userId) {
    const primeUser = await prisma.user.findFirst({
      where: activePrimeUserWhere(userId),
      select: { id: true },
    });
    if (primeUser) return true;

    const purchase = await prisma.paidAccessPurchase.findUnique({
      where: {
        userId_sourceType_itemId: {
          userId,
          sourceType,
          itemId: projectId,
        },
      },
      select: { id: true },
    });
    if (purchase) return true;
  }

  if (!invoiceId) return false;

  const invoice = await refreshProjectInvoicePayment(invoiceId);
  if (!invoice) return false;
  const payload = projectPaymentPayload(invoice);
  if (!userId || String(payload.userId || "") !== userId) return false;

  const canUnlock =
    invoice.status === PosQPayStatus.PAID &&
    projectInvoiceBelongsTo(invoice, projectId, price, kind);
  if (canUnlock) {
    await ensurePaidAccessPurchaseForInvoice({
      invoice,
      project,
      kind,
      userId,
    });
  }
  return canUnlock;
}

async function ensurePaidAccessPurchaseForInvoice({
  invoice,
  project,
  kind,
  userId,
}: {
  invoice: Awaited<ReturnType<typeof refreshProjectInvoicePayment>>;
  project: PaidProject;
  kind: PaidContentKind;
  userId: string;
}) {
  if (!invoice || invoice.status !== PosQPayStatus.PAID) return null;

  const sourceType = paidAccessSourceFromKind(kind);
  const payload = projectPaymentPayload(invoice);
  const itemId = String(payload.projectId || project.id || "").trim();
  if (!itemId || String(payload.userId || "") !== userId) return null;

  const amount = Math.max(0, Math.round(Number(invoice.amount || 0)));
  const earnedPoints = Math.floor(amount * 0.02);
  const fileUrl = String(project.pdfUrl || "").trim() || null;
  const source = String(payload.source || "").trim();
  const metadata = {
    kind,
    ...(source ? { source } : {}),
    projectId: itemId,
    projectTitle: project.title,
    paidAt: invoice.paidAt?.toISOString() || new Date().toISOString(),
  } as unknown as Prisma.JsonObject;

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.paidAccessPurchase.upsert({
      where: {
        userId_sourceType_itemId: {
          userId,
          sourceType,
          itemId,
        },
      },
      update: {
        title: project.title,
        fileUrl,
        fileName: fileUrl ? paidAccessFileName(project) : null,
        amount,
        invoiceId: invoice.id,
        metadata,
      },
      create: {
        userId,
        sourceType,
        itemId,
        title: project.title,
        fileUrl,
        fileName: fileUrl ? paidAccessFileName(project) : null,
        amount,
        invoiceId: invoice.id,
        metadata,
      },
    });

    if (earnedPoints > 0) {
      const existingLedger = await tx.mPointLedger.findUnique({
        where: { invoiceId: invoice.id },
        select: { id: true },
      });
      if (!existingLedger) {
        const balance = await tx.mPointLedger.aggregate({
          where: { userId },
          _sum: { amount: true },
        });
        const balanceAfter = Number(balance._sum.amount || 0) + earnedPoints;
        await tx.mPointLedger.create({
          data: {
            userId,
            type: "EARN",
            amount: earnedPoints,
            balanceAfter,
            sourceType,
            sourceId: itemId,
            invoiceId: invoice.id,
            description: `${paidAccessLabelFromSource(sourceType)} худалдан авалт - ${project.title}`,
          },
        });
      }
    }

    return purchase;
  });
}

async function ensureStudyRegistrationAccess({
  userId,
  project,
  registrationKind,
}: {
  userId: string;
  project: PaidProject;
  registrationKind: StudyRegistrationKind;
}) {
  const itemId = String(project.id || "").trim();
  if (!userId || !itemId) return null;

  const price = normalizeProjectPrice(project.price);
  const fileUrl = String(project.pdfUrl || "").trim() || null;
  const now = new Date().toISOString();

  return prisma.paidAccessPurchase.upsert({
    where: {
      userId_sourceType_itemId: {
        userId,
        sourceType: "PROJECT",
        itemId,
      },
    },
    update: {
      title: project.title,
      fileUrl,
      fileName: fileUrl ? paidAccessFileName(project) : null,
      metadata: {
        kind: "PROJECT_ACCESS",
        source: "STUDY",
        registrationKind,
        projectId: itemId,
        projectTitle: project.title,
        category: project.category || "",
        originalPrice: price,
        registeredAt: now,
      } as unknown as Prisma.JsonObject,
    },
    create: {
      userId,
      sourceType: "PROJECT",
      itemId,
      title: project.title,
      fileUrl,
      fileName: fileUrl ? paidAccessFileName(project) : null,
      amount: 0,
      metadata: {
        kind: "PROJECT_ACCESS",
        source: "STUDY",
        registrationKind,
        projectId: itemId,
        projectTitle: project.title,
        category: project.category || "",
        originalPrice: price,
        registeredAt: now,
      } as unknown as Prisma.JsonObject,
    },
  });
}

async function ensurePaidAccessPurchaseFromInvoice(
  invoice: Awaited<ReturnType<typeof refreshProjectInvoicePayment>>,
) {
  if (!invoice || invoice.status !== PosQPayStatus.PAID) return null;

  const payload = projectPaymentPayload(invoice);
  const kind = String(payload.kind || "") as PaidContentKind;
  if (kind !== "PROJECT_ACCESS" && kind !== "FRANCHISE_ACCESS") return null;

  const userId = String(payload.userId || "").trim();
  const projectId = String(payload.projectId || "").trim();
  if (!userId || !projectId) return null;

  const source = String(payload.source || "").trim();
  const projects =
    kind === "FRANCHISE_ACCESS"
      ? await getFranchiseProjects()
      : source === "STUDY"
        ? await getStudyProjects()
        : await getPaidProjects();
  const project = projects.find(
    (item) => item.id === projectId && item.isActive !== false,
  );
  if (!project) return null;

  const normalized =
    kind === "FRANCHISE_ACCESS"
      ? normalizeFranchiseProject(project)
      : normalizeProject(project);
  const price = normalizeProjectPrice(normalized.price);
  if (!projectInvoiceBelongsTo(invoice, projectId, price, kind)) return null;

  return ensurePaidAccessPurchaseForInvoice({
    invoice,
    project: normalized,
    kind,
    userId,
  });
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
router.get("/site-settings", async (req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      if (Buffer.byteLength(s.value, "utf8") <= SETTING_VALUE_MAX_BYTES) {
        if (s.key === FRANCHISE_ITEMS_KEY) {
          obj[s.key] = JSON.stringify(
            getPublicFranchiseProjects(await getFranchiseProjects(), req),
          );
        } else if (s.key === SITE_PROJECTS_KEY) {
          obj[s.key] = JSON.stringify(
            getPublicProjects(await getPaidProjects(), req),
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

// GET /admin/study/registrations — unified training registrations list.
router.get(
  "/admin/study/registrations",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS),
  async (req, res) => {
    try {
      const search = String(req.query.search || "")
        .trim()
        .toLowerCase();
      const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
      const studyProjects = await getStudyProjects();
      const studyProjectIds = new Set(studyProjects.map((item) => item.id));
      const projectById = new Map(
        studyProjects.map((item) => [item.id, normalizeProject(item)]),
      );

      const purchases = await prisma.paidAccessPurchase.findMany({
        where: {
          sourceType: "PROJECT",
        },
        orderBy: { purchasedAt: "desc" },
        take: 1000,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isPrime: true,
              profile: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });

      const registrations = purchases
        .filter((purchase) => {
          const metadata = (purchase.metadata || {}) as Record<string, unknown>;
          return (
            metadata.source === "STUDY" || studyProjectIds.has(purchase.itemId)
          );
        })
        .map((purchase) => {
          const metadata = (purchase.metadata || {}) as Record<string, unknown>;
          const project = projectById.get(purchase.itemId);
          const originalPrice = Number(
            metadata.originalPrice || project?.price || 0,
          );
          const isPaid = purchase.amount > 0 || Boolean(purchase.invoiceId);
          const registrationKind =
            String(metadata.registrationKind || "") ||
            (isPaid ? "PAID" : purchase.user.isPrime ? "PRIME" : "FREE");

          return {
            id: purchase.id,
            courseId: purchase.itemId,
            courseTitle: purchase.title || project?.title || "Сургалт",
            category: String(
              metadata.category || project?.category || "Сургалт",
            ),
            amount: purchase.amount,
            originalPrice,
            invoiceId: purchase.invoiceId,
            registeredAt: purchase.purchasedAt,
            registrationKind,
            user: {
              id: purchase.user.id,
              email: purchase.user.email,
              fullName: purchase.user.profile?.fullName || "",
              phoneNumber: purchase.user.profile?.phoneNumber || "",
              isPrime: purchase.user.isPrime,
            },
          };
        })
        .filter((registration) => {
          if (!search) return true;
          const haystack = [
            registration.courseTitle,
            registration.category,
            registration.user.fullName,
            registration.user.email,
            registration.user.phoneNumber,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        })
        .slice(0, limit);

      const stats = registrations.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.amount > 0 || item.invoiceId) acc.paid += 1;
          else acc.free += 1;
          if (item.user.isPrime) acc.prime += 1;
          return acc;
        },
        { total: 0, paid: 0, free: 0, prime: 0 },
      );

      res.json({ success: true, data: registrations, stats });
    } catch (error) {
      console.error("get study registrations error", error);
      res.status(500).json({
        success: false,
        message: "Сургалтын бүртгэл авахад алдаа гарлаа",
      });
    }
  },
);

// Organization-scoped vendor feature switches.
// These are managed by partner admins, not only site-content admins.
router.get(
  "/site-settings/vendor-features/:organizationId",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const settings = await prisma.siteSetting.findMany({
        where: {
          key: {
            in: Array.from(VENDOR_FEATURE_KEYS).map(
              (featureKey) => `${featureKey}-${organizationId}`,
            ),
          },
        },
      });

      const values: Record<string, string> = {};
      for (const setting of settings) {
        values[setting.key] = setting.value;
      }

      res.json(values);
    } catch (error) {
      console.error("get vendor feature settings error", error);
      res.status(500).json({ message: "Vendor тохиргоог авахад алдаа гарлаа" });
    }
  },
);

router.put(
  "/site-settings/vendor-features/:organizationId/:featureKey",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  async (req, res) => {
    const { organizationId, featureKey } = req.params;
    const { value } = req.body as { value: string };

    if (!VENDOR_FEATURE_KEYS.has(featureKey)) {
      res.status(400).json({ message: "Буруу vendor feature key" });
      return;
    }

    if (typeof value !== "string") {
      res.status(400).json({ message: "value шаардлагатай" });
      return;
    }

    try {
      const organization = await prisma.organization.findFirst({
        where: { id: organizationId, deletedAt: null },
        select: { id: true },
      });

      if (!organization) {
        res.status(404).json({ message: "Байгууллага олдсонгүй" });
        return;
      }

      const settingKey = `${featureKey}-${organizationId}`;
      const setting = await prisma.siteSetting.upsert({
        where: { key: settingKey },
        update: { value },
        create: { key: settingKey, value },
      });

      res.json(setting);
    } catch (error) {
      console.error("put vendor feature setting error", error);
      res
        .status(500)
        .json({ message: "Vendor тохиргоо хадгалахад алдаа гарлаа" });
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
      const previewFileName = fileName.replace(/\.pdf$/i, "-preview.pdf");
      const url = await uploadSiteFile(
        req,
        fileName,
        req.file.buffer,
        "application/pdf",
      );

      const shouldCreatePreview =
        req.file.buffer.byteLength <= PROJECT_PDF_PREVIEW_PROCESSING_LIMIT_BYTES;
      const previewBuffer = shouldCreatePreview
        ? await createPdfPreviewBuffer(
            req.file.buffer,
            FREE_PDF_PREVIEW_PAGE_COUNT,
          )
        : null;
      const previewUrl = previewBuffer
        ? await uploadSiteFile(
            req,
            previewFileName,
            previewBuffer,
            "application/pdf",
          )
        : "";

      res.json({
        url,
        previewUrl,
        previewPageCount: FREE_PDF_PREVIEW_PAGE_COUNT,
        previewSkipped: !shouldCreatePreview,
      });
    } catch (err) {
      console.error("project-pdf-upload error", err);
      res.status(500).json({
        message: "PDF upload хийхэд алдаа гарлаа",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

async function sendProjectPdfPreview({
  req,
  res,
  kind,
}: {
  req: Request;
  res: Response;
  kind: "project" | "franchise";
}) {
  try {
    const projectId = String(req.params.projectId || "").trim();
    const projects =
      kind === "franchise"
        ? await getFranchiseProjects()
        : await getPaidProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    const fileUrl = String(project?.pdfUrl || "").trim();

    if (!project || !fileUrl || !isAllowedPdfPreviewSource(req, fileUrl)) {
      res.status(404).json({ message: "Preview PDF олдсонгүй" });
      return;
    }

    const pdfRes = await fetch(fileUrl);
    if (!pdfRes.ok) {
      res.status(404).json({ message: "PDF файл олдсонгүй" });
      return;
    }

    const contentLength = Number(pdfRes.headers.get("content-length") || 0);
    if (contentLength > PROJECT_PDF_PREVIEW_PROCESSING_LIMIT_BYTES) {
      res.status(413).json({ message: "PDF файл хэт том байна" });
      return;
    }

    const sourceBuffer = Buffer.from(await pdfRes.arrayBuffer());
    if (sourceBuffer.byteLength > PROJECT_PDF_PREVIEW_PROCESSING_LIMIT_BYTES) {
      res.status(413).json({ message: "PDF файл хэт том байна" });
      return;
    }

    const previewBuffer = await createPdfPreviewBuffer(
      sourceBuffer,
      FREE_PDF_PREVIEW_PAGE_COUNT,
    );
    if (!previewBuffer) {
      res.status(404).json({ message: "Preview үүсгэх хуудас олдсонгүй" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    res.send(previewBuffer);
  } catch (err) {
    console.error("project-pdf-preview error", err);
    res.status(500).json({
      message: "Preview PDF үүсгэхэд алдаа гарлаа",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

// GET /site-settings/projects/:projectId/preview-pdf — public first pages only.
router.get("/site-settings/projects/:projectId/preview-pdf", async (req, res) => {
  await sendProjectPdfPreview({ req, res, kind: "project" });
});

// GET /site-settings/franchise/:projectId/preview-pdf — public first pages only.
router.get("/site-settings/franchise/:projectId/preview-pdf", async (req, res) => {
  await sendProjectPdfPreview({ req, res, kind: "franchise" });
});

// GET /site-settings/franchise — public Franchise summary list.
router.get("/site-settings/franchise", async (req, res) => {
  try {
    const projects = await getFranchiseProjects();
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
    res.json({
      success: true,
      projects: getPublicFranchiseProjects(projects, req),
    });
  } catch (error) {
    console.error("get franchise list error", error);
    res.status(500).json({
      success: false,
      message: "Franchise мэдээлэл авахад алдаа гарлаа",
    });
  }
});

// GET /site-settings/franchise/:projectId/detail — full Franchise detail.
router.get(
  "/site-settings/franchise/:projectId/detail",
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const invoiceId =
        typeof req.query.invoiceId === "string"
          ? req.query.invoiceId
          : undefined;

      const projects = await getFranchiseProjects();
      const project = projects.find(
        (item) => item.id === projectId && item.isActive !== false,
      );
      if (!project) {
        res
          .status(404)
          .json({ success: false, message: "Franchise олдсонгүй" });
        return;
      }

      const normalized = normalizeFranchiseProject(project);
      const price = normalizeProjectPrice(normalized.price);
      const userId = String((req as any).user?.userId || "").trim();
      if (price > 0 && !userId) {
        res.status(401).json({
          success: false,
          requiresAuth: true,
          message: "Franchise худалдан авахын өмнө нэвтэрнэ үү",
        });
        return;
      }

      const hasAccess = await ensurePaidProjectAccess({
        userId,
        projectId,
        project: normalized,
        invoiceId,
        price,
        kind: "FRANCHISE_ACCESS",
      });
      if (!hasAccess) {
        res.status(402).json({
          success: false,
          requiresPayment: true,
          message:
            "Franchise дэлгэрэнгүй мэдээлэл үзэхийн тулд төлбөр төлнө үү",
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
  },
);

// GET /site-settings/projects — public summary list only
router.get("/site-settings/projects", async (req, res) => {
  try {
    const projects = await getPaidProjects();
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
    res.json({ success: true, projects: getPublicProjects(projects, req) });
  } catch (error) {
    console.error("get public projects error", error);
    res.status(500).json({
      success: false,
      message: "Төслийн жагсаалт авахад алдаа гарлаа",
    });
  }
});

// GET /site-settings/study — public training material list.
router.get("/site-settings/study", async (_req, res) => {
  try {
    const projects = await getStudyProjects();
    const settings = await getStudySettings();
    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      settings,
      projects: projects
        .filter((project) => project.isActive !== false)
        .map((project) => normalizeProject(project)),
    });
  } catch (error) {
    console.error("get public study materials error", error);
    res.status(500).json({
      success: false,
      message: "Сургалтын материал авахад алдаа гарлаа",
    });
  }
});

// GET /site-settings/study/:projectId/detail — full training registration detail.
router.get(
  "/site-settings/study/:projectId/detail",
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const invoiceId =
        typeof req.query.invoiceId === "string"
          ? req.query.invoiceId
          : undefined;

      const projects = await getStudyProjects();
      const project = projects.find(
        (item) => item.id === projectId && item.isActive !== false,
      );
      if (!project) {
        res.status(404).json({ success: false, message: "Сургалт олдсонгүй" });
        return;
      }

      const normalized = normalizeProject(project);
      const price = normalizeProjectPrice(normalized.price);
      const userId = String((req as any).user?.userId || "").trim();
      if (price > 0 && !userId) {
        res.status(401).json({
          success: false,
          requiresAuth: true,
          message: "Сургалтад бүртгүүлэхийн өмнө нэвтэрнэ үү",
        });
        return;
      }

      const hasAccess = await ensurePaidProjectAccess({
        userId,
        projectId,
        project: normalized,
        invoiceId,
        price,
      });
      if (!hasAccess) {
        res.status(402).json({
          success: false,
          requiresPayment: true,
          message: "Сургалтад бүртгүүлэхийн тулд төлбөр төлнө үү",
        });
        return;
      }

      res.json({ success: true, project: normalized });
    } catch (error) {
      console.error("get study detail error", error);
      res.status(500).json({
        success: false,
        message: "Сургалтын мэдээлэл авахад алдаа гарлаа",
      });
    }
  },
);

// GET /site-settings/projects/:projectId/detail — full detail after payment check
router.get(
  "/site-settings/projects/:projectId/detail",
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const invoiceId =
        typeof req.query.invoiceId === "string"
          ? req.query.invoiceId
          : undefined;

      const projects = await getPaidProjects();
      const project = projects.find(
        (item) => item.id === projectId && item.isActive !== false,
      );
      if (!project) {
        res.status(404).json({ success: false, message: "Төсөл олдсонгүй" });
        return;
      }

      const normalized = normalizeProject(project);
      const price = normalizeProjectPrice(normalized.price);
      const userId = String((req as any).user?.userId || "").trim();
      if (price > 0 && !userId) {
        res.status(401).json({
          success: false,
          requiresAuth: true,
          message: "Төсөл худалдан авахын өмнө нэвтэрнэ үү",
        });
        return;
      }

      const hasAccess = await ensurePaidProjectAccess({
        userId,
        projectId,
        project: normalized,
        invoiceId,
        price,
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
  },
);

// POST /site-settings/mgl-services/qpay — MGL үйлчилгээ захиалах үед QPay нэхэмжлэх үүсгэх
router.post(
  "/site-settings/mgl-services/qpay",
  requireAuth,
  async (req, res) => {
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
  },
);

// GET /site-settings/mgl-services/qpay/check — Төлбөр шалгах
router.get(
  "/site-settings/mgl-services/qpay/check",
  requireAuth,
  async (req, res) => {
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
  },
);

// POST /site-settings/projects/systemqr — project detail access Minu Dynamic QR invoice.
const createProjectSystemQrPaymentSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
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

    const primeUser = await prisma.user.findFirst({
      where: activePrimeUserWhere(userId),
      select: { id: true },
    });
    if (primeUser) {
      res.json({
        success: true,
        free: true,
        primeAccess: true,
        projectId,
      });
      return;
    }

    const existingPurchase = await prisma.paidAccessPurchase.findUnique({
      where: {
        userId_sourceType_itemId: {
          userId,
          sourceType: "PROJECT",
          itemId: projectId,
        },
      },
      select: { id: true },
    });
    if (existingPurchase) {
      res.json({
        success: true,
        free: true,
        alreadyPurchased: true,
        projectId,
      });
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
          userId,
          projectId,
          projectTitle: normalized.title,
          paymentAccountId: account.id || "",
          paymentAccountLabel: account.label || account.merchantName || "",
          merchantCode: account.merchantCode,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      const systemQr = await createProjectSystemQrInvoice({
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
            userId,
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
    const userId = String((req as any).user?.userId || "").trim();
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

    const primeUser = await prisma.user.findFirst({
      where: activePrimeUserWhere(userId),
      select: { id: true },
    });
    if (primeUser) {
      res.json({
        success: true,
        free: true,
        primeAccess: true,
        projectId,
      });
      return;
    }

    const existingPurchase = await prisma.paidAccessPurchase.findUnique({
      where: {
        userId_sourceType_itemId: {
          userId,
          sourceType: "FRANCHISE",
          itemId: projectId,
        },
      },
      select: { id: true },
    });
    if (existingPurchase) {
      res.json({
        success: true,
        free: true,
        alreadyPurchased: true,
        projectId,
      });
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
          userId,
          projectId,
          projectTitle: normalized.title,
          paymentAccountId: account.id || "",
          paymentAccountLabel: account.label || account.merchantName || "",
          merchantCode: account.merchantCode,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      const systemQr = await createProjectSystemQrInvoice({
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
            userId,
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

const createStudySystemQrPaymentSession = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "projectId шаардлагатай" });
      return;
    }

    const projects = await getStudyProjects();
    const project = projects.find(
      (item) => item.id === projectId && item.isActive !== false,
    );
    if (!project) {
      res.status(404).json({ success: false, message: "Сургалт олдсонгүй" });
      return;
    }

    const normalized = normalizeProject(project);
    const amount = normalizeProjectPrice(normalized.price);
    if (amount <= 0) {
      await ensureStudyRegistrationAccess({
        userId,
        project: normalized,
        registrationKind: "FREE",
      });
      res.json({ success: true, free: true, projectId });
      return;
    }

    const primeUser = await prisma.user.findFirst({
      where: activePrimeUserWhere(userId),
      select: { id: true },
    });
    if (primeUser) {
      await ensureStudyRegistrationAccess({
        userId,
        project: normalized,
        registrationKind: "PRIME",
      });
      res.json({
        success: true,
        free: true,
        primeAccess: true,
        projectId,
      });
      return;
    }

    const existingPurchase = await prisma.paidAccessPurchase.findUnique({
      where: {
        userId_sourceType_itemId: {
          userId,
          sourceType: "PROJECT",
          itemId: projectId,
        },
      },
      select: { id: true },
    });
    if (existingPurchase) {
      res.json({
        success: true,
        free: true,
        alreadyPurchased: true,
        projectId,
      });
      return;
    }

    const expiresAt = new Date(Date.now() + PROJECT_PAYMENT_TTL_MS);
    const account = await resolveProjectPaymentAccount(normalized);
    if (!account?.merchantCode) {
      res.status(400).json({
        success: false,
        message:
          "Энэ сургалтын төлбөр орох Minu Dynamic QR данс сонгогдоогүй байна. Admin дээр Сургалт засахдаа төлбөрийн данс сонгоно уу.",
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
          source: "STUDY",
          userId,
          projectId,
          projectTitle: normalized.title,
          paymentAccountId: account.id || "",
          paymentAccountLabel: account.label || account.merchantName || "",
          merchantCode: account.merchantCode,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      const systemQr = await createProjectSystemQrInvoice({
        account,
        referenceNumber: `STD-${invoice.id.slice(0, 8).toUpperCase()}`,
        amount,
        webhook: `${getApiRouteBaseUrl(req)}/site-settings/study/systemqr/callback?invoiceId=${invoice.id}`,
      });

      const updated = await prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          qrText: systemQr.qrText,
          webhookPayload: {
            kind: "PROJECT_ACCESS",
            provider: "SYSTEMQR",
            source: "STUDY",
            userId,
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
    console.error("study systemqr create error", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Сургалтын Dynamic QR төлбөр үүсгэхэд алдаа гарлаа",
    });
  }
};

router.post(
  "/site-settings/projects/systemqr",
  requireAuth,
  createProjectSystemQrPaymentSession,
);
router.post(
  "/site-settings/projects/qpay",
  requireAuth,
  createProjectSystemQrPaymentSession,
);
router.post(
  "/site-settings/franchise/systemqr",
  requireAuth,
  createFranchiseSystemQrPaymentSession,
);
router.post(
  "/site-settings/franchise/qpay",
  requireAuth,
  createFranchiseSystemQrPaymentSession,
);
router.post(
  "/site-settings/study/systemqr",
  requireAuth,
  createStudySystemQrPaymentSession,
);
router.post(
  "/site-settings/study/qpay",
  requireAuth,
  createStudySystemQrPaymentSession,
);

// GET /site-settings/projects/systemqr/check — project detail payment check.
const checkProjectPaymentSession = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
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
    if (String(payload.userId || "") !== userId) {
      res.status(403).json({
        success: false,
        message: "Энэ нэхэмжлэх таны account-д хамаарахгүй байна",
      });
      return;
    }
    const belongsToProject =
      !projectId ||
      (String(payload.kind || "") === "PROJECT_ACCESS" &&
        String(payload.projectId || "") === projectId &&
        invoice.saleReference === projectSaleReference(projectId));

    if (invoice.status === PosQPayStatus.PAID && belongsToProject) {
      await ensurePaidAccessPurchaseFromInvoice(invoice);
    }

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
  requireAuth,
  checkProjectPaymentSession,
);
router.get(
  "/site-settings/projects/qpay/check",
  requireAuth,
  checkProjectPaymentSession,
);
router.get(
  "/site-settings/study/systemqr/check",
  requireAuth,
  checkProjectPaymentSession,
);
router.get(
  "/site-settings/study/qpay/check",
  requireAuth,
  checkProjectPaymentSession,
);

const checkFranchisePaymentSession = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
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
    if (String(payload.userId || "") !== userId) {
      res.status(403).json({
        success: false,
        message: "Энэ нэхэмжлэх таны account-д хамаарахгүй байна",
      });
      return;
    }
    const belongsToFranchise =
      !projectId ||
      (String(payload.kind || "") === "FRANCHISE_ACCESS" &&
        String(payload.projectId || "") === projectId &&
        invoice.saleReference ===
          projectSaleReference(projectId, "FRANCHISE_ACCESS"));

    if (invoice.status === PosQPayStatus.PAID && belongsToFranchise) {
      await ensurePaidAccessPurchaseFromInvoice(invoice);
    }

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
  requireAuth,
  checkFranchisePaymentSession,
);
router.get(
  "/site-settings/franchise/qpay/check",
  requireAuth,
  checkFranchisePaymentSession,
);

const handleProjectPaymentCallback = async (req: Request, res: Response) => {
  try {
    const invoiceId = String(
      req.query.invoiceId || req.body?.invoiceId || "",
    ).trim();
    if (invoiceId) {
      const invoice = await refreshProjectInvoicePayment(invoiceId);
      await ensurePaidAccessPurchaseFromInvoice(invoice);
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
router.all(
  "/site-settings/study/systemqr/callback",
  handleProjectPaymentCallback,
);
router.all("/site-settings/study/qpay/callback", handleProjectPaymentCallback);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(isTooLarge ? 413 : 400).json({
        message: isTooLarge
          ? "Файлын хэмжээ хэтэрсэн байна. PDF upload дээд хэмжээ 100MB."
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
