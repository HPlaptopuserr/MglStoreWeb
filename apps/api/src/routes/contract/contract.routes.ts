import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "@mgl/database";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import { createSystemQrInvoice, checkSystemQrPayment } from "../../services/systemqr";

const router: ExpressRouter = Router();

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

    const result = templates.map((c) => {
      const hd = c.headerData as any;
      const feePlans: any[] = hd?.feePlans ?? [];
      const planEntry = feePlans.find((p: any) => p.key === c.feePlan);
      const feePlanLabel = planEntry
        ? `${planEntry.label} — ${Number(planEntry.price).toLocaleString()}₮`
        : c.feePlan ?? "—";

      return {
        id: c.id,
        org: "Гэрээний загвар",
        status: c.status,
        createdBy: c.user?.profile?.fullName || c.user?.email || "Admin",
        date: c.createdAt.toLocaleString("mn-MN"),
        feePlan: c.feePlan,
        feePlanLabel,
        isPaid: c.isPaid,
        signedAt: c.signedAt,
        pdfUrl: c.pdfUrl,
        hasAdminSignature: !!c.adminSignature,
        submissionCount: c._count.submissions,
        signedCount: 0,
      };
    });

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
      where: { isTemplate: false, templateId: { not: null } },
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
      const expiresAt = s.signedAt && planMonths
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
        headerData: template.headerData || undefined,
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

    const invoice = await createSystemQrInvoice(
      {
        merchantCode: systemQrConfig.merchantCode,
        amount,
        referenceNumber,
        webhook: `${process.env.API_URL || "https://mglstore.mn/api"}/contracts/systemqr/callback?contractId=${contract.id}`,
      },
      systemQrConfig.username,
      systemQrConfig.password
    );

    await prisma.contract.update({
      where: { id: contract.id },
      data: { systemQrInvoiceId: invoice.invoiceId, paymentSystem: "SYSTEMQR" },
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

    const result = await checkSystemQrPayment(
      {
        merchantCode: systemQrConfig.merchantCode,
        invoiceNumber: contract.systemQrInvoiceId,
      },
      systemQrConfig.username,
      systemQrConfig.password
    );

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

export default router;
