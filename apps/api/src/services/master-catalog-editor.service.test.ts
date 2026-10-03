import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseCatalogEdit,
  updateCatalogRecord,
  type CatalogEditWriter,
} from "./master-catalog-editor.service";
const body = {
  canonicalName: "Сүү 1 л",
  barcode: "8650000000000",
  brand: "Брэнд",
  unit: "ш",
  categoryName: "Сүү",
  description: "Савлагаа: 1 л",
  imageUrl: null,
  updatedAt: "2026-09-30T00:00:00.000Z",
};
test("catalog edits whitelist shared fields and reject malformed content", () => {
  const parsed = parseCatalogEdit({
    ...body,
    price: 100,
    stock: 123,
    organizationId: "other",
    products: { updateMany: { name: "bad" } },
  });
  assert.equal(parsed.data.canonicalName, body.canonicalName);
  assert.ok(!("price" in parsed.data));
  assert.ok(!("stock" in parsed.data));
  assert.ok(!("products" in parsed.data));
  for (const patch of [
    { canonicalName: "" },
    { canonicalName: "123" },
    { brand: 42 },
    { imageUrl: "javascript:alert(1)" },
    { updatedAt: "bad" },
  ])
    assert.throws(() => parseCatalogEdit({ ...body, ...patch }));
});
test("renaming writes only the central record and retains the previous search alias", async () => {
  const calls: string[] = [];
  const tx = {
    masterProduct: {
      findUnique: async () => ({ id: "master", canonicalName: "Old Name" }),
      updateMany: async (args: { data: unknown; where: unknown }) => {
        calls.push("master");
        assert.deepEqual(args.data, parseCatalogEdit(body).data);
        assert.deepEqual(args.where, {
          id: "master",
          updatedAt: new Date(body.updatedAt),
        });
        return { count: 1 };
      },
    },
    masterProductAlias: {
      upsert: async (args: { create: { value: string } }) => {
        calls.push("alias");
        assert.equal(args.create.value, "Old Name");
      },
    },
  } as unknown as CatalogEditWriter;
  await updateCatalogRecord(tx, "master", parseCatalogEdit(body));
  assert.deepEqual(calls, ["master", "alias"]);
});
test("stale edits stop before alias changes", async () => {
  const tx = {
    masterProduct: {
      findUnique: async () => ({ id: "master", canonicalName: "Old" }),
      updateMany: async () => ({ count: 0 }),
    },
    masterProductAlias: {
      upsert: async () => {
        assert.fail("stale edit wrote alias");
      },
    },
  } as unknown as CatalogEditWriter;
  await assert.rejects(
    updateCatalogRecord(tx, "master", parseCatalogEdit(body)),
    /Өөр админ/,
  );
});
