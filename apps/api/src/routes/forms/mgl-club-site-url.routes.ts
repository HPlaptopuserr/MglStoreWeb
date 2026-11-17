import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import {
  isClubSiteSlug,
  normalizeClubSiteSlug,
  parseClubWebsite,
  parseMglClubProfile,
} from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { requireClubAdmin } from "./mgl-club-access";
function object(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
class UrlError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function createClubSiteUrlRouter(): ExpressRouter {
  const router = Router();
  router.get("/forms/mgl-club/sites/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (!isClubSiteSlug(slug)) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    try {
      const row = await prisma.formResponse.findFirst({
        where: {
          form: { slug: "mgl-club", isActive: true },
          data: { path: ["clubSiteSlug"], equals: slug },
        },
      });
      const profile = row && parseMglClubProfile(row.data);
      if (!row || !profile) return res.sendStatus(404);
      const { consent: _consent, ...member } = profile;
      return res.json({
        member: { id: row.id, ...member },
        website: parseClubWebsite(object(row.data).websitePublished),
        siteSlug: slug,
      });
    } catch {
      return res
        .status(503)
        .json({ message: "Танилцуулгын холбоосыг ачаалж чадсангүй." });
    }
  });
  router.put(
    "/forms/mgl-club/my-companies/:id/site-url",
    requireAuth,
    requireClubAdmin,
    async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      const id = String(req.params.id),
        slug = normalizeClubSiteSlug(req.body?.slug);
      if (!/^[0-9a-f-]{36}$/i.test(id) || !slug)
        return res.status(400).json({
          message:
            "3–63 тэмдэгттэй латин жижиг үсэг, тоо, дунд зураас ашиглана уу. Системийн хуудасны нэр ашиглах боломжгүй.",
        });
      try {
        await prisma.$transaction(async (tx) => {
          // Serialize reservations of the same name, including simultaneous requests for different companies.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`mgl-club-site:${slug}`}))`;
          await tx.$queryRaw`SELECT "id" FROM "FormResponse" WHERE "id" = ${id} FOR UPDATE`;
          const row = await tx.formResponse.findFirst({
            where: { id, form: { slug: "mgl-club", isActive: true } },
          });
          if (!row || !parseMglClubProfile(row.data))
            throw new UrlError(404, "Байгууллага олдсонгүй.");
          const duplicate = await tx.formResponse.findFirst({
            where: {
              id: { not: id },
              form: { slug: "mgl-club" },
              data: { path: ["clubSiteSlug"], equals: slug },
            },
          });
          if (duplicate)
            throw new UrlError(
              409,
              "Энэ URL-ийн нэрийг өөр байгууллага ашиглаж байна.",
            );
          await tx.formResponse.update({
            where: { id },
            data: {
              data: {
                ...object(row.data),
                clubSiteSlug: slug,
              } as Prisma.InputJsonObject,
            },
          });
        });
        return res.json({ siteSlug: slug });
      } catch (error: unknown) {
        if (error instanceof UrlError)
          return res.status(error.status).json({ message: error.message });
        return res
          .status(503)
          .json({ message: "URL хадгалж чадсангүй. Дахин оролдоно уу." });
      }
    },
  );
  return router;
}
