import { Router, type Router as ExpressRouter, type Request } from "express";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@mgl/database";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";

const router: ExpressRouter = Router();

/** Төлбөртэй гэрээний хураамж — ₮ */
const CONTRACT_FEE_PLANS: Record<string, number> = {
  "6m": 1_800_000,
  "12m": 3_000_000,
};
const CONTRACT_FEE_DEFAULT = 1_800_000;

function getRequestUserId(req: Request): string | undefined {
  const u = (req as any).user;
  return u?.userId ?? u?.id ?? (req as any).userId;
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

    const result = templates.map((c) => ({
      id: c.id,
      org: "Гэрээний загвар",
      status: c.status,
      createdBy: c.user?.profile?.fullName || c.user?.email || "Admin",
      date: c.createdAt.toLocaleString("mn-MN"),
      feePlan: c.feePlan,
      isPaid: c.isPaid,
      signedAt: c.signedAt,
      pdfUrl: c.pdfUrl,
      hasAdminSignature: !!c.adminSignature,
      submissionCount: c._count.submissions,
      signedCount: 0, // fetched separately in detail
    }));

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
    const userId = getRequestUserId(req);
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
// POST /api/contracts/:id/submit  —  Member submits a new contract from template (public)
// Body: { memberData, memberSignature, feePlan }
// Returns: { submissionId, requiresPayment }
// ──────────────────────────────────────────────────────────────────────────────
router.post("/contracts/:id/submit", async (req, res) => {
  try {
    const { memberData, memberSignature, feePlan } = req.body;

    const template = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!template || !template.isTemplate) {
      return res.status(400).json({ success: false, error: "Загвар олдсонгүй" });
    }

    const effectivePlan = feePlan || template.feePlan;
    const submission = await prisma.contract.create({
      data: {
        userId: template.userId,
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
        memberData: memberData || undefined,
        memberSignature: memberSignature || undefined,
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
router.post("/contracts/:id/sign", async (req, res) => {
  try {
    const { memberData, memberSignature, feePlan } = req.body;

    const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!contract || contract.status === "SIGNED") {
      return res.status(400).json({ success: false, error: "Гэрээ олдсонгүй эсвэл аль хэдийн баталгаажсан" });
    }

    await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        memberData: memberData || undefined,
        memberSignature: memberSignature || undefined,
        feePlan: feePlan || contract.feePlan,
        ...(!contract.isPaid && { status: "SIGNED", signedAt: new Date() }),
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

    const amount = CONTRACT_FEE_PLANS[contract.feePlan || ""] ?? CONTRACT_FEE_DEFAULT;

    const invoice = await createQPayInvoice({
      orderId: contract.id,
      orderNumber: `MGL-${contract.id.slice(0, 8).toUpperCase()}`,
      amount,
      description: `MGL Store гишүүнчлэлийн хураамж - ${contract.feePlan === "12m" ? "12 сар" : "6 сар"}`,
      callbackConfig: { path: "/api/contracts/qpay/callback", query: { contractId: contract.id } },
    });

    await prisma.contract.update({
      where: { id: contract.id },
      data: { qpayInvoiceId: invoice.invoice_id },
    });

    return res.json({
      success: true,
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text,
      qrImage: invoice.qr_image,
      urls: invoice.urls,
      amount,
    });
  } catch (error) {
    console.error("contract qpay error", error);
    return res.status(500).json({ success: false, error: "QPay invoice үүсгэхэд алдаа гарлаа" });
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

export default router;
