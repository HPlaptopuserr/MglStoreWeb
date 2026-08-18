import assert from "node:assert/strict";
import test from "node:test";
import { parsePosGoodsReceiptInput } from "./goods-receipt";

test("accepts a free-form supplier organization and combines the same lot", () => {
  const result = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Дурын Нийлүүлэгч ХХК",
    supplierRegisterNo: "1234567",
    documentNo: "ПАД-42",
    items: [
      {
        productId: "product-1",
        quantity: 2,
        batchNumber: "LOT-1",
        expiryDate: "2027-04-30",
      },
      {
        productId: "product-1",
        quantity: 3,
        batchNumber: "LOT-1",
        expiryDate: "2027-04-30",
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.supplierName, "Дурын Нийлүүлэгч ХХК");
  assert.deepEqual(result.value.items, [
    {
      productId: "product-1",
      quantity: 5,
      batchNumber: "LOT-1",
      expiryDate: new Date("2027-04-30T00:00:00.000Z"),
    },
  ]);
});

test("keeps different expiry dates as separate lots for the same product", () => {
  const result = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [
      { productId: "product-1", quantity: 2, expiryDate: "2027-04-30" },
      { productId: "product-1", quantity: 3, expiryDate: "2027-06-30" },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.items.length, 2);
  assert.deepEqual(
    result.value.items.map((item) => item.expiryDate?.toISOString()),
    ["2027-04-30T00:00:00.000Z", "2027-06-30T00:00:00.000Z"],
  );
});

test("requires supplier, register and at least one valid product line", () => {
  assert.deepEqual(parsePosGoodsReceiptInput({ items: [] }), {
    ok: false,
    message: "POS касс сонгогдоогүй байна",
  });

  const invalidQuantity = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Нийлүүлэгч",
    items: [{ productId: "product-1", quantity: 0 }],
  });
  assert.equal(invalidQuantity.ok, false);

  const invalidExpiryDate = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [{ productId: "product-1", quantity: 1, expiryDate: "2027-02-30" }],
  });
  assert.equal(invalidExpiryDate.ok, false);
});
