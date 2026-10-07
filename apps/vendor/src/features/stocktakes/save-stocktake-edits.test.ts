import test from "node:test";
import assert from "node:assert/strict";
import type { StocktakeDetail } from "@mgl/types";
import { saveStocktakeEdits } from "./save-stocktake-edits";

const session: StocktakeDetail = {
  id: "s",
  title: "Count",
  kind: "FULL",
  status: "DRAFT",
  warehouseId: null,
  warehouse: null,
  version: 4,
  createdAt: "",
  approvedAt: null,
  createdById: "u",
  approvedById: null,
  lines: [],
};
const edits = Array.from({ length: 501 }, (_, i) => ({
  id: String(i),
  counted: i,
  note: "",
}));

test("save uses each returned version before adding a product", async () => {
  const versions: number[] = [];
  const sizes: number[] = [];
  const result = await saveStocktakeEdits(
    session,
    edits,
    async (version, batch) => {
      versions.push(version);
      sizes.push(batch.length);
      return { ...session, version: version + 1 };
    },
    () => {},
  );
  assert.deepEqual(versions, [4, 5]);
  assert.deepEqual(sizes, [500, 1]);
  assert.equal(result.version, 6);
});

test("partial save failure only acknowledges persisted edits", async () => {
  const saved: string[] = [];
  await assert.rejects(
    saveStocktakeEdits(
      session,
      edits,
      async (version) => {
        if (version === 5) throw new Error("offline");
        return { ...session, version: version + 1 };
      },
      (_, batch) => saved.push(...batch.map((row) => row.id)),
    ),
    /offline/,
  );
  assert.equal(saved.length, 500);
  assert.equal(saved.includes("500"), false);
});

test("no pending edits preserves the current version without a request", async () => {
  const result = await saveStocktakeEdits(
    session,
    [],
    async () => {
      assert.fail("unexpected request");
    },
    () => assert.fail("unexpected acknowledgement"),
  );
  assert.equal(result, session);
});
