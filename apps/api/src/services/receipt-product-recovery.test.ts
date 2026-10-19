import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@mgl/database";
import { recoverReceiptProducts } from "./receipt-product-recovery";
import {
  parsePosGoodsReceiptInput,
  type PosGoodsReceiptLine,
} from "../routes/operations/pos/goods-receipt";

type Product = {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  supplyType: string;
};
function fixture(existing: Product | null = null, matches: Product[] = []) {
  const calls: { method: string; args: Record<string, unknown> }[] = [];
  const tx = {
    product: {
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ method: "findFirst", args });
        return existing;
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ method: "findMany", args });
        return matches;
      },
      create: async (args: Record<string, unknown>) => {
        calls.push({ method: "create", args });
        return {
          id: `new-${calls.length}`,
          name: "Oil",
          unit: "pcs",
          isActive: true,
          supplyType: "IN_STOCK",
        };
      },
      update: async (args: Record<string, unknown>) => {
        calls.push({ method: "update", args });
        return existing;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, calls };
}
function line(id = "old"): PosGoodsReceiptLine {
  return {
    productId: id,
    productSnapshot: {
      name: "Oil",
      barcode: `88-${id}`,
      unit: "pcs",
      price: 5000,
    },
    quantity: 2,
    unitCost: 3000,
    batchNumber: null,
    expiryDate: null,
  };
}
const current: Product = {
  id: "current",
  name: "Oil",
  unit: "pcs",
  isActive: true,
  supplyType: "IN_STOCK",
};

test("88 stale draft lines create only authorized store products without changing quantities", async () => {
  const { tx, calls } = fixture();
  const items = Array.from({ length: 88 }, (_, i) => line(`old-${i}`));
  await recoverReceiptProducts(tx, "ub-oil", items);
  assert.equal(calls.filter((c) => c.method === "create").length, 88);
  assert.equal(
    items.reduce((n, i) => n + i.quantity, 0),
    176,
  );
  for (const call of calls) {
    const scope = (call.args.where ?? call.args.data) as Record<
      string,
      unknown
    >;
    assert.equal(scope.organizationId, "ub-oil");
    if (call.args.where) assert.equal(scope.managedByWarehouseId, null);
  }
});
test("stale barcode resolves to the current store product", async () => {
  const { tx, calls } = fixture(null, [current]);
  const items = [line()];
  await recoverReceiptProducts(tx, "ub-oil", items);
  assert.equal(items[0].productId, "current");
  assert.equal(
    calls.some((c) => c.method === "create"),
    false,
  );
});
test("separate lots reuse recovered product and keep each lot", async () => {
  const { tx, calls } = fixture();
  const items = [line(), { ...line(), batchNumber: "lot-2" }];
  await recoverReceiptProducts(tx, "ub-oil", items);
  assert.equal(items[0].productId, items[1].productId);
  assert.equal(items[1].batchNumber, "lot-2");
  assert.equal(calls.filter((c) => c.method === "create").length, 1);
});
test("owned inactive products become stock products on receipt", async () => {
  const { tx, calls } = fixture({ ...current, isActive: false });
  await recoverReceiptProducts(tx, "ub-oil", [line()]);
  assert.deepEqual(calls.find((c) => c.method === "update")?.args.data, {
    isActive: true,
    supplyType: "IN_STOCK",
  });
});
test("ambiguous barcode and changed units cannot silently receive the wrong stock", async () => {
  const ambiguous = fixture(null, [current, { ...current, id: "other" }]);
  await assert.rejects(
    recoverReceiptProducts(ambiguous.tx, "ub-oil", [line()]),
    /давхар/,
  );
  const changed = fixture({ ...current, unit: "kg" });
  await assert.rejects(
    recoverReceiptProducts(changed.tx, "ub-oil", [line()]),
    /нэгж/,
  );
});
test("missing prices are not invented for newly registered products", async () => {
  const { tx } = fixture();
  const item = line();
  delete item.productSnapshot!.price;
  await assert.rejects(
    recoverReceiptProducts(tx, "ub-oil", [item]),
    /Oil.*зарах үнийг/,
  );
});
test("snapshot parser accepts existing drafts and rejects invalid prices and units", () => {
  const body = { registerId: "r", supplierName: "supplier", items: [line()] };
  assert.equal(parsePosGoodsReceiptInput(body).ok, true);
  for (const snapshot of [
    { name: "Oil", unit: "litre" },
    { name: "Oil", unit: "pcs", price: -1 },
  ]) {
    assert.equal(
      parsePosGoodsReceiptInput({
        ...body,
        items: [{ ...line(), productSnapshot: snapshot }],
      }).ok,
      false,
    );
  }
});
