import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@mgl/database";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import {
  createSystemQrInvoice,
  checkSystemQrPayment,
  listSystemQrSubMerchants,
  registerSystemQrSubMerchant,
  resetSystemQrSubMerchantPassword,
} from "../../services/systemqr";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";

const router: ExpressRouter = Router();

const requiredMinuBankFields = [
  "merchantName",
  "accountNumber",
  "bankCode",
  "registerNumber",
  "phone",
] as const;

const CONTRACT_PAYMENT_ACCOUNTS_KEY = "contract-payment-accounts";

const isSystemQrAuthError = (message: string) =>
  /SystemQR Login Error|Хэрэглэгчийн нэр эсвэл нууц үг|username or password|credential|unauthorized|401|403/i.test(message);

const isSystemQrNetworkError = (message: string) =>
  /fetch failed|network|timeout|timed out|unable to connect|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|UND_ERR/i.test(message);

const isContractSystemQrInactiveError = (message: string) =>
  /CONTRACT_SYSTEMQR_ACCOUNT_NOT_ACTIVE/i.test(message);

const isContractSystemQrPasswordMissingError = (message: string) =>
  /CONTRACT_SYSTEMQR_PASSWORD_MISSING/i.test(message);

const contractSystemQrPublicError = (message: string, fallback: string) =>
  isContractSystemQrInactiveError(message)
    ? "Энэ гэрээний төлбөрийн Minu Dynamic QR данс устгагдсан эсвэл идэвхгүй байна. Admin дээр гэрээний template дээр идэвхтэй данс дахин сонгоод шинэ link үүсгэнэ үү."
    : isContractSystemQrPasswordMissingError(message)
    ? "Энэ гэрээний төлбөрийн Minu Dynamic QR subMerchant password олдсонгүй. Admin дээр Minu данс холбох эсвэл бүртгэл шалгах үйлдлээр password-оо сэргээж хадгална уу."
    : isSystemQrAuthError(message)
    ? `${fallback}. Minu SystemQR тохиргоо эсвэл Minu талын эрхийг шалгана уу.`
    : isSystemQrNetworkError(message)
    ? `${fallback}. Minu SystemQR API руу холбогдохгүй байна. API сервер api.minu.mn:443 рүү гарах эрхтэй эсэх, системийн VPN/proxy/whitelist-аа шалгана уу.`
    : message;

const normalizeSystemQrLookup = (value?: string | null) => String(value || "").trim().toLowerCase();

const isSystemQrMasterMerchantCode = (merchantCode?: string | null) => {
  const code = normalizeSystemQrLookup(merchantCode);
  const masterUsername = normalizeSystemQrLookup(process.env.SYSTEMQR_USERNAME);
  return Boolean(code && masterUsername && code === masterUsername);
};

const existingSubMerchantAccountUnverifiedError = (
  existing: { merchantName?: string | null; merchantCode?: string | null },
  requestedAccountNumber?: string | null,
) => {
  const merchantName = String(existing.merchantName || "-").trim();
  const merchantCode = String(existing.merchantCode || "-").trim();
  const accountNumber = String(requestedAccountNumber || "").trim();
  const accountPart = accountNumber
    ? `${accountNumber} данстай эсэхийг`
    : "аль данстай холбогдсоныг";

  return `Minu дээр "${merchantName}" нэртэй subMerchant аль хэдийн байна (${merchantCode}). Minu API account number буцаадаггүй тул ${accountPart} баталгаажуулах боломжгүй. Буруу данс руу төлбөр орохоос сэргийлж existing merchantCode-г автоматаар ашигласангүй. Minu дээр linked дансыг шалгаад зөв бол merchantCode-г гараар оруулж хадгална уу.`;
};

type ContractSystemQrAuth = { username?: string; password?: string };

async function getContractPaymentAccounts() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY },
  }).catch(() => null);

  if (!setting?.value) return [];
  try {
    const accounts = JSON.parse(setting.value);
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function findContractSystemQrAccount(accounts: any[], systemQrConfig: any) {
  const merchantCode = String(systemQrConfig?.merchantCode || "").trim();
  const selectedAccountId = String(systemQrConfig?.selectedAccountId || "").trim();
  if (isSystemQrMasterMerchantCode(merchantCode)) return undefined;
  return accounts.find((item: any) =>
    (selectedAccountId && String(item?.id || "").trim() === selectedAccountId)
    || (merchantCode && String(item?.merchantCode || "").trim() === merchantCode)
  );
}

function sanitizeContractHeaderData(headerData: any) {
  if (!headerData || typeof headerData !== "object") return headerData;
  const safe = JSON.parse(JSON.stringify(headerData));
  const scrub = (value: any) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(scrub);
      return;
    }
    if ("merchantCode" in value || "systemQr" in value) {
      delete value.username;
      delete value.password;
    }
    Object.values(value).forEach(scrub);
  };
  scrub(safe);
  return safe;
}

