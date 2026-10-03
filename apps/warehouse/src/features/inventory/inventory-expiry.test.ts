import assert from "node:assert/strict";
import test from "node:test";
import { getInventoryBarcodes, getInventoryExpiry } from "./inventory-expiry";
const now = new Date("2026-10-03T16:47:00Z");
test("expiry uses Ulaanbaatar calendar day at midnight", () => {
  assert.equal(getInventoryExpiry("2026-10-03", now).days, -1);
  assert.equal(getInventoryExpiry("2026-10-04", now).label, "Өнөөдөр дуусна");
  assert.equal(getInventoryExpiry("2026-10-05", now).days, 1);
});
test("missing dates are unknown and 30 days is the warning boundary", () => {
  assert.equal(getInventoryExpiry(null, now).days, null);
  assert.equal(getInventoryExpiry("invalid", now).days, null);
  assert.equal(getInventoryExpiry("2026-11-03", now).tone, "warning");
  assert.equal(getInventoryExpiry("2026-11-04", now).tone, "healthy");
});
test("barcode count includes unique codes only and preserves leading zeroes", () => {
  assert.deepEqual(getInventoryBarcodes("00123", ["00123", "00456", " "]), ["00123", "00456"]);
  assert.deepEqual(getInventoryBarcodes(null), []);
});
