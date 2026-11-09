import assert from "node:assert/strict";
import test from "node:test";
import {
  localBusinessDate,
  newMaterial,
  parseSupplyDraft,
  previousSupplyMonth,
  toSupplyDraft,
} from "./supply-draft";

test("empty prices and quantities are not silently saved as zero", () => {
  const material = newMaterial();
  material.name = "Мах";
  material.receipts = [
    {
      id: "r",
      date: "2026-11-01",
      quantity: "150",
      unitPrice: "",
      supplier: "",
    },
  ];
  assert.equal(parseSupplyDraft("2026-11", [material]).ok, false);
  material.receipts[0].unitPrice = "0";
  const parsed = parseSupplyDraft("2026-11", [material]);
  assert.equal(parsed.ok, true);
  if (parsed.ok)
    assert.deepEqual(toSupplyDraft(parsed.value.materials), [
      { ...material, identityLocked: true },
    ]);
  material.receipts[0].quantity = "";
  assert.equal(parseSupplyDraft("2026-11", [material]).ok, false);
});
test("month rollover and business dates use Ulaanbaatar time", () => {
  assert.equal(previousSupplyMonth("2026-01"), "2025-12");
  assert.equal(
    localBusinessDate(new Date("2026-10-31T16:30:00Z")),
    "2026-11-01",
  );
});

test("unit purchase prices preserve empty, known and free prices across save and reopen", () => {
  const draft = newMaterial();
  draft.name = "Мах";
  draft.openingQuantity = "60";
  draft.openingUnitPrice = "18000";
  const priced = parseSupplyDraft("2026-11", [draft]);
  assert.equal(priced.ok, true);
  if (priced.ok) {
    assert.equal(priced.value.materials[0].openingUnitPrice, 18000);
    assert.equal(
      toSupplyDraft(priced.value.materials)[0].openingUnitPrice,
      "18000",
    );
  }
  draft.openingUnitPrice = "";
  const empty = parseSupplyDraft("2026-11", [draft]);
  assert.equal(empty.ok, true);
  if (empty.ok) assert.equal(empty.value.materials[0].openingUnitPrice, null);
  draft.openingUnitPrice = "0";
  const free = parseSupplyDraft("2026-11", [draft]);
  assert.equal(free.ok, true);
  if (free.ok) assert.equal(free.value.materials[0].openingUnitPrice, 0);
});
