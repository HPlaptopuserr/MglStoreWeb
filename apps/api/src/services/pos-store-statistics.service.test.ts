import { test } from "node:test";
import { strict as assert } from "node:assert";
import { prisma } from "@mgl/database";
import { buildPosStoreStatisticsQuery, posStatisticsWindow } from "./pos-store-statistics.service";

test("POS statistics accepts dashboard windows and defaults invalid input", () => {
  assert.equal(posStatisticsWindow("7"), 7);
  assert.equal(posStatisticsWindow("90"), 90);
  assert.equal(posStatisticsWindow("all"), "all");
  for (const value of [undefined, "bad", -1, "365"]) assert.equal(posStatisticsWindow(value), 30);
});

test("POS aggregate excludes void/refund/deleted/future sales and deduplicates stores and master products", { skip: process.env.TEST_POS_STATISTICS_DATABASE !== "1" }, async () => {
  // Read-only VALUES fixtures shadow all source tables; no application data is read or written.
  const fixtures = `WITH organizations(id, "deletedAt") AS (VALUES ('a', NULL::timestamp), ('b', NULL::timestamp), ('c', NULL::timestamp), ('d', TIMESTAMP '2026-09-01'), ('e', NULL::timestamp)),
  sales("organizationId", status, "voidedAt", "createdAt") AS (VALUES
    ('a', 'COMPLETED', NULL::timestamp, TIMESTAMP '2026-09-29'),
    ('a', 'COMPLETED', NULL::timestamp, TIMESTAMP '2026-09-29'),
    ('b', 'COMPLETED', NULL::timestamp, TIMESTAMP '2026-09-28'),
    ('c', 'VOIDED', NULL::timestamp, TIMESTAMP '2026-09-29'),
    ('c', 'REFUNDED', NULL::timestamp, TIMESTAMP '2026-09-29'),
    ('c', 'COMPLETED', TIMESTAMP '2026-09-29', TIMESTAMP '2026-09-29'),
    ('d', 'COMPLETED', NULL::timestamp, TIMESTAMP '2026-09-29'),
    ('e', 'COMPLETED', NULL::timestamp, TIMESTAMP '2026-08-01'),
    ('c', 'COMPLETED', NULL::timestamp, TIMESTAMP '2027-01-01')),
  products(id, "organizationId", "masterProductId", "deletedAt", "isActive") AS (VALUES
    ('p1','a','m1',NULL::timestamp,true), ('p2','b','m1',NULL::timestamp,true),
    ('p3','a',NULL,NULL::timestamp,true), ('p4','a',NULL,NULL::timestamp,false),
    ('p5','b',NULL,TIMESTAMP '2026-09-01',true), ('p6','e',NULL,NULL::timestamp,true)),`;
  try {
    for (const [window, expected] of [[7, [2,3,2]], ["all", [3,4,3]]] as const) {
      const query = buildPosStoreStatisticsQuery(window, new Date('2026-09-30T00:00:00Z'));
      const sql = fixtures + query.text.replace(/^\s*WITH/, "").replaceAll('"PosSale"', 'sales').replaceAll('"Organization"', 'organizations').replaceAll('"Product"', 'products');
      const [row] = await prisma.$queryRawUnsafe<Array<{activeStoreCount:number;productRecordCount:number;productTypeCount:number}>>(sql, ...query.values);
      assert.deepEqual([row.activeStoreCount,row.productRecordCount,row.productTypeCount], expected);
    }
  } finally { await prisma.$disconnect(); }
});
