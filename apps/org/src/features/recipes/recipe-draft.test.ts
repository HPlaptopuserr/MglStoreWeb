import assert from "node:assert/strict";
import test from "node:test";
import { calculateRecipeCost } from "@mgl/types";
import {
  newRecipeDraft,
  parseRecipeDraft,
  toRecipeDraft,
  withSupplyPrices,
} from "./recipe-draft";
import { RECIPE_TEMPLATES } from "./recipe-templates";

test("incomplete form is not coerced into a zero-cost recipe", () => {
  const draft = newRecipeDraft();
  assert.equal(parseRecipeDraft(draft).ok, false);
  Object.assign(draft.ingredients[0], {
    name: "Milk",
    quantity: "200",
    packageQuantity: "1000",
    packagePrice: "",
  });
  const parsed = parseRecipeDraft(draft);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(calculateRecipeCost(parsed.value).unitCost, null);
  draft.ingredients[0].quantity = "";
  assert.equal(parseRecipeDraft(draft).ok, false);
});
test("all four workbook examples preserve amounts and convert thousand-MNT prices", () => {
  assert.equal(RECIPE_TEMPLATES.length, 4);
  assert.deepEqual(
    RECIPE_TEMPLATES.map(
      (template) => calculateRecipeCost(template.recipe).unitCost,
    ),
    [4849.23, 4439.23, 5165.4, 5907.75],
  );
  for (const template of RECIPE_TEMPLATES) {
    const parsed = parseRecipeDraft(toRecipeDraft(template.recipe));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.value, template.recipe);
  }
});
test("unknown price and confirmed zero price survive editor round trips", () => {
  const value = structuredClone(RECIPE_TEMPLATES[0].recipe);
  value.ingredients[0].packagePrice = null;
  value.ingredients[1].packagePrice = 0;
  const parsed = parseRecipeDraft(toRecipeDraft(value));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value, value);
});

test("ingredient name, amount and unit can be saved without purchase packaging or prices", () => {
  const draft = newRecipeDraft();
  Object.assign(draft.ingredients[0], {
    name: "Мах",
    quantity: "200",
    unit: "g",
  });
  const parsed = parseRecipeDraft(draft);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.ingredients[0].quantity, 200);
    assert.equal(parsed.value.ingredients[0].unit, "g");
    assert.equal(parsed.value.ingredients[0].packagePrice, null);
    assert.equal(calculateRecipeCost(parsed.value).unitCost, null);
  }
  draft.ingredients[0].packagePrice = "18000";
  assert.equal(
    parseRecipeDraft(draft).ok,
    false,
    "a known price requires its package size",
  );
  draft.ingredients[0].packageQuantity = "1";
  draft.ingredients[0].packageUnit = "kg";
  const priced = parseRecipeDraft(draft);
  assert.equal(priced.ok, true);
  if (priced.ok) assert.equal(calculateRecipeCost(priced.value).unitCost, 3600);
});

test("reopening a linked recipe refreshes supply prices without changing serving amounts", () => {
  const draft = newRecipeDraft();
  Object.assign(draft.ingredients[0], {
    materialId: "meat",
    name: "Хонь",
    quantity: "200",
    unit: "g",
  });
  const refreshed = withSupplyPrices(draft, [
    { id: "meat", name: "Хонь", unit: "kg", unitPrice: 18000 },
  ]);
  assert.equal(refreshed.ingredients[0].quantity, "200");
  const parsed = parseRecipeDraft(refreshed);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(calculateRecipeCost(parsed.value).unitCost, 3600);
  const updated = parseRecipeDraft(
    withSupplyPrices(refreshed, [
      { id: "meat", name: "Хонь", unit: "kg", unitPrice: 20000 },
    ]),
  );
  assert.equal(updated.ok, true);
  if (updated.ok)
    assert.equal(calculateRecipeCost(updated.value).unitCost, 4000);
  const unknown = parseRecipeDraft(
    withSupplyPrices(refreshed, [
      { id: "meat", name: "Хонь", unit: "kg", unitPrice: null },
    ]),
  );
  assert.equal(unknown.ok, true);
  if (unknown.ok)
    assert.equal(calculateRecipeCost(unknown.value).unitCost, null);
});
