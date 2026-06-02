import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@mgl/database";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import {
  createSystemQrInvoice,
  checkSystemQrPayment,
  listSystemQrSubMerchants,
  resetSystemQrSubMerchantPassword,
  registerSystemQrSubMerchant,
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

async function resolveContractSystemQrAuth(systemQrConfig: any) {
  const merchantCode = String(systemQrConfig?.merchantCode || "").trim();
  const username = String(systemQrConfig?.username || "").trim();
  const password = String(systemQrConfig?.password || "").trim();

  if (!merchantCode) {
    return { username: undefined, password: undefined, updatedConfig: systemQrConfig };
  }

  if (password) {
    return {
      username: username || merchantCode,
      password,
      updatedConfig: systemQrConfig,
    };
  }

  const reset = await resetSystemQrSubMerchantPassword(merchantCode);
  return {
    username: reset.username || merchantCode,
    password: reset.password,
    updatedConfig: {
      ...systemQrConfig,
      username: reset.username || merchantCode,
      password: reset.password || "",
    },
  };
}

async function getExistingSystemQrCredentials(merchantCode: string) {
  try {
    const reset = await resetSystemQrSubMerchantPassword(merchantCode);
    return {
      username: reset.username || merchantCode,
      password: reset.password || null,
    };
  } catch (error) {
    console.warn("contract minu dynamic qr resetPassword precheck error", error);
    return {
      username: merchantCode,
      password: null,
    };
  }
}

function getContractUserId(req: any): string | undefined {
  return (req.user?.userId || req.user?.id || req.userId) as string | undefined;
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
        item.merchantName.toLowerCase() === merchantName.toLowerCase()
        || item.merchantCode.toLowerCase() === merchantName.toLowerCase()
      );

      if (existing) {
        const credentials = await getExistingSystemQrCredentials(existing.merchantCode);
        return res.json({
          success: true,
          alreadyRegistered: true,
          merchantCode: existing.merchantCode,
          username: credentials.username,
          password: credentials.password,
          merchantName: existing.merchantName,
          message: `Minu дээр "${existing.merchantName}" нэртэй subMerchant бүртгэлтэй байна. Merchant Code-г ашиглалаа.`,
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

    let result = await registerSystemQrSubMerchant(
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

    if (!result.password) {
      const credentials = await getExistingSystemQrCredentials(result.merchantCode);
      result = {
        ...result,
        username: credentials.username,
        password: credentials.password || undefined,
      };
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
            item.merchantName.toLowerCase() === merchantName.toLowerCase()
            || item.merchantCode.toLowerCase() === merchantName.toLowerCase()
          ),
        ).catch(() => null);

        if (existing) {
          const credentials = await getExistingSystemQrCredentials(existing.merchantCode);
          return res.json({
            success: true,
            alreadyRegistered: true,
            recoveredFromSystemError: true,
            merchantCode: existing.merchantCode,
            username: credentials.username,
            password: credentials.password,
            merchantName: existing.merchantName,
            message: `Minu 001 буцаасан боловч "${existing.merchantName}" subMerchant үүссэн байна. Merchant Code-г ашиглалаа.`,
          });
        }
      }
    }
    const status = /username or password|login|credential|unauthorized|401|403/i.test(errorMessage) ? 400 : 500;
    const friendlyError = /subMerchant register failed \(001\)/i.test(errorMessage)
      ? `${errorMessage}. Minu дээр merchantName давхардсан бол 0077 гэж буцдаг. 001 нь ихэвчлэн Minu талын данс/регистр/утас verification эсвэл test/prod орчны алдаа байна.`
      : errorMessage;
    return res.status(status).json({ success: false, error: friendlyError || "Minu Dynamic QR данс холбох үед алдаа гарлаа" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/contracts/available  —  Public catalog of templates users can choose
// ──────────────────────────────────────────────────────────────────────────────
router.get("/contracts/minu-dynamic-qr/sub-merchants", requireAuth, async (req, res) => {
  try {
    const query = String(req.query.query || "").trim().toLowerCase();
    const rows = await listSystemQrSubMerchants();
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
    return res.status(500).json({
      success: false,
      error: errorMessage || "Minu Dynamic QR бүртгэл шалгахад алдаа гарлаа",
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
        headerData: contract.headerData,
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
        contractName: member?.contractName || null,
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
    const submission = await prisma.contract.create({
      data: {
        userId,
        organizationId: (req as any).user?.organizationId || null,
        templateId: template.id,
        isTemplate: false,
        feePlan: effectivePlan,
        isPaid: template.isPaid,
        status: template.isPaid ? "PENDING" : "SIGNED",
        signedAt: template.isPaid ? null : new Date(),
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

    return res.json({ success: true, submissionId: submission.id, requiresPayment: template.isPaid });
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

    await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        userId,
        organizationId: (req as any).user?.organizationId || contract.organizationId || null,
        memberData: memberData || undefined,
        memberSignature: memberSignature || undefined,
        feePlan: feePlan || contract.feePlan,
        ...(!contract.isPaid && { status: "SIGNED", signedAt: new Date() }),
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

    return res.json({ success: true, requiresPayment: contract.isPaid });
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

    const referenceNumber = `MGL-${contract.id.slice(0, 8).toUpperCase()}`;

    let auth = { username: systemQrConfig.username, password: systemQrConfig.password, updatedConfig: systemQrConfig };
    if (!String(systemQrConfig.password || "").trim()) {
      try {
        auth = await resolveContractSystemQrAuth(systemQrConfig);
      } catch (authError) {
        console.warn("[Contract SystemQR] resetPassword failed; trying configured/master auth", authError);
      }
    }

    const invoice = await createSystemQrInvoice(
      {
        merchantCode: systemQrConfig.merchantCode,
        amount,
        referenceNumber,
        webhook: `${process.env.API_URL || "https://mglstore.mn/api"}/contracts/systemqr/callback?contractId=${contract.id}`,
      },
      auth.username,
      auth.password
    );

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        systemQrInvoiceId: invoice.invoiceId,
        paymentSystem: "SYSTEMQR",
        ...(auth.updatedConfig !== systemQrConfig
          ? { headerData: { ...headerData, systemQr: auth.updatedConfig } }
          : {}),
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
    return res.status(500).json({ success: false, error: `SystemQR алдаа: ${errorMessage}` });
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

    let auth = { username: systemQrConfig.username, password: systemQrConfig.password, updatedConfig: systemQrConfig };
    if (!String(systemQrConfig.password || "").trim()) {
      try {
        auth = await resolveContractSystemQrAuth(systemQrConfig);
      } catch (authError) {
        console.warn("[Contract SystemQR] resetPassword failed during check; trying configured/master auth", authError);
      }
    }

    const result = await checkSystemQrPayment(
      {
        merchantCode: systemQrConfig.merchantCode,
        invoiceNumber: contract.systemQrInvoiceId,
      },
      auth.username,
      auth.password
    );

    if (auth.updatedConfig !== systemQrConfig) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { headerData: { ...(contract.headerData as any), systemQr: auth.updatedConfig } },
      });
    }

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
