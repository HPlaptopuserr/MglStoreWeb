import assert from "node:assert/strict";
import test from "node:test";
import {
  inventoryAuditIssues,
  isCriticalInventoryAuditIssue,
} from "./inventory-audit.policy";

const now = new Date("2026-09-15T00:00:00.000Z");

test("reports critical stock, reservation and expiry inconsistencies", () => {
  const issues = inventoryAuditIssues({
    physicalStock: -1,
    reservedStock: 4,
    sku: "SKU-1",
    barcode: "123",
    location: "A-01",
    isActive: true,
    deletedAt: null,
    expiryDate: new Date("2026-09-14T00:00:00.000Z"),
    now,
  });
  assert.deepEqual(issues, ["NEGATIVE_STOCK", "OVER_RESERVED", "EXPIRED"]);
  assert.ok(issues.every(isCriticalInventoryAuditIssue));
});

test("reports metadata gaps and approaching expiry", () => {
  assert.deepEqual(
    inventoryAuditIssues({
      physicalStock: 19,
      reservedStock: 19,
      sku: " ",
      barcode: null,
      location: "",
      isActive: false,
      deletedAt: null,
      expiryDate: new Date("2026-10-01T00:00:00.000Z"),
      now,
    }),
    [
      "MISSING_SKU",
      "MISSING_BARCODE",
      "MISSING_LOCATION",
      "INACTIVE_PRODUCT",
      "EXPIRING_SOON",
    ],
  );
});

test("does not treat fully reserved stock as over-reserved", () => {
  assert.deepEqual(
    inventoryAuditIssues({
      physicalStock: 19,
      reservedStock: 19,
      sku: "DHT-DED-001",
      barcode: "8658000251728",
      location: "A-01",
      isActive: true,
      deletedAt: null,
      expiryDate: null,
      now,
    }),
    [],
  );
});
