import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShiftModeScope,
  canUsePosRegisterForMode,
  getRequestedShiftMode,
  getRequiredSaleRegisterMode,
  normalizePosRegisterMode,
  usesRestaurantTicketLifecycle,
} from "./pos-register-mode";

test("normalizes only supported register modes", () => {
  assert.equal(normalizePosRegisterMode(" restaurant "), "RESTAURANT");
  assert.equal(normalizePosRegisterMode("store"), null);
});

test("derives register mode from shift and sale channels", () => {
  assert.equal(getRequestedShiftMode(undefined), "RETAIL");
  assert.equal(getRequestedShiftMode("RESTAURANT"), "RESTAURANT");
  assert.equal(getRequestedShiftMode("SELF_SERVICE"), "SELF_SERVICE");
  assert.equal(
    getRequiredSaleRegisterMode({
      isSelfService: false,
      restaurantTicketId: "ticket-1",
    }),
    "RESTAURANT",
  );
  assert.equal(
    getRequiredSaleRegisterMode({
      isSelfService: true,
      restaurantTicketId: "ticket-1",
    }),
    "SELF_SERVICE",
  );
});

test("retail shifts cannot inherit restaurant ticket lifecycle", () => {
  assert.deepEqual(buildShiftModeScope("RETAIL"), { mode: "RETAIL" });
  assert.equal(
    usesRestaurantTicketLifecycle({ shiftMode: "RETAIL" }),
    false,
  );
  assert.equal(
    usesRestaurantTicketLifecycle({ shiftMode: "RESTAURANT" }),
    true,
  );
});

test("restaurant and self-service flows can share one restaurant register", () => {
  assert.equal(
    canUsePosRegisterForMode("RESTAURANT", "SELF_SERVICE"),
    true,
  );
  assert.equal(
    canUsePosRegisterForMode("SELF_SERVICE", "RESTAURANT"),
    true,
  );
  assert.equal(canUsePosRegisterForMode("RETAIL", "RESTAURANT"), false);
  assert.equal(canUsePosRegisterForMode("RESTAURANT", "RETAIL"), false);
});
