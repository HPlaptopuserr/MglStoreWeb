import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRecipeCost,
  parseProductRecipe,
  type ProductRecipe,
} from "../src/domain/product-recipe";

const recipe = (): ProductRecipe => ({
  kind: "COFFEE",
  yieldQuantity: 1,
  servingLabel: "1 аяга",
  laborCost: 0,
  overheadCost: 0,
  instructions: "",
  ingredients: [
    {
      name: "Coffee",
      quantity: 17.7,
      unit: "g",
      packageQuantity: 1,
      packageUnit: "kg",
      packagePrice: 50000,
    },
    {
      name: "Milk",
      quantity: 250,
      unit: "ml",
      packageQuantity: 1,
      packageUnit: "l",
      packagePrice: 4800,
    },
    {
      name: "Cup",
      quantity: 1,
      unit: "pcs",
      packageQuantity: 100,
      packageUnit: "pcs",
      packagePrice: 32000,
    },
  ],
});
test("mass, volume and packaging use matching dimensions and whole-tugrik inputs", () => {
  const parsed = parseProductRecipe(recipe());
  assert.equal(parsed.ok, true);
  const cost = calculateRecipeCost(recipe());
  assert.deepEqual(cost.lineCosts, [885, 1200, 320]);
  assert.equal(cost.unitCost, 2405);
});
test("batch yield shares ingredient, labor and overhead cost across products", () => {
  const value = recipe();
  value.yieldQuantity = 5;
  value.laborCost = 500;
  value.overheadCost = 95;
  const cost = calculateRecipeCost(value);
  assert.equal(cost.batchCost, 3000);
  assert.equal(cost.unitCost, 600);
});
test("missing prices remain unknown; a known free ingredient is zero", () => {
  const value = recipe();
  value.ingredients[0].packagePrice = null;
  value.ingredients[1].packagePrice = 0;
  const cost = calculateRecipeCost(value);
  assert.deepEqual(cost.lineCosts, [null, 0, 320]);
  assert.equal(cost.missingPriceCount, 1);
  assert.equal(cost.knownIngredientsCost, 320);
  assert.equal(cost.batchCost, null);
  assert.equal(cost.unitCost, null);
});
test("invalid units, empty data, non-finite values and fractional pieces are rejected", () => {
  for (const value of [
    null,
    {},
    { ...recipe(), yieldQuantity: 0 },
    { ...recipe(), yieldQuantity: Number.POSITIVE_INFINITY },
    { ...recipe(), ingredients: [] },
    { ...recipe(), ingredients: Array(101).fill(recipe().ingredients[0]) },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[0], packageUnit: "ml" }],
    },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[2], quantity: 0.5 }],
    },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[0], packagePrice: -1 }],
    },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[0], quantity: "17.7" }],
    },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[0], packageQuantity: 0 }],
    },
    {
      ...recipe(),
      ingredients: [{ ...recipe().ingredients[0], packageQuantity: 1e-300 }],
    },
  ])
    assert.equal(parseProductRecipe(value).ok, false);
});
test("extreme per-unit costs cannot overflow or become Infinity", () => {
  assert.equal(
    parseProductRecipe({ ...recipe(), yieldQuantity: 0.000001 }).ok,
    false,
  );
});
test("cent totals equal the sum of displayed ingredient costs", () => {
  const value = recipe();
  value.ingredients = Array.from({ length: 3 }, () => ({
    name: "Small",
    quantity: 1,
    unit: "g",
    packageQuantity: 2,
    packageUnit: "g",
    packagePrice: 0.01,
  }));
  assert.deepEqual(calculateRecipeCost(value).lineCosts, [0.01, 0.01, 0.01]);
  assert.equal(calculateRecipeCost(value).batchCost, 0.03);
});
