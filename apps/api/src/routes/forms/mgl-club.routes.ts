import { createClubProfileRouter } from "./mgl-club-profile.routes";
import { createClubSiteUrlRouter } from "./mgl-club-site-url.routes";
import { requireClubAdmin } from "./mgl-club-access";
import { randomBytes, createHash } from "node:crypto";
import { createClubWebsiteRouter } from "./mgl-club-website.routes";
import { createClubPostsRouter } from "./mgl-club-posts.routes";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import type { Request } from "express";
import { createClubGoldRouter } from "./mgl-club-gold.routes";
import { Router, type Router as ExpressRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma, Prisma } from "@mgl/database";
import {
  mglClubFormFields,
  MGL_CLUB_SECTORS,
  parseMglClubProfile,
  parseClubWebsite,
  isClubSiteSlug,
  normalizeMglClubLocation,
} from "@mgl/types";

import { createClubLogoRouter } from "./mgl-club-logo.routes";

const router: ExpressRouter = Router();
router.use(createClubLogoRouter());
router.use(createClubGoldRouter());
router.use(createClubPostsRouter());
router.use(createClubWebsiteRouter());
router.use(createClubSiteUrlRouter());
router.use(createClubProfileRouter());
const slug = "mgl-club";
router.post(
  "/forms/mgl-club/responses",
  requireAuth,
  requireClubAdmin,
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  async (req, res) => {
    const data = parseMglClubProfile(req.body?.data);
    if (!data)
      return res.status(400).json({
        message:
          "Заавал бөглөх мэдээлэл, 8 оронтой утас болон нийтлэх зөвшөөрлөө шалгана уу.",
      });
    try {
      const form = await prisma.form.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          title: "MGL CLUB • Бизнес эрхлэгчдийн бүртгэл",
          fields: mglClubFormFields,
        },
      });
      if (!form.isActive)
        return res.status(410).json({ message: "Бүртгэл хаагдсан байна." });
      const paymentToken = randomBytes(32).toString("hex");
      const registration = await prisma.formResponse.create({
        data: {
          formId: form.id,
          data: {
            ...data,
            ...((req as Request & { user?: AuthPayload }).user
              ? {
                  ownerUserId: (req as Request & { user: AuthPayload }).user
                    .userId,
                }
              : {}),
            paymentTokenHash: createHash("sha256")
              .update(paymentToken)
              .digest("hex"),
          },
        },
      });
      return res
        .status(201)
        .json({ success: true, registrationId: registration.id, paymentToken });
    } catch {
      return res.status(500).json({
        message: "Бүртгэл хадгалахад алдаа гарлаа. Дахин оролдоно уу.",
      });
    }
  },
);

router.get("/forms/mgl-club/members/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return res
      .status(400)
      .json({ message: "Байгууллагын холбоос буруу байна." });
  try {
    const row = await prisma.formResponse.findFirst({
      where: { id, form: { slug, isActive: true } },
    });
    const profile = row && parseMglClubProfile(row.data);
    if (!row || !profile)
      return res.status(404).json({ message: "Байгууллага олдсонгүй." });
    const { consent: _consent, ...member } = profile;
    const raw = row.data;
    const isDemo =
      raw !== null &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      raw.isDemo === true;
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      siteSlug:
        raw &&
        typeof raw === "object" &&
        !Array.isArray(raw) &&
        isClubSiteSlug(raw.clubSiteSlug)
          ? raw.clubSiteSlug
          : null,
      member: { id: row.id, ...member, ...(isDemo ? { isDemo: true } : {}) },
      website:
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? parseClubWebsite(raw.websitePublished)
          : null,
    });
  } catch {
    return res.status(503).json({
      message: "Байгууллагын мэдээлэл ачаалж чадсангүй. Дахин оролдоно уу.",
    });
  }
});

