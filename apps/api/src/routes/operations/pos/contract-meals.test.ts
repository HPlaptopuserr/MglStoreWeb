import assert from "node:assert/strict";
import test from "node:test";
import { RestaurantMealContractStatus } from "@mgl/database";
import {
  isValidRestaurantMealContractPin,
  isRestaurantMealContractActive,
  ulaanbaatarDateKey,
} from "./contract-meals.routes";

test("contract meal PIN must contain exactly four digits", () => {
  assert.equal(isValidRestaurantMealContractPin("1234"), true);
  assert.equal(isValidRestaurantMealContractPin(" 1234 "), true);
  assert.equal(isValidRestaurantMealContractPin("123"), false);
  assert.equal(isValidRestaurantMealContractPin("12345"), false);
  assert.equal(isValidRestaurantMealContractPin("12a4"), false);
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
