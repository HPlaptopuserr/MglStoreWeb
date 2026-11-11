import assert from "node:assert/strict";
import test from "node:test";
import { receiptItemPayload } from "./receipt-item-payload";
import type { ReceiptLine } from "./receipt-types";

const line: ReceiptLine = {
  id: "line-1",
  product: { id: "product-1", name: "Сүү", stock: 0, price: 5000, unit: "kg" },
  quantity: 0.5,
  unitCost: "3000",
  salePrice: "6000",
  manualPrice: true,
  batchNumber: " LOT-1 ",
  expiryDate: "2026-12-01",
};

test("cashier receipt omits all product mutations even from a restored priced draft", () => {
  const payload = JSON.parse(
    JSON.stringify(receiptItemPayload(line, false)),
  ) as Record<string, unknown>;
  assert.deepEqual(payload, {
    productId: "product-1",
    quantity: 500,
    unitCost: 3000,
    batchNumber: "LOT-1",
    expiryDate: "2026-12-01",
  });
});

test("cashiers cannot adopt catalog products from a saved draft", () => {
  const catalogLine = {
    ...line,
    product: {
      ...line.product,
      id: "catalog:master-1",
      masterProductId: "master-1",
    },
  };
  assert.throws(
    () => receiptItemPayload(catalogLine, false),
    /бүртгэлтэй барааг/,
  );
  const payload = receiptItemPayload(catalogLine, true);
  assert.ok("masterProductId" in payload);
  assert.equal(payload.masterProductId, "master-1");
  assert.equal(payload.salePrice, 6000);
  assert.equal("productId" in payload, false);
  assert.equal("productSnapshot" in payload, false);
});

test("owners retain price changes and product recovery snapshots", () => {
  const payload = receiptItemPayload(line, true);
  assert.equal(payload.salePrice, 6000);
  assert.deepEqual(payload.productSnapshot, {
    name: "Сүү",
    barcode: null,
    unit: "kg",
    price: 5000,
  });
  assert.equal(
    "salePrice" in receiptItemPayload({ ...line, salePrice: "" }, true),
    false,
  );
});
