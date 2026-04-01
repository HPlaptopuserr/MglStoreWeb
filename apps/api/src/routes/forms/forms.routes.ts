import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import crypto from "crypto";

const router: ExpressRouter = Router();

// ── Helper: generate short slug ──
function generateSlug(): string {
  return crypto.randomBytes(6).toString("base64url");
}

// ── Admin: create form ──
router.post("/admin/forms", async (req, res) => {
  try {
    const { title, description, fields, createdById } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Маягтын нэр шаардлагатай" });
    }

    const slug = generateSlug();

    const form = await prisma.form.create({
      data: {
        slug,
        title: title.trim(),
        description: description?.trim() || null,
        fields: fields || [],
        createdById: createdById || null,
      },
    });

    res.status(201).json(form);
  } catch (error) {
    console.error("create form error", error);
    res.status(500).json({ message: "Маягт үүсгэхэд алдаа гарлаа" });
  }
});

// ── Admin: list all forms ──
router.get("/admin/forms", async (_req, res) => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { responses: true } },
      },
    });
    res.json(forms);
  } catch (error) {
    console.error("list forms error", error);
    res.status(500).json({ message: "Маягтуудыг авахад алдаа гарлаа" });
  }
});

// ── Admin: get single form with responses ──
router.get("/admin/forms/:id", async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
      include: {
        responses: { orderBy: { submittedAt: "desc" } },
        _count: { select: { responses: true } },
      },
    });

    if (!form) {
      return res.status(404).json({ message: "Маягт олдсонгүй" });
    }

    res.json(form);
  } catch (error) {
    console.error("get form error", error);
    res.status(500).json({ message: "Маягт авахад алдаа гарлаа" });
  }
});

// ── Admin: update form ──
router.put("/admin/forms/:id", async (req, res) => {
  try {
    const { title, description, fields, isActive } = req.body;

    const form = await prisma.form.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(fields !== undefined && { fields }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(form);
  } catch (error) {
    console.error("update form error", error);
    res.status(500).json({ message: "Маягт шинэчлэхэд алдаа гарлаа" });
  }
});

// ── Admin: delete form ──
router.delete("/admin/forms/:id", async (req, res) => {
  try {
    await prisma.form.delete({ where: { id: req.params.id } });
    res.json({ message: "Маягт устгагдлаа" });
  } catch (error) {
    console.error("delete form error", error);
    res.status(500).json({ message: "Маягт устгахад алдаа гарлаа" });
  }
});

// ── Admin: delete a single response ──
router.delete("/admin/form-responses/:id", async (req, res) => {
  try {
    await prisma.formResponse.delete({ where: { id: req.params.id } });
    res.json({ message: "Хариулт устгагдлаа" });
  } catch (error) {
    console.error("delete response error", error);
    res.status(500).json({ message: "Хариулт устгахад алдаа гарлаа" });
  }
});

// ── Public: get form by slug (for filling) ──
router.get("/forms/:slug", async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        fields: true,
        isActive: true,
      },
    });

    if (!form || !form.isActive) {
      return res.status(404).json({ message: "Маягт олдсонгүй" });
    }

    res.json(form);
  } catch (error) {
    console.error("get public form error", error);
    res.status(500).json({ message: "Маягт авахад алдаа гарлаа" });
  }
});

// ── Public: submit response ──
router.post("/forms/:slug/responses", async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, isActive: true },
    });

    if (!form || !form.isActive) {
      return res.status(404).json({ message: "Маягт олдсонгүй" });
    }

    const { data } = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Хариултын өгөгдөл шаардлагатай" });
    }

    const response = await prisma.formResponse.create({
      data: {
        formId: form.id,
        data,
      },
    });

    res.status(201).json(response);
  } catch (error) {
    console.error("submit form response error", error);
    res.status(500).json({ message: "Хариулт илгээхэд алдаа гарлаа" });
  }
});

export default router;
