import { Prisma, prisma } from "@mgl/database";
import { normalizePhoneNumber } from "../../utils/phone-number";
import { access } from "./access";
import { GroupError, text } from "./policy";

export interface CompanySearchResult {
  id: string;
  name: string;
  taxId: string;
  linkState: "AVAILABLE" | "CONNECTED" | "PENDING";
}
export async function searchGroupCompanies(
  userId: string,
  groupId: string,
  value: unknown,
): Promise<CompanySearchResult[]> {
  await access(prisma, userId, groupId, "admin");
  const query = text(value, 160).replace(/\s+/gu, " ");
  if (query.length < 2)
    throw new GroupError(
      400,
      "Нэр эсвэл дугаараас 2-оос доошгүй тэмдэгт оруулна уу.",
    );
  // Parameter binding and literal LIKE escaping prevent wildcard-only directory scans.
  const literal = query.replace(/[\\%_]/g, "\\$&");
  const phone = /^[+\d\s()-]+$/u.test(query)
    ? normalizePhoneNumber(query)
    : null;
  const phoneMatch =
    phone?.length === 8
      ? Prisma.sql`regexp_replace(COALESCE(o.phone,''),'[^0-9]','','g') IN (${phone},${"976" + phone})`
      : Prisma.sql`FALSE`;
  return prisma.$queryRaw<CompanySearchResult[]>(Prisma.sql`
    SELECT o.id,o.name,o."taxId",
      CASE WHEN EXISTS(SELECT 1 FROM "GroupCompany" c WHERE c."groupId"=${groupId} AND c."organizationId"=o.id AND c."disconnectedAt" IS NULL) THEN 'CONNECTED'
      WHEN EXISTS(SELECT 1 FROM "GroupCompanyInvitation" i WHERE i."groupId"=${groupId} AND i."organizationId"=o.id AND i.status='PENDING' AND i."expiresAt">NOW()) THEN 'PENDING'
      ELSE 'AVAILABLE' END AS "linkState"
    FROM "Organization" o
    WHERE o."deletedAt" IS NULL AND o.status='ACTIVE'
      AND (o.id=${query} OR o."taxId" COLLATE "und-x-icu" ILIKE ${literal + "%"} OR o.name COLLATE "und-x-icu" ILIKE ${"%" + literal + "%"} OR ${phoneMatch})
    ORDER BY CASE WHEN o.id=${query} OR o."taxId" COLLATE "und-x-icu" ILIKE ${literal} OR ${phoneMatch} THEN 0
      WHEN o.name COLLATE "und-x-icu" ILIKE ${literal} THEN 1 WHEN o.name COLLATE "und-x-icu" ILIKE ${literal + "%"} THEN 2 ELSE 3 END,
      o.name ASC,o.id ASC
    LIMIT 20
  `);
}
