import assert from "node:assert/strict";
import test from "node:test";
import { distanceMeters } from "./sales-representative.routes";

test("sales visit distance is zero for the same coordinate", () => {
  assert.equal(distanceMeters(47.9184, 106.9177, 47.9184, 106.9177), 0);
});

test("sales visit distance is symmetric and measured in meters", () => {
  const outbound = distanceMeters(47.9184, 106.9177, 47.9193, 106.9177);
  const inbound = distanceMeters(47.9193, 106.9177, 47.9184, 106.9177);
  assert.ok(outbound > 95 && outbound < 105);
  assert.ok(Math.abs(outbound - inbound) < 0.001);
});
