import { Router, type Router as ExpressRouter, type Request } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import crypto from "crypto";
import { requireAuth, requirePlatformPermission, optionalAuth, type AuthPayload } from "../../middleware/auth";

import { rateLimit } from "express-rate-limit";
import { communityFields, parseCommunityResponse, toPublicCommunityMember } from "./community-2003";

import { createCommunityPhotoRouter } from "./community-2003-photo.routes";
import { createCommunityEditRouter } from "./community-2003-edit.routes";
import mglClubRouter from "./mgl-club.routes";

const router: ExpressRouter = Router();
router.use(mglClubRouter);
router.use(createCommunityEditRouter());
router.use(createCommunityPhotoRouter());

router.post("/forms/2003/responses", optionalAuth, rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }), async (req, res) => {
  const data = parseCommunityResponse(req.body?.data);
  if (!data) return res.status(400).json({ message: "Мэдээллээ шалгаад дахин илгээнэ үү." });
  try {
    const form = await prisma.form.upsert({
      where: { slug: "2003" },
      update: {},
      create: { slug: "2003", title: "2003 • Танилцах бүртгэл", fields: communityFields },
    });
    if (!form.isActive) return res.status(410).json({ message: "Бүртгэл хаагдсан байна." });
    const actor = (req as Request & { user?: AuthPayload }).user;
    await prisma.formResponse.create({ data: { formId: form.id, data: { ...data, ...(actor ? { ownerUserId: actor.userId } : {}) } } });
    return res.status(201).json({ success: true });
  } catch {
    return res.status(500).json({ message: "Мэдээлэл хадгалахад алдаа гарлаа. Дахин оролдоно уу." });
  }
});

router.get("/forms/2003/members", async (_req, res) => {
  try {
    const responses = await prisma.formResponse.findMany({
      where: {
        form: { slug: "2003", isActive: true },
        data: { path: ["publishConsent"], equals: "yes" },
      },
      select: { id: true, data: true },
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
    });
    const members = responses.flatMap((response) => {
      const member = toPublicCommunityMember(response.id, response.data);
      return member ? [member] : [];
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ members, requests: [] });
  } catch {
    return res
      .status(500)
      .json({ message: "Танилцуулгуудыг авахад алдаа гарлаа." });
  }
});

// ── Helper: generate short slug ──
function generateSlug(): string {
  return crypto.randomBytes(6).toString("base64url");
}

// ── Admin: create form ──
router.post("/admin/forms", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (req, res) => {
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
router.get("/admin/forms", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (_req, res) => {
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
router.get("/admin/forms/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (req, res) => {
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
router.put("/admin/forms/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (req, res) => {
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
router.delete("/admin/forms/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (req, res) => {
  try {
    await prisma.form.delete({ where: { id: req.params.id } });
    res.json({ message: "Маягт устгагдлаа" });
  } catch (error) {
    console.error("delete form error", error);
    res.status(500).json({ message: "Маягт устгахад алдаа гарлаа" });
  }
});

// ── Admin: delete a single response ──
router.delete("/admin/form-responses/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_FORMS), async (req, res) => {
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
