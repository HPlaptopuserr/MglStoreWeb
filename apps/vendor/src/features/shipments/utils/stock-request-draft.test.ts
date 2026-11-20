import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyStockRequestDraft,
  readStockRequestDraft,
  saveStockRequestDraft,
  stockRequestDraftKey,
  type DraftStorage,
  type StockRequestDraft,
} from "./stock-request-draft";

function storage(): DraftStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
const user = { id: "owner", organizationId: "store" };
const draft: StockRequestDraft = {
  cart: [
    {
      productId: "water",
      name: "Ус",
      quantity: 12,
      available: 100,
      price: "1650.50",
      sku: "00012",
      image: null,
    },
  ],
  deliveryAddress: "БЗД, 26-р хороо",
  deliveryPhone: "99112233",
  note: "Орой хүргэх",
};

test("leaving and reopening a warehouse restores quantities and delivery details", () => {
  const disk = storage();
  const key = stockRequestDraftKey(user, "central");
  saveStockRequestDraft(disk, key, draft);
  const restored = readStockRequestDraft(
    disk,
    stockRequestDraftKey({ ...user }, "central"),
  );
  assert.deepEqual(restored, draft);
  restored.cart[0].quantity = 3;
  assert.equal(readStockRequestDraft(disk, key).cart[0].quantity, 12);
  saveStockRequestDraft(disk, key, restored);
  assert.equal(readStockRequestDraft(disk, key).cart[0].quantity, 3);
});

test("warehouses, organizations and accounts keep independent carts", () => {
  const disk = storage();
  saveStockRequestDraft(disk, stockRequestDraftKey(user, "central"), draft);
  for (const key of [
    stockRequestDraftKey(user, "hypermarket"),
    stockRequestDraftKey({ ...user, organizationId: "other" }, "central"),
    stockRequestDraftKey({ ...user, id: "other" }, "central"),
    stockRequestDraftKey(null, "central"),
    stockRequestDraftKey(user, null),
  ])
    assert.deepEqual(
      readStockRequestDraft(disk, key),
      emptyStockRequestDraft(),
    );
  assert.notEqual(
    stockRequestDraftKey({ id: "a:b", organizationId: "c" }, "d"),
    stockRequestDraftKey({ id: "a", organizationId: "b:c" }, "d"),
  );
});

test("successful submission removes only its draft and reopening never restores submitted lines", () => {
  const disk = storage();
  const key = stockRequestDraftKey(user, "central");
  const other = stockRequestDraftKey(user, "hypermarket");
  saveStockRequestDraft(disk, key, draft);
  saveStockRequestDraft(disk, other, draft);
  saveStockRequestDraft(disk, key, emptyStockRequestDraft());
  assert.equal(disk.getItem(key), null);
  assert.deepEqual(readStockRequestDraft(disk, key), emptyStockRequestDraft());
  assert.deepEqual(readStockRequestDraft(disk, other), draft);
});

test("corrupt or unsafe persisted lines are rejected without overwriting the saved data", () => {
  const disk = storage();
  for (const raw of [
    "not json",
    JSON.stringify({ version: 2, draft }),
    ...[
      { quantity: 0 },
      { quantity: 1.5 },
      { price: "NaN" },
      { available: -1 },
      { productId: "" },
    ].map((patch) =>
      JSON.stringify({
        version: 1,
        draft: { ...draft, cart: [{ ...draft.cart[0], ...patch }] },
      }),
    ),
    JSON.stringify({
      version: 1,
      draft: { ...draft, cart: [draft.cart[0], draft.cart[0]] },
    }),
  ]) {
    disk.setItem("draft", raw);
    assert.throws(() => readStockRequestDraft(disk, "draft"));
    assert.equal(disk.getItem("draft"), raw);
  }
});

test("browser storage errors surface to the caller and missing identity never writes a cart", () => {
  const disk: DraftStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.throws(() => readStockRequestDraft(disk, "key"), /blocked/);
  assert.throws(() => saveStockRequestDraft(disk, "key", draft), /quota/);
  assert.deepEqual(readStockRequestDraft(disk, ""), emptyStockRequestDraft());
  assert.doesNotThrow(() => saveStockRequestDraft(disk, "", draft));
});
