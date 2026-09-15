import assert from "node:assert/strict";
import test from "node:test";
import { parseWarehouseDateRange } from "./warehouse-date-range";

test("warehouse date range covers a full Ulaanbaatar calendar day", () => {
  const range = parseWarehouseDateRange("2026-09-15", "2026-09-15");
  assert.equal(range.from?.toISOString(), "2026-09-14T16:00:00.000Z");
  assert.equal(range.to?.toISOString(), "2026-09-15T15:59:59.999Z");
});

test("warehouse date range rejects malformed values", () => {
  assert.deepEqual(parseWarehouseDateRange("09/15/2026", "invalid"), {
    from: null,
    to: null,
  });
});

test("warehouse date range rejects impossible calendar dates", () => {
  assert.deepEqual(parseWarehouseDateRange("2026-02-29", "2026-13-01"), {
    from: null,
    to: null,
  });
  assert.equal(
    parseWarehouseDateRange("2028-02-29", null).from?.toISOString(),
    "2028-02-28T16:00:00.000Z",
  );
});
