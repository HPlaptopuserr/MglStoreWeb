import {
  getClubWebsiteAccess,
  requirePaidClubWebsite,
  ClubWebsiteAccessError,
} from "../../services/mgl-club-website-access";
import { requireClubAdmin } from "./mgl-club-access";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { rateLimit } from "express-rate-limit";
import { prisma, type Prisma } from "@mgl/database";
import {
  defaultClubWebsite,
  isClubSiteSlug,
  parseClubWebsite,
  parseMglClubProfile,
  type ClubWebsite,
} from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { createClubWebsiteMediaRouter } from "./mgl-club-website-media.routes";
const base = "/forms/mgl-club/my-companies/:id/website";
export function clubWebsiteData(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
export async function editableClubWebsiteCompany(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await prisma.formResponse.findFirst({
    where: { id, form: { slug: "mgl-club", isActive: true } },
  });
  return row;
}
export class ClubWebsiteError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function state(data: Prisma.JsonObject, fallback: ClubWebsite) {
  return {
    siteSlug: isClubSiteSlug(data.clubSiteSlug) ? data.clubSiteSlug : null,
    draft:
      parseClubWebsite(data.websiteDraft) ||
      parseClubWebsite(data.websitePublished) ||
      fallback,
    published: parseClubWebsite(data.websitePublished),
    version: typeof data.websiteVersion === "number" ? data.websiteVersion : 0,
  };
}
export function createClubWebsiteRouter(): ExpressRouter {
  const router = Router();
  router.use(createClubWebsiteMediaRouter());
  const limit = rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  router.use(base, requireAuth, requireClubAdmin, (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.get(
    "/forms/mgl-club/my-companies/:id/website-access",
    requireAuth,
    requireClubAdmin,
    async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        const row = await editableClubWebsiteCompany(String(req.params.id));
        if (!row || !parseMglClubProfile(row.data))
          return res.status(404).json({ message: "Байгууллага олдсонгүй." });
        return res.json(await getClubWebsiteAccess(row.id));
      } catch {
        return res
          .status(503)
          .json({
            message:
              "Алтан гишүүнчлэлийн эрхийг шалгаж чадсангүй. Дахин оролдоно уу.",
          });
      }
    },
  );
  router.get(base, async (req, res) => {
    try {
      const row = await editableClubWebsiteCompany(String(req.params.id));
      const profile = row && parseMglClubProfile(row.data);
      if (!row || !profile) return res.sendStatus(403);
      const access = await getClubWebsiteAccess(row.id);
      return res.json({
        access,
        ...state(
          clubWebsiteData(row.data),
          defaultClubWebsite({ ...profile, id: row.id }),
        ),
      });
    } catch {
      return res
        .status(503)
        .json({ message: "Танилцуулгыг ачаалж чадсангүй." });
    }
  });
  async function write(req: Request, res: Response, publish: boolean) {
    const id = String(req.params.id),
      version: unknown = req.body?.version;
    const site = publish ? null : parseClubWebsite(req.body?.site);
    if (
      !/^[0-9a-f-]{36}$/i.test(id) ||
      typeof version !== "number" ||
      !Number.isSafeInteger(version) ||
      version < 0 ||
      (!publish && !site)
    )
      return res.status(400).json({
        message:
          "Хэсгүүдийн гарчиг, зураг, бичвэр болон дарааллыг шалгана уу.",
      });
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "FormResponse" WHERE "id" = ${id} FOR UPDATE`;
        const row = await tx.formResponse.findFirst({
          where: { id, form: { slug: "mgl-club", isActive: true } },
        });
        if (!row) throw new ClubWebsiteError(403, "Байгууллага олдсонгүй.");
        await requirePaidClubWebsite(id, tx);
        const data = clubWebsiteData(row.data),
          current =
            typeof data.websiteVersion === "number" ? data.websiteVersion : 0;
        if (current !== version)
          throw new ClubWebsiteError(
            409,
            "Танилцуулгыг өөр цонхноос шинэчилсэн байна. Дахин ачаалаад өөрчлөлтөө нэгтгэнэ үү.",
          );
        const draft = publish ? parseClubWebsite(data.websiteDraft) : site;
        if (!draft)
          throw new ClubWebsiteError(
            400,
            "Эхлээд танилцуулгаа ноорог болгон хадгална уу.",
          );
        const updated = {
          ...data,
          websiteVersion: current + 1,
          ...(publish
            ? {
                websitePublished: draft,
                websitePublishedAt: new Date().toISOString(),
              }
            : { websiteDraft: draft }),
        } as unknown as Prisma.InputJsonObject;
        await tx.formResponse.update({
          where: { id },
          data: { data: updated },
        });
        return {
          draft,
          published: publish ? draft : parseClubWebsite(data.websitePublished),
          version: current + 1,
        };
      });
      return res.json(result);
    } catch (error: unknown) {
      if (error instanceof ClubWebsiteAccessError)
        return res
          .status(403)
          .json({ message: error.message, access: error.access });
      if (error instanceof ClubWebsiteError)
        return res.status(error.status).json({ message: error.message });
      return res
        .status(503)
        .json({ message: "Танилцуулга хадгалж чадсангүй. Дахин оролдоно уу." });
    }
  }
  router.put(base, limit, (req, res) => write(req, res, false));
  router.post(`${base}/publish`, limit, (req, res) => write(req, res, true));
  return router;
}