async function getLocalContractSystemQrSubMerchants(query: string) {
  const normalizedQuery = normalizeSystemQrLookup(query);
  const seen = new Set<string>();
  const rows: Array<{
    merchantCode: string;
    merchantName: string;
    merchantNo: null;
    terminalNo: null;
    createdDate: string | null;
  }> = [];

  const addRow = (input: any, createdDate?: string | Date | null) => {
    const merchantCode = String(input?.merchantCode || "").trim();
    if (!merchantCode || seen.has(merchantCode.toLowerCase())) return;
    if (isSystemQrMasterMerchantCode(merchantCode)) return;
    const merchantName = String(input?.merchantName || input?.label || merchantCode).trim();
    if (
      normalizedQuery
      && !normalizeSystemQrLookup(merchantName).includes(normalizedQuery)
      && !normalizeSystemQrLookup(merchantCode).includes(normalizedQuery)
    ) {
      return;
    }

    seen.add(merchantCode.toLowerCase());
    rows.push({
      merchantCode,
      merchantName,
      merchantNo: null,
      terminalNo: null,
      createdDate: createdDate ? new Date(createdDate).toISOString() : null,
    });
  };

  const accounts = await getContractPaymentAccounts();
  accounts.forEach((account) => addRow(account, account?.updatedAt || account?.createdAt || null));

  const templates = await prisma.contract.findMany({
    where: { isTemplate: true },
    select: { headerData: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  templates.forEach((contract) => addRow((contract.headerData as any)?.systemQr, contract.updatedAt));

  return rows;
}

async function cacheContractSystemQrAuth(systemQrConfig: any, auth: ContractSystemQrAuth) {
  const merchantCode = String(systemQrConfig?.merchantCode || "").trim();
  const password = String(auth.password || "").trim();
  if (!merchantCode || !password) return;

  const username = String(auth.username || systemQrConfig?.username || merchantCode).trim();
  const selectedAccountId = String(systemQrConfig?.selectedAccountId || "").trim();
  const now = new Date().toISOString();
  let accounts = await getContractPaymentAccounts();

  let updated = false;
  accounts = accounts.map((account) => {
    const sameAccount = selectedAccountId && String(account?.id || "").trim() === selectedAccountId;
    const sameMerchant = String(account?.merchantCode || "").trim() === merchantCode;
    if (!sameAccount && !sameMerchant) return account;
    updated = true;
    return {
      ...account,
      merchantCode: String(account?.merchantCode || merchantCode).trim(),
      username,
      password,
      updatedAt: now,
    };
  });

  if (!updated) return;

  await prisma.siteSetting.upsert({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY },
    update: { value: JSON.stringify(accounts) },
    create: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY, value: JSON.stringify(accounts) },
  }).catch((error) => {
    console.warn("contract SystemQR auth cache update failed", error);
  });
}

async function getStoredContractSystemQrAuth(merchantCode: string): Promise<ContractSystemQrAuth> {
  const normalizedMerchantCode = String(merchantCode || "").trim();
  if (!normalizedMerchantCode) return {};

  const accounts = await getContractPaymentAccounts();
  const existingAccount = accounts.find(
    (account: any) => String(account?.merchantCode || "").trim() === normalizedMerchantCode,
  );
  const existingPassword = String(existingAccount?.password || "").trim();
  if (existingPassword) {
    return {
      username: String(existingAccount?.username || normalizedMerchantCode).trim(),
      password: existingPassword,
    };
  }

  return {
    username: String(existingAccount?.username || normalizedMerchantCode).trim(),
  };
}

async function recoverContractSystemQrAuth(merchantCode: string): Promise<ContractSystemQrAuth> {
  const storedAuth = await getStoredContractSystemQrAuth(merchantCode);
  if (storedAuth.password) return storedAuth;

  const normalizedMerchantCode = String(merchantCode || "").trim();
  if (!normalizedMerchantCode) return storedAuth;

  const reset = await resetSystemQrSubMerchantPassword(normalizedMerchantCode);
  const auth = {
    username: String(reset.username || storedAuth.username || normalizedMerchantCode).trim(),
    password: reset.password ? String(reset.password).trim() : undefined,
  };

  if (auth.password) {
    await cacheContractSystemQrAuth({ merchantCode: normalizedMerchantCode }, auth);
  }

  return auth.password ? auth : storedAuth;
}

async function resolveContractSystemQrAuth(systemQrConfig: any): Promise<ContractSystemQrAuth> {
  const merchantCode = String(systemQrConfig?.merchantCode || "").trim();
  const inlinePassword = String(systemQrConfig?.password || "").trim();
  const accounts = await getContractPaymentAccounts();
  const account = findContractSystemQrAccount(accounts, systemQrConfig);

  if (!account) {
    throw new Error("CONTRACT_SYSTEMQR_ACCOUNT_NOT_ACTIVE");
  }

  const accountPassword = String(account?.password || "").trim();
  const password = accountPassword || inlinePassword;
  if (merchantCode && password) {
    return {
      username: String(account?.username || systemQrConfig?.username || account?.merchantCode || merchantCode).trim(),
      password,
    };
  }

  if (merchantCode) {
    const recoveredAuth = await recoverContractSystemQrAuth(merchantCode);
    if (recoveredAuth.password) return recoveredAuth;
  }

  throw new Error("CONTRACT_SYSTEMQR_PASSWORD_MISSING");
}

async function createContractSystemQrInvoiceWithFallback(params: {
  systemQrConfig: any;
  amount: number;
  referenceNumber: string;
  webhook: string;
}) {
  const invoiceParams = {
    merchantCode: params.systemQrConfig.merchantCode,
    amount: params.amount,
    referenceNumber: params.referenceNumber,
    webhook: params.webhook,
  };

  const auth = await resolveContractSystemQrAuth(params.systemQrConfig);
  try {
    return await createSystemQrInvoice(invoiceParams, auth.username, auth.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((!auth.username && !auth.password) || (!isSystemQrAuthError(message) && !/createInvoice failed \(002\)/i.test(message))) {
      throw error;
    }

    console.warn("contract SystemQR subMerchant auth failed; retrying with master token", message);
    return createSystemQrInvoice(invoiceParams);
  }
}

async function checkContractSystemQrPaymentWithFallback(params: {
  systemQrConfig: any;
  invoiceNumber: string;
}) {
  const checkParams = {
    merchantCode: params.systemQrConfig.merchantCode,
    invoiceNumber: params.invoiceNumber,
  };

  const auth = await resolveContractSystemQrAuth(params.systemQrConfig);
  try {
    return await checkSystemQrPayment(checkParams, auth.username, auth.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((!auth.username && !auth.password) || !isSystemQrAuthError(message)) throw error;

    console.warn("contract SystemQR check auth failed; retrying with master token", message);
    return checkSystemQrPayment(checkParams);
  }
}

function getContractUserId(req: any): string | undefined {
  return (req.user?.userId || req.user?.id || req.userId) as string | undefined;
}

async function isPrimeContractUser(userId?: string | null) {
  if (!userId) return false;
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isPrime: true,
      isActive: true,
      deletedAt: null,
      OR: [
        { membershipExpiresAt: null },
        { membershipExpiresAt: { gt: new Date() } },
      ],
    },
    select: { id: true },
  });
  return Boolean(user);
}

