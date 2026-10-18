import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWorkforceInstant } from "./format";
test("Excel report timestamps use organization timezone across midnight", () => {
  assert.equal(
    formatWorkforceInstant("2026-10-15T16:15:00Z", "Asia/Ulaanbaatar", true),
    "2026-10-16 00:15",
  );
  assert.equal(
    formatWorkforceInstant("2026-10-16T01:00:00Z", "Asia/Ulaanbaatar"),
    "09:00",
  );
  assert.equal(
    formatWorkforceInstant("2026-10-16T01:00:00Z", "Asia/Hovd"),
    "08:00",
  );
  assert.equal(formatWorkforceInstant(null, "Asia/Ulaanbaatar"), "");
});
