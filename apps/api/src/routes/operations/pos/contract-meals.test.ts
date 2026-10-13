import assert from "node:assert/strict";
import test from "node:test";
import { RestaurantMealContractStatus } from "@mgl/database";
import {
  getUlaanbaatarMealUsageRanges,
  isRestaurantMealContractActive,
  normalizeRestaurantMealAccessToken,
  ulaanbaatarDateKey,
  validateRestaurantMealLimits,
} from "./contract-meals.routes";

test("contract meal QR accepts the printed prefix and URL token", () => {
  assert.equal(
    normalizeRestaurantMealAccessToken("MGLMEAL:employee-token"),
    "employee-token",
  );
  assert.equal(
    normalizeRestaurantMealAccessToken(
      "https://example.test/kiosk?mealToken=url-token",
    ),
    "url-token",
  );
});

test("contract date eligibility is inclusive in Ulaanbaatar", () => {
  const now = new Date("2026-10-13T16:30:00.000Z");
  assert.equal(ulaanbaatarDateKey(now), "2026-10-14");
  assert.equal(
    isRestaurantMealContractActive(
      {
        status: RestaurantMealContractStatus.ACTIVE,
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-14T00:00:00.000Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    isRestaurantMealContractActive(
      {
        status: RestaurantMealContractStatus.INACTIVE,
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDate: new Date("2026-10-31T00:00:00.000Z"),
      },
      now,
    ),
    false,
  );
});

test("meal usage ranges follow the Ulaanbaatar calendar", () => {
  const ranges = getUlaanbaatarMealUsageRanges(
    new Date("2026-10-13T16:30:00.000Z"),
  );
  assert.equal(ranges.dayStart.toISOString(), "2026-10-13T16:00:00.000Z");
  assert.equal(ranges.dayEnd.toISOString(), "2026-10-14T16:00:00.000Z");
  assert.equal(ranges.monthStart.toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(ranges.monthEnd.toISOString(), "2026-10-31T16:00:00.000Z");
});

test("meal limits allow an exact balance and reject an overage", () => {
  assert.doesNotThrow(() =>
    validateRestaurantMealLimits({
      dailyUsage: 12_000,
      monthlyUsage: 82_000,
      amount: 8_000,
      dailyLimit: 20_000,
      monthlyLimit: 90_000,
    }),
  );
  assert.throws(
    () =>
      validateRestaurantMealLimits({
        dailyUsage: 12_000,
        monthlyUsage: 82_000,
        amount: 8_001,
        dailyLimit: 20_000,
        monthlyLimit: 90_000,
      }),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { status?: number }).status === 409,
  );
});