function getTemplateTitle(contract: { headerData: any; id: string }) {
  const hd = contract.headerData as any;
  return hd?.contractTitle || hd?.title || `Гэрээний загвар MGL-${contract.id.slice(0, 8).toUpperCase()}`;
}

function summarizeTemplate(contract: any) {
  const hd = contract.headerData as any;
  const feePlans: any[] = hd?.feePlans ?? [];
  const planEntry = feePlans.find((p: any) => p.key === contract.feePlan);
  const feePlanLabel = planEntry
    ? `${planEntry.label || planEntry.key || "Багц"}${planEntry.price ? ` — ${Number(planEntry.price).toLocaleString()}₮` : ""}`
    : contract.feePlan ?? "—";

  return {
    id: contract.id,
    title: getTemplateTitle(contract),
    description: hd?.subtitle || hd?.description || "Цахимаар бөглөж баталгаажуулах боломжтой гэрээ",
    org: "Гэрээний загвар",
    status: contract.status,
    createdBy: contract.user?.profile?.fullName || contract.user?.email || "Admin",
    date: contract.createdAt.toLocaleString("mn-MN"),
    createdAt: contract.createdAt,
    feePlan: contract.feePlan,
    feePlanLabel,
    isPaid: contract.isPaid,
    signedAt: contract.signedAt,
    pdfUrl: contract.pdfUrl,
    hasAdminSignature: !!contract.adminSignature,
    submissionCount: contract._count?.submissions ?? 0,
    signedCount: 0,
    headerData: contract.headerData,
    publicUrl: `/contract/sign/${contract.id}`,
  };
}

function summarizePublicTemplate(contract: any) {
  const summary = summarizeTemplate(contract);
  const hd = contract.headerData as any;
  return {
    ...summary,
    headerData: hd
      ? {
          contractTitle: hd.contractTitle,
          subtitle: hd.subtitle,
          description: hd.description,
          feePlans: hd.feePlans,
          defaultFeePlan: hd.defaultFeePlan,
          hasDuration: hd.hasDuration,
        }
      : null,
  };
}

