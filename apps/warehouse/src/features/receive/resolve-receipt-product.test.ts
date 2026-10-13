import assert from "node:assert/strict";
import test from "node:test";
import {
  findReceiptProduct,
  resolveReceiptItem,
  type ReceiptProductIdentity,
} from "./resolve-receipt-product";
import type { ReceiveItem } from "./receipt-types";

const item: ReceiveItem = {
  productId: "draft-1",
  name: "Сүү",
  sku: null,
  quantity: 14,
  cost: 3200,
  batchNumber: "LOT-1",
  expiryDate: "2027-01-01",
  location: "A-2",
  draftProduct: { barcode: "001234", price: "4000" },
};
const product: ReceiptProductIdentity = {
  id: "existing-1",
  name: "Сүү 1л",
  sku: "MILK-1",
  barcode: "001234",
  unit: "pcs",
};

test("looks up an exact barcode, preserving leading zeros", async () => {
  const found = await findReceiptProduct("/products", item, async (url) => {
    assert.equal(
      new URL(url, "http://localhost").searchParams.get("barcode"),
      "001234",
    );
    return Response.json([product]);
  });
  assert.deepEqual(found, product);
});

test("preserves receipt quantities, costs and batch metadata when reusing a product", () => {
  const resolved = resolveReceiptItem(item, product);
  assert.equal(resolved.productId, product.id);
  assert.equal(resolved.draftProduct, undefined);
  assert.equal(resolved.name, product.name);
  for (const field of [
    "quantity",
    "cost",
    "batchNumber",
    "expiryDate",
    "location",
  ] as const) {
    assert.equal(resolved[field], item[field]);
  }
});

test("supports barcode aliases and rejects fuzzy matches from older APIs", async () => {
  assert.equal(
    await findReceiptProduct("/products", item, async () =>
      Response.json([{ ...product, barcode: "0012345" }]),
    ),
    null,
  );
  const alias = { ...product, barcode: "999", barcodeAliases: ["001234"] };
  assert.deepEqual(
    await findReceiptProduct("/products", item, async () =>
      Response.json([alias]),
    ),
    alias,
  );
});

test("does not silently choose an ambiguous barcode", async () => {
  await assert.rejects(
    findReceiptProduct("/products", item, async () =>
      Response.json([product, { ...product, id: "other" }]),
    ),
    /хэд хэдэн/,
  );
});

test("lookup failures stop registration instead of assuming the product is new", async () => {
  await assert.rejects(
    findReceiptProduct(
      "/products",
      item,
      async () => new Response(null, { status: 500 }),
    ),
    /шалгаж чадсангүй/,
  );
});

test("master identity must agree and a name-only draft skips lookup", async () => {
  const masterItem = {
    ...item,
    draftProduct: { barcode: "", price: "4000", masterProductId: "master-1" },
  };
  assert.equal(
    await findReceiptProduct("/products", masterItem, async () =>
      Response.json([product]),
    ),
    null,
  );
  const linked = { ...product, masterProductId: "master-1" };
  assert.deepEqual(
    await findReceiptProduct("/products", masterItem, async () =>
      Response.json([linked]),
    ),
    linked,
  );
  assert.equal(
    await findReceiptProduct(
      "/products",
      { ...item, draftProduct: { barcode: "", price: "4000" } },
      async () => {
        throw new Error("Should not query by name");
      },
    ),
    null,
  );
});
