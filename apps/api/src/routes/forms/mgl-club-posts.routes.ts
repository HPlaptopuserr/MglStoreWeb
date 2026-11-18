import {
  clubCompanyOwnershipWhere,
  requireClubCompanyAccess,
} from "./mgl-club-access";
import { Router, type Request, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma, type Prisma } from "@mgl/database";
import {
  isClubSiteSlug,
  parseMglClubPost,
  parseMglClubProfile,
} from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { clubGoldTokenMatches } from "../../services/mgl-club-gold";

const postSlug = "mgl-club-posts";
const base = "/forms/mgl-club";
const uuid = /^[0-9a-f-]{36}$/i;
function actor(req: Request) {
  return (req as Request & { user: AuthPayload }).user.userId;
}
function jsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
function publicPost(row: {
  id: string;
  data: Prisma.JsonValue;
  submittedAt: Date;
}) {
  const data = jsonObject(row.data),
    post = parseMglClubPost(data);
  if (!post || typeof data.companyId !== "string") return null;
  return {
    id: row.id,
    companyId: data.companyId,
    ...post,
    createdAt: row.submittedAt.toISOString(),
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : row.submittedAt.toISOString(),
  };
}
async function company(id: string) {
  return uuid.test(id)
    ? prisma.formResponse.findFirst({
        where: { id, form: { slug: "mgl-club", isActive: true } },
      })
    : null;
}
async function editableCompany(id: string) {
  const row = await company(id);
  return row;
}
async function posts(companyId: string, cursor: string, drafts: boolean) {
  const rows = await prisma.formResponse.findMany({
    where: {
      form: { slug: postSlug, isActive: true },
      AND: [
        { data: { path: ["companyId"], equals: companyId } },
        ...(drafts ? [] : [{ data: { path: ["published"], equals: true } }]),
      ],
    },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: 31,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return {
    posts: rows.slice(0, 30).flatMap((row) => {
      const post = publicPost(row);
      return post ? [post] : [];
    }),
    nextCursor: rows.length > 30 ? rows[29].id : null,
  };
}
export function createClubPostsRouter(): ExpressRouter {
  const router = Router();
  router.use(`${base}/my-companies`, requireAuth, (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  // Blog entries must pass company ownership checks instead of the generic form endpoint.
  router.post("/forms/mgl-club-posts/responses", (_req, res) =>
    res.status(403).json({
      message: "Нийтлэлийг өөрийн байгууллагын удирдлагын хэсгээс оруулна уу.",
    }),
  );
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  router.get(`${base}/my-companies`, requireAuth, async (req, res) => {
    try {
      const rows = await prisma.formResponse.findMany({
        where: {
          form: { slug: "mgl-club", isActive: true },
          ...clubCompanyOwnershipWhere(req),
        },
        orderBy: { submittedAt: "desc" },
      });
      return res.json({
        companies: rows.flatMap((row) => {
          const profile = parseMglClubProfile(row.data);
          if (!profile) return [];
          const { consent: _consent, ...member } = profile;
          return [
            {
              id: row.id,
              ...member,
              siteSlug: isClubSiteSlug(jsonObject(row.data).clubSiteSlug)
                ? jsonObject(row.data).clubSiteSlug
                : null,
            },
          ];
        }),
      });
    } catch {
      return res
        .status(503)
        .json({ message: "Байгууллагуудыг ачаалж чадсангүй." });
    }
  });
  router.post(
    `${base}/members/:id/claim`,
    requireAuth,
    limit,
    async (req, res) => {
      const id = String(req.params.id),
        token = req.body?.paymentToken;
      if (!uuid.test(id) || typeof token !== "string")
        return res
          .status(400)
          .json({ message: "Бүртгэлийн мэдээллээ шалгана уу." });
      try {
        const claimed = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "FormResponse" WHERE "id" = ${id} FOR UPDATE`;
          const row = await tx.formResponse.findFirst({
            where: { id, form: { slug: "mgl-club", isActive: true } },
          });
          if (!row) return false;
          const data = jsonObject(row.data);
          if (
            !parseMglClubProfile(data) ||
            !clubGoldTokenMatches(token, data.paymentTokenHash) ||
            (data.ownerUserId && data.ownerUserId !== actor(req))
          )
            return false;
          await tx.formResponse.update({
            where: { id },
            data: {
              data: {
                ...data,
                ownerUserId: actor(req),
              } as Prisma.InputJsonObject,
            },
          });
          return true;
        });
        return claimed
          ? res.json({ success: true })
          : res.status(403).json({
              message: "Энэ байгууллагыг таны бүртгэлд холбох эрхгүй байна.",
            });
      } catch {
        return res
          .status(503)
          .json({ message: "Байгууллага холбож чадсангүй." });
      }
    },
  );
  router.get(`${base}/members/:id/posts`, async (req, res) => {
    const id = String(req.params.id),
      cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    if (!uuid.test(id) || (cursor && !uuid.test(cursor)))
      return res.status(400).json({ message: "Холбоос буруу байна." });
    try {
      const row = await company(id);
      if (!row || !parseMglClubProfile(row.data)) return res.sendStatus(404);
      return res.json(await posts(id, cursor, false));
    } catch {
      return res
        .status(503)
        .json({ message: "Нийтлэлүүдийг ачаалж чадсангүй." });
    }
  });
  router.get(
    `${base}/my-companies/:id/posts`,
    requireAuth,
    requireClubCompanyAccess,
    async (req, res) => {
      const id = String(req.params.id),
        cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
      if (cursor && !uuid.test(cursor)) return res.sendStatus(400);
      try {
        if (!(await editableCompany(id))) return res.sendStatus(403);
        return res.json(await posts(id, cursor, true));
      } catch {
        return res
          .status(503)
          .json({ message: "Нийтлэлүүдийг ачаалж чадсангүй." });
      }
    },
  );
  async function save(req: Request, res: import("express").Response) {
    const id = String(req.params.id),
      postId = req.params.postId ? String(req.params.postId) : "";
    const input = parseMglClubPost(req.body);
    if (!input || (postId && !uuid.test(postId)))
      return res.status(400).json({
        message:
          "Гарчиг (160 тэмдэгт), агуулга (12,000 тэмдэгт) болон нийтлэх төлөвөө шалгана уу.",
      });
    try {
      if (!(await editableCompany(id)))
        return res.status(403).json({
          message: "Байгууллага олдсонгүй.",
        });
      const form = await prisma.form.upsert({
        where: { slug: postSlug },
        update: {},
        create: {
          slug: postSlug,
          title: "MGL CLUB • Байгууллагын блог",
          fields: [],
        },
      });
      if (!form.isActive) return res.sendStatus(410);
      const data = {
        ...input,
        companyId: id,
        updatedAt: new Date().toISOString(),
      };
      if (postId) {
        const updated = await prisma.formResponse.updateMany({
          where: {
            id: postId,
            formId: form.id,
            data: { path: ["companyId"], equals: id },
          },
          data: { data },
        });
        if (!updated.count) return res.sendStatus(404);
        return res.json({ success: true });
      }
      const row = await prisma.formResponse.create({
        data: { formId: form.id, data },
      });
      return res.status(201).json({ post: publicPost(row) });
    } catch {
      return res
        .status(503)
        .json({ message: "Нийтлэл хадгалж чадсангүй. Дахин оролдоно уу." });
    }
  }
  router.post(
    `${base}/my-companies/:id/posts`,
    requireAuth,
    requireClubCompanyAccess,
    limit,
    save,
  );
  router.patch(
    `${base}/my-companies/:id/posts/:postId`,
    requireAuth,
    requireClubCompanyAccess,
    limit,
    save,
  );
  return router;
}