function summarizeUserContract(contract: any) {
  const member = contract.memberData as any;
  const hd = (contract.headerData ?? contract.template?.headerData) as any;
  const feePlans: any[] = hd?.feePlans ?? [];
  const plan = feePlans.find((p: any) => p.key === contract.feePlan);
  const planMonths = Number(plan?.months || 0);
  const signedAt = contract.signedAt ? new Date(contract.signedAt) : null;
  const expiresAt = member?.expiresAt
    ? new Date(member.expiresAt)
    : signedAt && planMonths
      ? new Date(new Date(signedAt).setMonth(signedAt.getMonth() + planMonths))
      : null;

  return {
    id: contract.id,
    templateId: contract.templateId,
    title:
      member?.contractName ||
      hd?.contractTitle ||
      hd?.title ||
      "Гэрээ",
    org: member?.name || member?.org || "Миний байгууллага",
    register: member?.register || null,
    status: contract.status,
    isPaid: contract.isPaid,
    feePlan: contract.feePlan,
    feePlanLabel: plan?.label || contract.feePlan || "Багцгүй",
    signedAt: contract.signedAt,
    expiresAt,
    createdAt: contract.createdAt,
    pdfUrl: contract.pdfUrl,
    printUrl: `/contract/sign/${contract.id}?print=1`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/stats  —  Admin dashboard stats
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/stats", requireAuth, async (_req, res) => {
  try {
    const [templates, signed, pending] = await Promise.all([
      prisma.contract.count({ where: { isTemplate: true } }),
      prisma.contract.count({ where: { isTemplate: false, templateId: { not: null }, status: "SIGNED" } }),
      prisma.contract.count({ where: { isTemplate: false, templateId: { not: null }, status: "PENDING" } }),
    ]);
    return res.json({ success: true, total: templates, signed, pending });
  } catch {
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts  —  List templates with submission counts (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts", requireAuth, async (_req, res) => {
  try {
    const templates = await prisma.contract.findMany({
      where: { isTemplate: true },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    const result = templates.map(summarizeTemplate);

    return res.json({ success: true, contracts: result });
  } catch (error) {
    console.error("contracts list error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts  —  Create a template (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts", requireAuth, async (req, res) => {
  try {
    const userId = ((req as any).user?.userId || (req as any).user?.id || (req as any).userId) as string | undefined;
    const { feePlan, isPaid = false, adminSignature, adminName, adminTitle, adminStamp, headerData } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Хэрэглэгч тодорхойгүй байна" });
    }

    if (!adminSignature) {
      return res.status(400).json({ success: false, error: "Админы гарын үсэг шаардлагатай" });
    }

    const template = await prisma.contract.create({
      data: {
        userId,
        feePlan: feePlan || null,
        isPaid,
        isTemplate: true,
        status: "PENDING",
        version: "v1.2",
        adminSignature,
        adminName: adminName || null,
        adminTitle: adminTitle || null,
        adminStamp: adminStamp || null,
        headerData: headerData || null,
      },
    });

    return res.json({
      success: true,
      contract: {
        id: template.id,
        org: "Гэрээний загвар",
        status: template.status,
        createdBy: "Admin",
        date: template.createdAt.toLocaleString("mn-MN"),
        feePlan: template.feePlan,
        isPaid: template.isPaid,
        hasAdminSignature: true,
        submissionCount: 0,
      },
    });
  } catch (error: any) {
    console.error("contract create error", error);
    return res.status(500).json({ success: false, error: error?.message || "Гэрээ үүсгэхэд алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/contracts/:id  --  Update an existing template (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.put("/contracts/:id", requireAuth, async (req, res) => {
  try {
    const userId = getContractUserId(req);
    const { feePlan, isPaid = false, adminSignature, adminName, adminTitle, adminStamp, headerData } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Хэрэглэгч тодорхойгүй байна" });
    }

    if (!adminSignature) {
      return res.status(400).json({ success: false, error: "Админы гарын үсэг шаардлагатай" });
    }

    const existing = await prisma.contract.findUnique({
      where: { id: req.params.id },
      select: { id: true, isTemplate: true },
    });

    if (!existing || !existing.isTemplate) {
      return res.status(404).json({ success: false, error: "Гэрээний загвар олдсонгүй" });
    }

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        feePlan: feePlan || null,
        isPaid: Boolean(isPaid),
        adminSignature,
        adminName: adminName || null,
        adminTitle: adminTitle || null,
        adminStamp: adminStamp || null,
        headerData: headerData || null,
      },
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    await prisma.contractAuditLog.create({
      data: {
        contractId: updated.id,
        action: "CONTRACT_TEMPLATE_UPDATED",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        deviceInfo: { userId },
      },
    }).catch((error) => {
      console.warn("contract template update audit failed", error);
    });

    return res.json({ success: true, contract: summarizeTemplate(updated) });
  } catch (error: any) {
    console.error("contract update error", error);
    return res.status(500).json({ success: false, error: error?.message || "Гэрээ шинэчлэхэд алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/minu-dynamic-qr/register — Admin registers a per-contract
// Minu Dynamic QR sub-merchant and stores the returned merchantCode in template settings.
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/minu-dynamic-qr/register", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const merchantName = String(body.merchantName || "").trim();
    if (merchantName) {
      const existingSubMerchants = await listSystemQrSubMerchants().catch((error) => {
        console.error("contract minu dynamic qr subMerchant precheck error", error);
        return [];
      });
      const existing = existingSubMerchants.find((item) =>
        !isSystemQrMasterMerchantCode(item.merchantCode)
        && (
          item.merchantName.toLowerCase() === merchantName.toLowerCase()
          || item.merchantCode.toLowerCase() === merchantName.toLowerCase()
        )
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          alreadyRegistered: true,
          merchantCode: existing.merchantCode,
          merchantName: existing.merchantName,
          error: existingSubMerchantAccountUnverifiedError(
            existing,
            body.accountNumber,
          ),
        });
      }
    }

    const missing = requiredMinuBankFields.filter((field) => !String(body[field] || "").trim());
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Данс холбох талбар дутуу байна: ${missing.join(", ")}`,
      });
    }

    const requestedCityId = String(body.cityId || "20").trim();
    const requestedDistrictId = String(body.districtId || "1").trim();
    const registerNumber = String(body.registerNumber).trim();
    const looksLikePersonRegister = /^[А-Яа-яЁёӨөҮү]{2}\d{8}$/.test(registerNumber);
    const requestedCorporateFlag = String(body.corporateFlag || "").trim();
    const corporateFlag = looksLikePersonRegister ? "0" : requestedCorporateFlag || "1";
    const corporateName = corporateFlag === "1"
      ? String(body.corporateName || body.merchantName).trim()
      : null;
    const requestedSubCategoryId = String(body.subCategoryId || "36").trim();
    const subCategoryId = requestedSubCategoryId === "1000" ? "36" : requestedSubCategoryId;

    const result = await registerSystemQrSubMerchant(
      {
        merchantName,
        accountNumber: String(body.accountNumber).trim(),
        bankCode: String(body.bankCode).trim(),
        cityId: requestedCityId === "11000" ? "20" : requestedCityId,
        districtId: requestedDistrictId === "110400" ? "1" : requestedDistrictId,
        khorooId: String(body.khorooId || "15782385").trim(),
        building: String(body.building || "-").trim(),
        doorNo: String(body.doorNo || "-").trim(),
        phone: String(body.phone).trim(),
        email: body.email ? String(body.email).trim() : null,
        firstName: String(body.firstName || body.merchantName).trim(),
        lastName: String(body.lastName || "-").trim(),
        corporateFlag,
        corporateName,
        registerNumber,
        gender: String(body.gender || "M").trim(),
        subCategoryId,
      },
    );

    if (isSystemQrMasterMerchantCode(result.merchantCode)) {
      throw new Error(
        "Minu SystemQR registerSubMerchant returned the master username as merchantCode. SubMerchant code биш тул invoice үүсгэх боломжгүй.",
      );
    }

    return res.json({
      success: true,
      merchantCode: result.merchantCode,
      username: result.username,
      password: result.password || null,
      message: "Minu Dynamic QR данс амжилттай холбогдлоо",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("contract minu dynamic qr register error", errorMessage);
    if (/subMerchant register failed \(001\)/i.test(errorMessage)) {
      const merchantName = String((req.body || {}).merchantName || "").trim();
      if (merchantName) {
        const existing = await listSystemQrSubMerchants().then((rows) =>
          rows.find((item) =>
            !isSystemQrMasterMerchantCode(item.merchantCode)
            && (
              item.merchantName.toLowerCase() === merchantName.toLowerCase()
              || item.merchantCode.toLowerCase() === merchantName.toLowerCase()
            )
          ),
        ).catch(() => null);

        if (existing) {
          return res.status(409).json({
            success: false,
            alreadyRegistered: true,
            recoveredFromSystemError: true,
            merchantCode: existing.merchantCode,
            merchantName: existing.merchantName,
            error: existingSubMerchantAccountUnverifiedError(
              existing,
              (req.body || {}).accountNumber,
            ),
          });
        }
      }
    }
    const isMinuRegisterValidationError = /subMerchant register failed \(001\)/i.test(errorMessage);
    const status = isSystemQrAuthError(errorMessage)
      ? 400
      : isSystemQrNetworkError(errorMessage)
      ? 503
      : isMinuRegisterValidationError
      ? 422
      : 500;
    const friendlyError = isSystemQrAuthError(errorMessage)
      ? "Minu Dynamic QR данс шинээр холбох master login амжилтгүй байна. SYSTEMQR_USERNAME/SYSTEMQR_PASSWORD prod API env зөв эсэхийг шалгана уу. Merchant Code байгаа бол шууд дансны санд хадгалаад ашиглаж болно."
      : isSystemQrNetworkError(errorMessage)
      ? "Minu Dynamic QR данс шинээр холбох үед Minu API руу холбогдохгүй байна. API сервер api.minu.mn:443 рүү гарах эрхтэй эсэх, системийн VPN/proxy/whitelist-аа шалгана уу. Merchant Code байгаа бол шууд дансны санд хадгалаад ашиглаж болно."
      : isMinuRegisterValidationError
      ? `${errorMessage}. Энэ нь манай серверийн алдаа биш, Minu SystemQR бүртгэл дээрх validation/general system response байна. merchantName давхардсан бол Minu ихэвчлэн 0077 буцаадаг. Minu-аас bankCode/accountNumber/registerNumber/phone/corporateName талбарууд prod дээр таарч байгаа эсэхийг шалгуулна уу.`
      : errorMessage;
    return res.status(status).json({
      success: false,
      ...(isMinuRegisterValidationError ? { upstreamStatus: "001" } : {}),
      error: friendlyError || "Minu Dynamic QR данс холбох үед алдаа гарлаа",
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/available  —  Public catalog of templates users can choose
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/minu-dynamic-qr/sub-merchants", requireAuth, async (req, res) => {
  try {
    const query = String(req.query.query || "").trim().toLowerCase();
    const rows = (await listSystemQrSubMerchants()).filter((item) => !isSystemQrMasterMerchantCode(item.merchantCode));
    const subMerchants = query
      ? rows.filter((item) =>
          item.merchantName.toLowerCase().includes(query)
          || item.merchantCode.toLowerCase().includes(query)
        )
      : rows;

    return res.json({
      success: true,
      subMerchants: subMerchants.slice(0, 50),
      total: rows.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("contract minu dynamic qr subMerchant list error", errorMessage);

    if (isSystemQrAuthError(errorMessage) || isSystemQrNetworkError(errorMessage)) {
      const query = String(req.query.query || "").trim();
      const localRows = await getLocalContractSystemQrSubMerchants(query);
      return res.json({
        success: true,
        subMerchants: localRows.slice(0, 50),
        total: localRows.length,
        source: "local",
        fallback: true,
        message: "Minu шалгалт түр боломжгүй тул дансны сангаас харуулж байна.",
      });
    }

    return res.status(500).json({
      success: false,
      error: contractSystemQrPublicError(
        errorMessage,
        "Minu Dynamic QR бүртгэл шалгах боломжгүй байна. Merchant Code байгаа бол шууд дансны санд хадгалаад ашиглаж болно",
      ) || "Minu Dynamic QR бүртгэл шалгахад алдаа гарлаа",
    });
  }
});

router.get("/contracts/available", async (_req, res) => {
  try {
    const templates = await prisma.contract.findMany({
      where: { isTemplate: true },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    return res.json({ success: true, contracts: templates.map(summarizePublicTemplate) });
  } catch (error) {
    console.error("available contracts list error", error);
    return res.status(500).json({ success: false, error: "Гэрээний жагсаалт авахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/my  —  Contracts saved to the current user account
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/my", requireAuth, async (req, res) => {
  try {
    const userId = getContractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Нэвтрэх шаардлагатай" });
    }

    const contracts = await prisma.contract.findMany({
      where: {
        userId,
        isTemplate: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: { id: true, headerData: true },
        },
      },
    });

    return res.json({
      success: true,
      contracts: contracts.map(summarizeUserContract),
    });
  } catch (error) {
    console.error("my contracts error", error);
    return res.status(500).json({ success: false, error: "Гэрээнүүд ачаалахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/contracts/:id  —  Delete a template and its submissions (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.delete("/contracts/:id", requireAuth, async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) {
      return res.status(404).json({ success: false, error: "Гэрээ олдсонгүй" });
    }
    // Delete submissions first, then the template
    await prisma.contract.deleteMany({ where: { templateId: req.params.id } });
    await prisma.contract.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("contract delete error", error);
    return res.status(500).json({ success: false, error: "Гэрээ устгахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/:id  —  Get template or submission (public)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/:id", async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { submissions: true } } },
    });

    if (!contract) {
      return res.status(404).json({ success: false, error: "Гэрээ олдсонгүй" });
    }

    return res.json({
      success: true,
      contract: {
        id: contract.id,
        status: contract.status,
        feePlan: contract.feePlan,
        isPaid: contract.isPaid,
        isTemplate: contract.isTemplate,
        templateId: contract.templateId,
        adminSignature: contract.adminSignature,
        adminName: contract.adminName,
        adminTitle: contract.adminTitle,
        adminStamp: contract.adminStamp,
        memberData: contract.memberData,
        memberSignature: contract.memberSignature,
        headerData: sanitizeContractHeaderData(contract.headerData),
        signedAt: contract.signedAt,
        pdfUrl: contract.pdfUrl,
        submissionCount: contract._count.submissions,
      },
    });
  } catch (error) {
    console.error("contract get error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/submissions/all  —  List ALL submissions across templates (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/submissions/all", requireAuth, async (_req, res) => {
  try {
    const submissions = await prisma.contract.findMany({
      where: {
        isTemplate: false,
        status: "SIGNED",
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: { id: true, headerData: true, feePlan: true },
        },
      },
    });

    const result = submissions.map((s) => {
      const member = s.memberData as any;
      const hd = (s.headerData ?? (s.template as any)?.headerData) as any;
      const feePlans: any[] = hd?.feePlans ?? [];
      const planLabel = feePlans.find((p: any) => p.key === s.feePlan)?.label ?? s.feePlan ?? "—";
      const planMonths = feePlans.find((p: any) => p.key === s.feePlan)?.months ?? null;
      const expiresAt = member?.expiresAt
        ? new Date(member.expiresAt)
        : s.signedAt && planMonths
          ? new Date(new Date(s.signedAt).setMonth(new Date(s.signedAt).getMonth() + planMonths))
          : null;

      return {
        id: s.id,
        templateId: s.templateId,
        org: member?.name || "Тодорхойгүй",
        register: member?.register || null,
        phone: member?.phone || null,
        email: member?.email || null,
        status: s.status,
        isPaid: s.isPaid,
        feePlan: s.feePlan,
        feePlanLabel: planLabel,
        signedAt: s.signedAt,
        expiresAt,
        createdAt: s.createdAt,
        memberData: s.memberData,
        headerData: hd,
        pdfUrl: s.pdfUrl,
        contractNumber: member?.contractNumber || null,
        contractName: member?.contractName || hd?.contractTitle || hd?.title || null,
      };
    });

    return res.json({ success: true, submissions: result });
  } catch (error) {
    console.error("all submissions error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/:id/submissions  —  List all submissions for a template (admin)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/:id/submissions", requireAuth, async (req, res) => {
  try {
    const submissions = await prisma.contract.findMany({
      where: { templateId: req.params.id },
      orderBy: { createdAt: "desc" },
    });

    const result = submissions.map((s) => ({
      id: s.id,
      org: (s.memberData as any)?.name || "Тодорхойгүй",
      status: s.status,
      feePlan: s.feePlan,
      signedAt: s.signedAt,
      date: s.createdAt.toLocaleString("mn-MN"),
      memberData: s.memberData,
      memberSignature: s.memberSignature,
    }));

    return res.json({ success: true, submissions: result });
  } catch (error) {
    console.error("submissions list error", error);
    return res.status(500).json({ success: false, error: "Серверийн алдаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/:id/submit  —  Member submits a new contract from template
// Body: { memberData, memberSignature, feePlan }
// Returns: { submissionId, requiresPayment }
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/:id/submit", requireAuth, async (req, res) => {
  try {
    const userId = getContractUserId(req);
    const { memberData, memberSignature, feePlan } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Гэрээ хийхийн тулд нэвтэрнэ үү" });
    }

    const template = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!template || !template.isTemplate) {
      return res.status(400).json({ success: false, error: "Загвар олдсонгүй" });
    }

    const effectivePlan = feePlan || template.feePlan;
    const isPrimeUser = await isPrimeContractUser(userId);
    const requiresPayment = template.isPaid && !isPrimeUser;
    const submission = await prisma.contract.create({
      data: {
        userId,
        organizationId: (req as any).user?.organizationId || null,
        templateId: template.id,
        isTemplate: false,
        feePlan: effectivePlan,
        isPaid: requiresPayment,
        status: requiresPayment ? "PENDING" : "SIGNED",
        signedAt: requiresPayment ? null : new Date(),
        version: template.version,
        adminSignature: template.adminSignature,
        adminName: template.adminName,
        adminTitle: template.adminTitle,
        adminStamp: template.adminStamp,
        headerData: template.headerData || undefined,
        memberData: memberData || undefined,
        memberSignature: memberSignature || undefined,
      },
    });

    await prisma.contractAuditLog.create({
      data: {
        contractId: submission.id,
        action: "CONTRACT_SUBMITTED",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        deviceInfo: { templateId: template.id, userId },
      },
    });

    return res.json({ success: true, submissionId: submission.id, requiresPayment, primeAccess: isPrimeUser });
  } catch (error) {
    console.error("contract submit error", error);
    return res.status(500).json({ success: false, error: "Гэрээ хадгалахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/:id/sign  —  Legacy: update existing contract (backwards compat)
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/:id/sign", requireAuth, async (req, res) => {
  try {
    const userId = getContractUserId(req);
    const { memberData, memberSignature, feePlan } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Гэрээ хийхийн тулд нэвтэрнэ үү" });
    }

    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || contract.status === "SIGNED") {
      return res.status(400).json({ success: false, error: "Гэрээ олдсонгүй эсвэл аль хэдийн баталгаажсан" });
    }

    const isPrimeUser = await isPrimeContractUser(userId);
    const requiresPayment = contract.isPaid && !isPrimeUser;
    await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        userId,
        organizationId: (req as any).user?.organizationId || contract.organizationId || null,
        memberData: memberData || undefined,
        memberSignature: memberSignature || undefined,
        feePlan: feePlan || contract.feePlan,
        ...(!requiresPayment && { status: "SIGNED", signedAt: new Date(), isPaid: false }),
      },
    });

    await prisma.contractAuditLog.create({
      data: {
        contractId: contract.id,
        action: "CONTRACT_SIGNED_BY_USER",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
        deviceInfo: { userId },
      },
    });

    return res.json({ success: true, requiresPayment, primeAccess: isPrimeUser });
  } catch (error) {
    console.error("contract sign error", error);
    return res.status(500).json({ success: false, error: "Гэрээ хадгалахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/:id/qpay  —  Create QPay invoice (public)
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/:id/qpay", async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) {
      return res.status(404).json({ success: false, error: "Гэрээ олдсонгүй" });
    }

    let amount = 1800000;
    let descriptionText = "Төлбөр";
    const headerData = contract.headerData as any;
    if (headerData && Array.isArray(headerData.feePlans)) {
      const plan = headerData.feePlans.find((p: any) => p.key === contract.feePlan);
      if (plan) {
        if (plan.price) amount = Number(plan.price);
        if (plan.label) descriptionText = plan.label;
      }
    }

    const memberData = contract.memberData as any;
    const userName = memberData?.director || memberData?.name || "Тодорхойгүй";
    const userPhone = memberData?.phone ? ` - ${memberData.phone}` : "";
    const title = headerData?.contractTitle || "MGL Store гэрээний төлбөр";
    
    console.log(`[Contract QPay] Creating invoice for contract ${contract.id}:`, {
      amount,
      feePlan: contract.feePlan,
      hasHeaderData: !!headerData,
      hasMemberData: !!memberData,
    });

    const invoice = await createQPayInvoice({
      orderId: contract.id,
      orderNumber: `MGL-${contract.id.slice(0, 8).toUpperCase()}`,
      amount,
      description: `${title} - ${descriptionText} - ${userName}${userPhone}`,
      callbackConfig: { path: "/api/contracts/qpay/callback", query: { contractId: contract.id } },
    });

    if (!invoice.invoice_id) {
      console.error("[Contract QPay] Invalid invoice response - missing invoice_id:", invoice);
      return res.status(500).json({ success: false, error: "QPay invoice ID үүсгэгдсэнгүй" });
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: { qpayInvoiceId: invoice.invoice_id },
    });

    console.log(`[Contract QPay] Invoice created successfully:`, invoice.invoice_id);
    return res.json({
      success: true,
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls,
      amount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("contract qpay error:", errorMessage, error);
    return res.status(500).json({ success: false, error: `QPay алдаа: ${errorMessage}` });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/:id/qpay/check  —  Check payment status (public)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/:id/qpay/check", async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || !contract.qpayInvoiceId) {
      return res.status(404).json({ success: false, error: "Invoice олдсонгүй" });
    }

    const result = await checkQPayPayment(contract.qpayInvoiceId);
    const isPaid = result.count > 0;

    if (isPaid && contract.status !== "SIGNED") {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "SIGNED", signedAt: new Date() },
      });
    }

    return res.json({ success: true, isPaid, paidAmount: result.paid_amount });
  } catch (error) {
    console.error("contract qpay check error", error);
    return res.status(500).json({ success: false, error: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/qpay/callback  —  QPay webhook
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/qpay/callback", async (req, res) => {
  try {
    const { contractId } = req.query as { contractId: string };
    if (contractId) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: "SIGNED", signedAt: new Date() },
      });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/:id/systemqr  —  Create SystemQR invoice (public)
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/:id/systemqr", async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract) {
      return res.status(404).json({ success: false, error: "Гэрээ олдсонгүй" });
    }

    let amount = 1800000;
    const headerData = contract.headerData as any;
    if (headerData && Array.isArray(headerData.feePlans)) {
      const plan = headerData.feePlans.find((p: any) => p.key === contract.feePlan);
      if (plan && plan.price) {
        amount = Number(plan.price);
      }
    }

    const systemQrConfig = headerData?.systemQr;
    if (!systemQrConfig || !systemQrConfig.enabled || !systemQrConfig.merchantCode) {
      return res.status(400).json({ success: false, error: "Гэрээнд SystemQR тохируулагдаагүй байна" });
    }

    if (isSystemQrMasterMerchantCode(systemQrConfig.merchantCode)) {
      return res.status(400).json({
        success: false,
        error: "Гэрээний төлбөрийн дансны merchantCode нь SystemQR master username-тэй адил байна. Minu subMerchant code сонгоод template дээр дахин хадгална уу.",
      });
    }

    const referenceNumber = `MGL-${contract.id.slice(0, 8).toUpperCase()}`;
    const invoice = await createContractSystemQrInvoiceWithFallback({
      systemQrConfig,
      amount,
      referenceNumber,
      webhook: `${process.env.API_URL || "https://mglstore.mn/api"}/contracts/systemqr/callback?contractId=${contract.id}`,
    });

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        systemQrInvoiceId: invoice.invoiceId,
        paymentSystem: "SYSTEMQR",
      },
    });

    return res.json({
      success: true,
      invoiceId: invoice.invoiceId,
      qrText: invoice.qrText,
      qrImage: "", // SystemQR does not return a base64 image, frontend will generate
      urls: invoice.urls,
      amount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("contract systemqr error:", errorMessage, error);
    return res.status(500).json({
      success: false,
      error: contractSystemQrPublicError(
        errorMessage,
        "Төлбөрийн QR invoice үүсгэх боломжгүй байна",
      ),
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/:id/systemqr/check  —  Check SystemQR payment status (public)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/:id/systemqr/check", async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || !contract.systemQrInvoiceId) {
      return res.status(404).json({ success: false, error: "Invoice олдсонгүй" });
    }

    const systemQrConfig = (contract.headerData as any)?.systemQr;
    if (!systemQrConfig || !systemQrConfig.merchantCode) {
      return res.status(400).json({ success: false, error: "SystemQR тохиргоо олдсонгүй" });
    }
    const result = await checkContractSystemQrPaymentWithFallback({
      systemQrConfig,
      invoiceNumber: contract.systemQrInvoiceId,
    });

    if (result.paid && contract.status !== "SIGNED") {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "SIGNED", signedAt: new Date() },
      });
    }

    return res.json({ success: true, isPaid: result.paid, paidAmount: result.paid ? "төлөгдсөн" : 0 });
  } catch (error) {
    console.error("contract systemqr check error", error);
    return res.status(500).json({ success: false, error: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/systemqr/callback  —  SystemQR webhook
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/systemqr/callback", async (req, res) => {
  try {
    const { contractId } = req.query as { contractId: string };
    if (contractId) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: "SIGNED", signedAt: new Date() },
      });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/contracts/scanned/register  —  Register a scanned contract (admin)
// ──────────────────────────────────────────────────────────────────────────────
const scannedUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".pdf") || file.originalname.endsWith(".jpg") || file.originalname.endsWith(".png") || file.originalname.endsWith(".webp")) {
      cb(null, true);
    } else {
      cb(new Error("Зөвхөн PDF болон JPG, PNG, WebP зургууд зөвшөөрөгдөнө"));
    }
  },
});

router.post(
  "/contracts/scanned/register",
  requireAuth,
  scannedUpload.single("file"),
  async (req, res) => {
    try {
      const userId = ((req as any).user?.userId || (req as any).user?.id || (req as any).userId) as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Хэрэглэгч тодорхойгүй байна" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: "Сканнердсан гэрээний файл оруулах шаардлагатай" });
      }

      const {
        templateId,
        org,
        register,
        phone,
        email,
        director,
        position,
        feePlan,
        feePlanLabel,
        signedAt,
        expiresAt,
        contractNumber,
        contractName,
      } = req.body;

      if (!org) {
        return res.status(400).json({ success: false, error: "Байгууллагын нэр шаардлагатай" });
      }

      // Upload file to Supabase
      const ext = path.extname(req.file.originalname).toLowerCase() || ".pdf";
      const fileName = `contracts/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      
      const { error: uploadError } = await getSupabase().storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Scanned contract upload error:", uploadError);
        return res.status(500).json({ success: false, error: "Файл сервер рүү хуулахад алдаа гарлаа" });
      }

      const { data: publicUrlData } = getSupabase().storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData.publicUrl;

      // Prepare memberData JSON
      const memberData = {
        name: org,
        register: register || null,
        phone: phone || null,
        email: email || null,
        director: director || null,
        position: position || null,
        contractNumber: contractNumber || null,
        contractName: contractName || null,
        expiresAt: expiresAt || null,
      };

      // Let's see if we have duration
      let calculatedExpiresAt = expiresAt ? new Date(expiresAt) : null;
      let effectiveFeePlan = feePlan || null;
      let effectiveHeaderData = null;

      if (templateId) {
        const template = await prisma.contract.findUnique({ where: { id: templateId } });
        if (template) {
          effectiveHeaderData = template.headerData;
          if (!effectiveFeePlan) {
            effectiveFeePlan = template.feePlan;
          }
          if (!calculatedExpiresAt && effectiveFeePlan) {
            const hd = template.headerData as any;
            const feePlans: any[] = hd?.feePlans ?? [];
            const planMonths = feePlans.find((p: any) => p.key === effectiveFeePlan)?.months ?? null;
            if (planMonths) {
              const signDate = signedAt ? new Date(signedAt) : new Date();
              calculatedExpiresAt = new Date(signDate.setMonth(signDate.getMonth() + planMonths));
            }
          }
        }
      }

      const submission = await prisma.contract.create({
        data: {
          userId,
          templateId: templateId || null,
          isTemplate: false,
          feePlan: effectiveFeePlan,
          isPaid: false,
          status: "SIGNED",
          signedAt: signedAt ? new Date(signedAt) : new Date(),
          version: "v1.2-scanned",
          pdfUrl,
          memberData: memberData as any,
          headerData: effectiveHeaderData as any,
        },
        include: {
          template: {
            select: { id: true, headerData: true, feePlan: true },
          },
        },
      });

      const planLabel = feePlanLabel || (effectiveFeePlan ? (effectiveHeaderData as any)?.feePlans?.find((p: any) => p.key === effectiveFeePlan)?.label : null) || effectiveFeePlan || "—";

      return res.json({
        success: true,
        submission: {
          id: submission.id,
          templateId: submission.templateId,
          org: (submission.memberData as any)?.name || "Тодорхойгүй",
          register: (submission.memberData as any)?.register || null,
          phone: (submission.memberData as any)?.phone || null,
          email: (submission.memberData as any)?.email || null,
          status: submission.status,
          isPaid: submission.isPaid,
          feePlan: submission.feePlan,
          feePlanLabel: planLabel,
          signedAt: submission.signedAt,
          expiresAt: calculatedExpiresAt,
          createdAt: submission.createdAt,
          memberData: submission.memberData,
          headerData: submission.headerData,
          pdfUrl: submission.pdfUrl,
        },
      });
    } catch (err: any) {
      console.error("Scanned contract registration error:", err);
      return res.status(500).json({ success: false, error: err.message || "Гэрээ бүртгэхэд алдаа гарлаа" });
    }
  }
);

export default router;
