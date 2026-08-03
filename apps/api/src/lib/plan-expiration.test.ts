import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePlanExpiration,
  endOfCurrentYearInUlaanbaatar,
} from "./plan-expiration";

test("year-end plan expires at the end of the current Ulaanbaatar calendar year", () => {
  const now = new Date("2026-05-15T04:00:00.000Z");

  assert.equal(
    endOfCurrentYearInUlaanbaatar(now).toISOString(),
    "2026-12-31T15:59:59.999Z",
  );
  assert.equal(
    calculatePlanExpiration({ id: "1y", durationDays: 365 }, now).toISOString(),
    "2026-12-31T15:59:59.999Z",
  );
});

test("year-end calculation uses Ulaanbaatar's current year around UTC year rollover", () => {
  const now = new Date("2026-12-31T16:30:00.000Z");

  assert.equal(
    calculatePlanExpiration({ id: "1y", durationDays: 365 }, now).toISOString(),
    "2027-12-31T15:59:59.999Z",
  );
});

test("custom days override the year-end plan expiration", () => {
  const now = new Date("2026-05-15T04:00:00.000Z");

  assert.equal(
    calculatePlanExpiration({ id: "1y", durationDays: 365 }, now, 10).toISOString(),
    "2026-05-25T04:00:00.000Z",
  );
});

test("other plans continue to use their configured duration", () => {
  const now = new Date("2026-05-15T04:00:00.000Z");

  assert.equal(
    calculatePlanExpiration({ id: "1m", durationDays: 30 }, now).toISOString(),
    "2026-06-14T04:00:00.000Z",
  );
});
