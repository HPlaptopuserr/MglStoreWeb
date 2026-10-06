import assert from "node:assert/strict";
import test from "node:test";
import { parseEnrichmentBatch } from "./enrichment-response";
const batch = {
  total: 100,
  processed: 25,
  created: 5,
  existing: 20,
  skipped: 0,
  warehouseProducts: 10,
  unitDifferences: 0,
  issues: [],
  startedAt: "2026-10-06T00:00:00.000Z",
  nextCursor: "p-025",
};
test("valid pages and empty completion retain counts and snapshot", () => {
  assert.deepEqual(
    parseEnrichmentBatch(batch, "p-001", batch.startedAt),
    batch,
  );
  assert.equal(
    parseEnrichmentBatch({
      ...batch,
      total: 0,
      processed: 0,
      created: 0,
      existing: 0,
      warehouseProducts: 0,
      nextCursor: null,
    }).processed,
    0,
  );
});
test("malformed responses and stuck/backwards cursors cannot loop or show false success", () => {
  for (const value of [
    null,
    {},
    { ...batch, created: -1 },
    { ...batch, existing: 1 },
    { ...batch, issues: [null] },
    { ...batch, startedAt: "bad" },
    { ...batch, nextCursor: "p-001" },
    { ...batch, nextCursor: "p-000" },
    { ...batch, startedAt: "2026-10-05T00:00:00.000Z" },
  ])
    assert.throws(() => parseEnrichmentBatch(value, "p-001", batch.startedAt));
});

test("unit differences are informational and bounded by existing matches", () => {
  assert.equal(
    parseEnrichmentBatch({ ...batch, unitDifferences: 10 }).unitDifferences,
    10,
  );
  assert.throws(() => parseEnrichmentBatch({ ...batch, unitDifferences: 21 }));
  assert.throws(() => parseEnrichmentBatch({ ...batch, unitDifferences: -1 }));
  assert.equal(
    parseEnrichmentBatch({ ...batch, unitDifferences: undefined })
      .unitDifferences,
    0,
  );
});
