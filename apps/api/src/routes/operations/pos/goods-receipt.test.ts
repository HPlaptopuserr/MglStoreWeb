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
        unitCost: 3000,
      },
      {
        productId: "product-1",
        quantity: 3,
        batchNumber: "LOT-1",
        expiryDate: "2027-04-30",
        unitCost: 3000,
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
      unitCost: 3000,
    },
  ]);
});

test("keeps different expiry dates as separate lots for the same product", () => {
  const result = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [
      {
        productId: "product-1",
        quantity: 2,
        expiryDate: "2027-04-30",
        unitCost: 3000,
      },
      {
        productId: "product-1",
        quantity: 3,
        expiryDate: "2027-06-30",
        unitCost: 3200,
      },
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

test("keeps different purchase costs as separate lots", () => {
  const result = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [
      { productId: "product-1", quantity: 10, unitCost: 3000 },
      { productId: "product-1", quantity: 10, unitCost: 3200 },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.value.items.map((item) => item.unitCost),
    [3000, 3200],
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
    items: [{ productId: "product-1", quantity: 0, unitCost: 3000 }],
  });
  assert.equal(invalidQuantity.ok, false);

  const invalidExpiryDate = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [
      {
        productId: "product-1",
        quantity: 1,
        expiryDate: "2027-02-30",
        unitCost: 3000,
      },
    ],
  });
  assert.equal(invalidExpiryDate.ok, false);

  const missingUnitCost = parsePosGoodsReceiptInput({
    registerId: "register-1",
    supplierName: "Supplier",
    items: [{ productId: "product-1", quantity: 1 }],
  });
  assert.equal(missingUnitCost.ok, false);
});

test("keeps optional sale prices and rejects conflicting prices across lots", () => {
  const line = { productId: "p", quantity: 1, unitCost: 100, salePrice: 130 };
  const parse = (items: unknown[]) =>
    parsePosGoodsReceiptInput({ registerId: "r", supplierName: "s", items });
  const result = parse([line, { ...line, batchNumber: "second" }]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.items[0].salePrice, 130);
  assert.equal(
    parse([line, { ...line, batchNumber: "second", salePrice: 140 }]).ok,
    false,
  );
  for (const salePrice of [-1, NaN, Infinity, 1_000_000_001, null, ""]) {
    assert.equal(parse([{ ...line, salePrice }]).ok, false);
  }
  const optional = parse([{ productId: "p", quantity: 1, unitCost: 100 }]);
  assert.equal(optional.ok, true);
  if (optional.ok) assert.equal(optional.value.items[0].salePrice, undefined);
});

test("catalog receipt preserves explicit source and requires selling price", () => {
  const body = { registerId: "register-1", supplierName: "Supplier", items: [{ masterProductId: "master-1", quantity: 2, unitCost: 100, salePrice: 150 }] };
  const result = parsePosGoodsReceiptInput(body);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.items[0].masterProductId, "master-1");
    assert.equal(result.value.items[0].productId, "catalog:master-1");
  }
  assert.equal(parsePosGoodsReceiptInput({ ...body, items: [{ ...body.items[0], salePrice: undefined }] }).ok, false);
  assert.equal(parsePosGoodsReceiptInput({ ...body, items: [{ ...body.items[0], productId: "other" }] }).ok, false);
});