router.get("/forms/mgl-club/members", async (req, res) => {
  const readQuery = (key: string) =>
    typeof req.query[key] === "string" ? req.query[key].trim() : "";
  const query = readQuery("q");
  const sector = readQuery("sector");
  const scope = readQuery("scope");
  const cursor = readQuery("cursor");
  const cityQuery = readQuery("city");
  const city = cityQuery ? normalizeMglClubLocation(cityQuery) : null;
  if (
    (scope && !["services", "all", "needs", "gold"].includes(scope)) ||
    (cityQuery && !city) ||
    query.length > 160 ||
    sector.length > 160 ||
    (cursor && !/^[0-9a-f-]{36}$/i.test(cursor))
  )
    return res.status(400).json({ message: "Хайлтын утгаа шалгана уу." });
  try {
    // Prisma 5 JSON filters do not support case-insensitive matching.
    // Keep every user value parameterized and escape LIKE wildcards.
    const conditions = [
      Prisma.sql`f."slug" = ${slug}`,
      Prisma.sql`f."isActive" = TRUE`,
      Prisma.sql`r."data"->>'consent' = 'yes'`,
    ];
    if (scope === "gold") {
      conditions.push(Prisma.sql`(r."data"->>'clubFeaturedGold' = 'true' OR EXISTS (
        SELECT 1 FROM "QPayInvoice" p
        WHERE p."saleReference" = 'MGL_CLUB_GOLD:' || r."id"
        AND p."status" = 'PAID' AND p."amount" = 1200000
        AND p."paidAt" IS NOT NULL
        AND p."webhookPayload"->>'kind' = 'MGL_CLUB_GOLD'
        AND (p."webhookPayload"->>'accessExpiresAt' > to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      ))`);
      conditions.push(
        Prisma.sql`COALESCE(r."data"->>'isDemo', 'false') <> 'true'`,
      );
    }
    if (scope === "needs") {
      conditions.push(
        Prisma.sql`NULLIF(BTRIM(r."data"->>'needs'), '') IS NOT NULL`,
      );
    }
    if (city) {
      // Include older free-text registrations using city names or an aimag suffix.
      const locations = [
        city,
        `${city} аймаг`,
        ...(city === "Дархан-Уул"
          ? ["Дархан"]
          : city === "Орхон"
            ? ["Эрдэнэт"]
            : []),
      ];
      conditions.push(
        Prisma.sql`TRIM(r."data"->>'city') IN (${Prisma.join(locations)})`,
      );
    }
    // Availability is calculated across the province, independently of search/pagination.
    const availabilityConditions = [...conditions];
    if (sector) conditions.push(Prisma.sql`r."data"->>'sector' = ${sector}`);
    if (cursor) conditions.push(Prisma.sql`r."id" > ${cursor}`);
    if (query) {
      const pattern = `%${query.replace(/[\\%_]/g, (value) => `\\${value}`)}%`;
      const fields =
        scope === "needs"
          ? ["name", "businessName", "city", "sector", "needs"]
          : [
              "name",
              "businessName",
              "city",
              "sector",
              "description",
              "offers",
              ...(scope === "services" ? [] : ["needs"]),
            ];
      conditions.push(
        Prisma.sql`(${Prisma.join(
          fields.map(
            (field) => Prisma.sql`r."data"->>${field} ILIKE ${pattern}`,
          ),
          " OR ",
        )})`,
      );
    }
    const rows = await prisma.$queryRaw<
      Array<{ id: string; data: Prisma.JsonValue }>
    >(Prisma.sql`
      SELECT r."id", r."data" FROM "FormResponse" r
      INNER JOIN "Form" f ON f."id" = r."formId"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY r."id" ASC LIMIT 25
    `);
    const serviceRows = await prisma.$queryRaw<
      Array<{ sector: string; count: number }>
    >(Prisma.sql`
      SELECT r."data"->>'sector' AS sector, COUNT(*)::int AS count
      FROM "FormResponse" r INNER JOIN "Form" f ON f."id" = r."formId"
      WHERE ${Prisma.join(availabilityConditions, " AND ")}
      GROUP BY r."data"->>'sector'
    `);
    const services = MGL_CLUB_SECTORS.flatMap((sector) => {
      const group = serviceRows.find((row) => row.sector === sector);
      return group ? [group] : [];
    });
    const members = rows.slice(0, 24).flatMap((row) => {
      const profile = parseMglClubProfile(row.data);
      if (!profile) return [];
      const { consent: _consent, ...member } = profile;
      const isDemo =
        row.data !== null &&
        typeof row.data === "object" &&
        !Array.isArray(row.data) &&
        row.data.isDemo === true;
      return [{ id: row.id, ...member, ...(isDemo ? { isDemo: true } : {}) }];
    });
    return res.json({
      members,
      services,
      nextCursor: rows.length > 24 ? rows[23].id : null,
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Гишүүдийн мэдээлэл ачаалж чадсангүй." });
  }
});
export default router;
