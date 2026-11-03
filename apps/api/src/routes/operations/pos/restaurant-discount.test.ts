import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRestaurantDiscountAmount,
  formatRestaurantDiscountTime,
  isRestaurantDiscountActive,
  isRestaurantDiscountEligibleProduct,
  parseRestaurantDiscountTime,
  RESTAURANT_DISCOUNT_TIME_ZONE,
} from "./restaurant-discount";

const schedule = {
  isEnabled: true,
  percent: 20,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
  timeZone: RESTAURANT_DISCOUNT_TIME_ZONE,
};

test("restaurant discount time parsing validates HH:mm", () => {
  assert.equal(parseRestaurantDiscountTime("09:05"), 545);
  assert.equal(formatRestaurantDiscountTime(545), "09:05");
  assert.equal(parseRestaurantDiscountTime("24:00"), null);
  assert.equal(parseRestaurantDiscountTime("9:00"), null);
});

test("restaurant discount uses Ulaanbaatar local start-inclusive window", () => {
  assert.equal(
    isRestaurantDiscountActive(schedule, new Date("2026-10-12T01:00:00Z")),
    true,
  );
  assert.equal(
    isRestaurantDiscountActive(schedule, new Date("2026-10-12T08:59:59Z")),
    true,
  );
  assert.equal(
    isRestaurantDiscountActive(schedule, new Date("2026-10-12T09:00:00Z")),
    false,
  );
});

test("restaurant discount supports an overnight window", () => {
  const overnight = { ...schedule, startMinute: 22 * 60, endMinute: 2 * 60 };
  assert.equal(
    isRestaurantDiscountActive(overnight, new Date("2026-10-12T15:00:00Z")),
    true,
  );
  assert.equal(
    isRestaurantDiscountActive(overnight, new Date("2026-10-12T17:00:00Z")),
    true,
  );
  assert.equal(
    isRestaurantDiscountActive(overnight, new Date("2026-10-12T06:00:00Z")),
    false,
  );
});

test("restaurant discount rounds each unit to two decimal places", () => {
  assert.equal(calculateRestaurantDiscountAmount(12_345, 20), 2469);
  assert.equal(calculateRestaurantDiscountAmount(99.99, 15), 15);
});

test("restaurant discount excludes drinks and bar items", () => {
  assert.equal(
    isRestaurantDiscountEligibleProduct({
      isRestaurantMenuItem: true,
      menuCategory: "HOT",
      kitchenStation: "HOT_KITCHEN",
    }),
    true,
  );
  assert.equal(
    isRestaurantDiscountEligibleProduct({
      isRestaurantMenuItem: true,
      menuCategory: "DRINK",
      kitchenStation: "BAR",
    }),
    false,
  );
  assert.equal(
    isRestaurantDiscountEligibleProduct({
      isRestaurantMenuItem: true,
      menuCategory: "CUSTOM_COFFEE",
      kitchenStation: "BAR",
    }),
    false,
  );
});
