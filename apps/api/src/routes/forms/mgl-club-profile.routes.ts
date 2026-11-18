import { Router, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma, type Prisma } from "@mgl/database";
import {
  CLUB_BUSINESS_SITE_ORIGIN,
  innovaCompany,
  innovaWebsite,
  mglClubFormFields,
  parseMglClubProfile,
  type MglClubProfile,
} from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { requireClubAdmin } from "./mgl-club-access";

const base = "/forms/mgl-club/my-companies";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
function version(data: Prisma.JsonObject): number {
  const value = data.profileVersion;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}
function member(id: string, profile: MglClubProfile) {
  const { consent: _consent, ...publicProfile } = profile;
  return { id, ...publicProfile };
}
class ProfileError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createClubProfileRouter(): ExpressRouter {
  const router = Router();
  router.use(base, requireAuth, requireClubAdmin, (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 40,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  router.get(`${base}/:id/profile`, async (req, res) => {
    const id = String(req.params.id);
    if (!uuid.test(id))
      return res
        .status(400)
        .json({ message: "Байгууллагын дугаар буруу байна." });
    try {
      const row = await prisma.formResponse.findFirst({
        where: { id, form: { slug: "mgl-club", isActive: true } },
      });
      const profile = row && parseMglClubProfile(row.data);
      if (!row || !profile)
        return res.status(404).json({ message: "Байгууллага олдсонгүй." });
      return res.json({
        member: member(id, profile),
        version: version(object(row.data)),
      });
    } catch {
      return res.status(503).json({
        message: "Байгууллагын мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
      });
    }
  });

  router.patch(`${base}/:id/profile`, limit, async (req, res) => {
    const id = String(req.params.id);
    const profile = parseMglClubProfile(req.body?.data);
    const revision: unknown = req.body?.version;
    if (
      !uuid.test(id) ||
      !profile ||
      typeof revision !== "number" ||
      !Number.isSafeInteger(revision) ||
      revision < 0
    ) {
      return res.status(400).json({
        message:
          "Байгууллагын нэр, утас, салбар, байршил болон мэдээллээ шалгана уу.",
      });
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "FormResponse" WHERE "id" = ${id} FOR UPDATE`;
        const row = await tx.formResponse.findFirst({
          where: { id, form: { slug: "mgl-club", isActive: true } },
        });
        if (!row || !parseMglClubProfile(row.data))
          throw new ProfileError(404, "Байгууллага олдсонгүй.");
        const raw = object(row.data);
        const current = version(raw);
        if (revision !== current)
          throw new ProfileError(
            409,
            "Мэдээллийг өөр цонхноос шинэчилсэн байна. Энэ цонхны засварыг хуулж аваад, сүүлийн хувилбарыг дахин ачаална уу.",
          );
        const updated = {
          ...raw,
          ...profile,
          logoUrl: profile.logoUrl || "",
          profileVersion: current + 1,
          profileUpdatedAt: new Date().toISOString(),
        } as Prisma.InputJsonObject;
        await tx.formResponse.update({
          where: { id },
          data: { data: updated },
        });
        return { member: member(id, profile), version: current + 1 };
      });
      return res.json(result);
    } catch (error: unknown) {
      if (error instanceof ProfileError)
        return res.status(error.status).json({ message: error.message });
      return res.status(503).json({
        message:
          "Байгууллагын мэдээллийг хадгалж чадсангүй. Дахин оролдоно уу.",
      });
    }
  });

  router.post(`${base}/import-innova`, limit, async (_req, res) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"mgl-club-site:innovallc"}))`;
        const form = await tx.form.upsert({
          where: { slug: "mgl-club" },
          update: {},
          create: {
            slug: "mgl-club",
            title: "MGL CLUB • Бизнес эрхлэгчдийн бүртгэл",
            fields: mglClubFormFields,
          },
        });
        if (!form.isActive)
          throw new ProfileError(409, "Байгууллагын бүртгэл хаалттай байна.");
        const existing = await tx.formResponse.findFirst({
          where: {
            formId: form.id,
            data: { path: ["clubSiteSlug"], equals: "innovallc" },
          },
        });
        if (existing) {
          const profile = parseMglClubProfile(existing.data);
          if (!profile)
            throw new ProfileError(
              409,
              "Инновагийн URL бүртгэлтэй боловч үндсэн мэдээлэл дутуу байна.",
            );
          return {
            member: member(existing.id, profile),
            version: version(object(existing.data)),
            siteSlug: "innovallc",
            imported: false,
          };
        }
        const profile = parseMglClubProfile({
          ...innovaCompany,
          consent: "yes",
          logoUrl: `${CLUB_BUSINESS_SITE_ORIGIN}${innovaCompany.logoUrl}`,
        });
        if (!profile)
          throw new ProfileError(
            503,
            "Инновагийн эх мэдээллийг бэлтгэж чадсангүй.",
          );
        const data = {
          ...profile,
          profileVersion: 0,
          clubSiteSlug: "innovallc",
          clubFeaturedGold: true,
          websiteDraft: innovaWebsite,
          websitePublished: innovaWebsite,
          websitePublishedAt: new Date().toISOString(),
          websiteVersion: 0,
        } as unknown as Prisma.InputJsonObject;
        const row = await tx.formResponse.create({
          data: { formId: form.id, data },
        });
        return {
          member: member(row.id, profile),
          version: 0,
          siteSlug: "innovallc",
          imported: true,
        };
      });
      return res.json(result);
    } catch (error: unknown) {
      if (error instanceof ProfileError)
        return res.status(error.status).json({ message: error.message });
      return res.status(503).json({
        message:
          "Инновагийн мэдээллийг удирдлагад оруулж чадсангүй. Дахин оролдоно уу.",
      });
    }
  });
  return router;
}
