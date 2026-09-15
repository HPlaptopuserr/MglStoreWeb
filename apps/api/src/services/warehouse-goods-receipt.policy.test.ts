import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWarehouseGoodsReceiptInput } from "./warehouse-goods-receipt.policy";

test("parses a complete warehouse goods receipt", () => {
  const result = parseWarehouseGoodsReceiptInput({
    warehouseId: "warehouse-1",
    supplierName: "Нийлүүлэгч",
    supplierDocumentNumber: "INV-001",
    documentDate: "2026-09-15",
    confirm: true,
    items: [{ productId: "product-1", quantity: 19, unitCost: 3300 }],
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.items[0].quantity, 19);
    assert.equal(result.data.confirm, true);
  }
});

test("rejects invalid receipt quantities and costs", () => {
  for (const item of [
    { productId: "p", quantity: 0, unitCost: 1 },
    { productId: "p", quantity: 1.5, unitCost: 1 },
    { productId: "p", quantity: 1, unitCost: -1 },
  ]) {
    assert.equal(
      parseWarehouseGoodsReceiptInput({
        warehouseId: "w",
        supplierName: "s",
        items: [item],
      }).success,
      false,
    );
  }
});
