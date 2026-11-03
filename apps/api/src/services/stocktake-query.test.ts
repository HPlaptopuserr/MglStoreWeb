import assert from "node:assert/strict";
import test from "node:test";
import { presentStocktakeLine } from "./stocktake-query";

test("stocktake responses expose current searchable product metadata", () => {
  const line = presentStocktakeLine({
    name: "Old snapshot name",
    barcode: "old-barcode",
    barcodeAliases: ["old-alias"],
    product: {
      name: "Cotton candy",
      sku: "CANDY-001",
      barcode: "8809931430571",
      barcodeAliases: ["current-alias"],
    },
  });

  assert.equal(line.name, "Cotton candy");
  assert.equal(line.barcode, "8809931430571");
  assert.deepEqual(line.barcodeAliases, [
    "old-alias",
    "CANDY-001",
    "8809931430571",
    "current-alias",
  ]);
});
