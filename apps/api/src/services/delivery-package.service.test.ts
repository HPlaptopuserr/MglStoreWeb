import assert from "node:assert/strict";
import test from "node:test";
import { parseDeliveryPackageDetails } from "./delivery-package.service";

test("accepts and normalizes complete delivery package details", () => {
  const result = parseDeliveryPackageDetails({
    packageCount: "2",
    totalWeightKg: "14.5",
    packageLengthCm: 60,
    packageWidthCm: 40,
    packageHeightCm: 35,
    sizeCategory: "medium",
    isFragile: true,
    handlingInstructions: "  Босоогоор зөөнө  ",
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.data, {
    packageCount: 2,
    totalWeightKg: 14.5,
    packageLengthCm: 60,
    packageWidthCm: 40,
    packageHeightCm: 35,
    sizeCategory: "MEDIUM",
    isFragile: true,
    handlingInstructions: "Босоогоор зөөнө",
  });
});

test("rejects missing or non-positive dimensions", () => {
  const result = parseDeliveryPackageDetails({
    packageCount: 1,
    totalWeightKg: 5,
    packageLengthCm: 0,
    packageWidthCm: 20,
    packageHeightCm: 20,
    sizeCategory: "SMALL",
  });

  assert.equal(result.data, null);
  assert.equal(result.error, "INVALID");
});
