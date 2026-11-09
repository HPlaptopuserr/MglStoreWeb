import assert from "node:assert/strict";
import test from "node:test";
import { newMaterial } from "./supply-draft";
import {
  decodeSupplyDraftBackup,
  supplyDraftKey,
  supplyDraftSignature,
} from "./supply-draft-storage";

test("incomplete names, quantities and receipt fields survive backup and recovery", () => {
  const draft = {
    version: 3,
    materials: [
      {
        ...newMaterial(),
        openingQuantity: "",
        receipts: [
          {
            id: "receipt",
            date: "2026-11-09",
            quantity: "",
            unitPrice: "",
            supplier: "",
          },
        ],
      },
    ],
    posBindings: [],
  };
  assert.deepEqual(decodeSupplyDraftBackup(JSON.stringify(draft)), draft);
});
test("backups are isolated by user, organization and month", () => {
  const original = supplyDraftKey("user", "org", "2026-11");
  for (const key of [
    supplyDraftKey("other", "org", "2026-11"),
    supplyDraftKey("user", "other", "2026-11"),
    supplyDraftKey("user", "org", "2026-12"),
  ])
    assert.notEqual(key, original);
});
test("malformed backups are ignored rather than replacing the server response", () => {
  for (const raw of [
    null,
    "{",
    "null",
    JSON.stringify({ version: -1, materials: [], posBindings: [] }),
    JSON.stringify({ version: 1, materials: [{ id: "bad" }], posBindings: [] }),
    JSON.stringify({ version: 1, materials: [], posBindings: [{}] }),
  ])
    assert.equal(decodeSupplyDraftBackup(raw), null);
});
test("a save acknowledgment does not erase newer keystrokes or bindings", () => {
  const materials = [newMaterial()];
  const original = supplyDraftSignature(materials, []);
  assert.equal(
    supplyDraftSignature([{ ...materials[0], identityLocked: true }], []),
    original,
  );
  assert.notEqual(
    supplyDraftSignature([{ ...materials[0], openingQuantity: "12" }], []),
    original,
  );
  assert.notEqual(
    supplyDraftSignature(materials, [
      {
        productId: "product",
        materialId: materials[0].id,
        ingredientIndex: 0,
        ingredientName: "ingredient",
        unit: "kg",
      },
    ]),
    original,
  );
});
