import { Prisma, prisma } from "@mgl/database";

export function posStatisticsWindow(value: unknown): 7 | 30 | 90 | "all" {
  if (value === "all") return "all";
  const days = Number(value);
  return days === 7 || days === 90 ? days : 30;
}

export function buildPosStoreStatisticsQuery(window: 7 | 30 | 90 | "all", now: Date) {
  const since = window === "all" ? null : new Date(now.getTime() - window * 86400000);
  // An organization is counted once regardless of branches, registers or receipts.
  // Vendor users also own SUPPLIER organizations, so do not filter by OrgType.
  return Prisma.sql`
    WITH active_stores AS (
      SELECT DISTINCT s."organizationId"
      FROM "PosSale" s
      JOIN "Organization" o ON o.id = s."organizationId"
      WHERE s.status = 'COMPLETED' AND s."voidedAt" IS NULL
        AND o."deletedAt" IS NULL
        AND s."createdAt" <= ${now}
        ${since ? Prisma.sql`AND s."createdAt" >= ${since}` : Prisma.empty}
    ), store_products AS (
      SELECT p.id, p."masterProductId"
      FROM "Product" p
      JOIN active_stores a ON a."organizationId" = p."organizationId"
      WHERE p."deletedAt" IS NULL AND p."isActive" = true
    )
    SELECT
      (SELECT COUNT(*)::int FROM active_stores) AS "activeStoreCount",
      COUNT(*)::int AS "productRecordCount",
      COUNT(DISTINCT CASE WHEN "masterProductId" IS NOT NULL
        THEN 'master:' || "masterProductId" ELSE 'product:' || id END)::int AS "productTypeCount"
    FROM store_products
  `;
}

export async function getPosStoreStatistics(value: unknown) {
  const windowDays = posStatisticsWindow(value);
  const now = new Date();
  const [counts] = await prisma.$queryRaw<Array<{
    activeStoreCount: number;
    productRecordCount: number;
    productTypeCount: number;
  }>>(buildPosStoreStatisticsQuery(windowDays, now));
  return { ...counts, windowDays, generatedAt: now.toISOString() };
}
