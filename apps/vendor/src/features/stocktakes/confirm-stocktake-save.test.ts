import test from "node:test";
import assert from "node:assert/strict";
import type { StocktakeDetail } from "@mgl/types";
import { confirmStocktakeSave } from "./confirm-stocktake-save";
const edit = { id: "line", counted: 0, note: "  empty  " };
const saved: StocktakeDetail = {
  id: "s",
  title: "Count",
  kind: "FULL",
  status: "DRAFT",
  warehouseId: null,
  warehouse: null,
  version: 5,
  createdAt: "",
  approvedAt: null,
  createdById: "u",
  approvedById: null,
  lines: [
    {
      id: "line",
      productId: "p",
      name: "Item",
      barcode: "123",
      barcodeAliases: [],
      unit: "pcs",
      expected: 9,
      counted: 0,
      note: "empty",
      countedAt: null,
      countedById: null,
    },
  ],
};
const failure = new Error("response lost");
const fail = async (): Promise<StocktakeDetail> => {
  throw failure;
};
test("successful writes do not require a second read", async () => {
  assert.equal(
    await confirmStocktakeSave(4, [edit], async () => saved, fail),
    saved,
  );
});
test("lost response recovers confirmed zero and trimmed note without replay", async () => {
  let writes = 0;
  assert.equal(
    await confirmStocktakeSave(
      4,
      [edit],
      async () => {
        writes++;
        throw failure;
      },
      async () => saved,
    ),
    saved,
  );
  assert.equal(writes, 1);
});
for (const [name, current] of [
  ["newer concurrent version", { ...saved, version: 6 }],
  ["unchanged version", { ...saved, version: 4 }],
  [
    "different count",
    { ...saved, lines: [{ ...saved.lines[0]!, counted: 1 }] },
  ],
  [
    "uncounted is not zero",
    { ...saved, lines: [{ ...saved.lines[0]!, counted: null }] },
  ],
  [
    "different note",
    { ...saved, lines: [{ ...saved.lines[0]!, note: "other" }] },
  ],
  ["missing row", { ...saved, lines: [] }],
] satisfies [string, StocktakeDetail][]) {
  test(`does not accept ${name}`, async () => {
    await assert.rejects(
      confirmStocktakeSave(4, [edit], fail, async () => current),
      failure,
    );
  });
}
test("offline reconciliation preserves original error", async () => {
  await assert.rejects(confirmStocktakeSave(4, [edit], fail, fail), failure);
});
