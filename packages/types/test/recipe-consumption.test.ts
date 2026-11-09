import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzePosRecipeConsumption,
  calculateRecipeConsumption,
} from "../src/domain/recipe-consumption";
import type { ProductRecipe } from "../src/domain/product-recipe";
const recipe: ProductRecipe = {
  kind: "FOOD",
  yieldQuantity: 1,
  servingLabel: "1 порц",
  laborCost: 0,
  overheadCost: 0,
  instructions: "",
  ingredients: [
    {
      name: "Мах",
      quantity: 200,
      unit: "g",
      packageQuantity: 1,
      packageUnit: "kg",
      packagePrice: null,
    },
    {
      name: "Будаа",
      quantity: 150,
      unit: "g",
      packageQuantity: 1,
      packageUnit: "kg",
      packagePrice: null,
    },
    {
      name: "Тос",
      quantity: 20,
      unit: "ml",
      packageQuantity: 1,
      packageUnit: "l",
      packagePrice: null,
    },
  ],
};
const materials = [
  { id: "meat", name: "Хонины мах", unit: "kg" as const },
  { id: "rice", name: "Будаа", unit: "kg" as const },
  { id: "oil", name: "Тос", unit: "l" as const },
];
const bindings = materials.map((material, ingredientIndex) => ({
  materialId: material.id,
  ingredientIndex,
}));
test("50 portions deduct 10 kg meat, 7.5 kg rice and 1 L oil without requiring cost prices", () => {
  const result = calculateRecipeConsumption(recipe, 50, materials, bindings);
  assert.equal(result.ok, true);
  if (result.ok)
    assert.deepEqual(
      result.lines.map((line) => [line.materialId, line.quantity]),
      [
        ["meat", 10],
        ["rice", 7.5],
        ["oil", 1],
      ],
    );
});
test("batch yield prevents treating the complete recipe as a single portion", () => {
  const result = calculateRecipeConsumption(
    { ...recipe, yieldQuantity: 10 },
    50,
    materials,
    bindings,
  );
  assert.equal(result.ok, true);
  if (result.ok)
    assert.deepEqual(
      result.lines.map((line) => line.quantity),
      [1, 0.75, 0.1],
    );
});
test("missing, duplicate, foreign and incompatible material bindings are rejected", () => {
  for (const links of [
    bindings.slice(0, 2),
    [bindings[0], bindings[0], bindings[2]],
    [{ ingredientIndex: 0, materialId: "unknown" }, ...bindings.slice(1)],
    [{ ingredientIndex: 0, materialId: "oil" }, ...bindings.slice(1)],
  ])
    assert.equal(
      calculateRecipeConsumption(recipe, 50, materials, links).ok,
      false,
    );
});
test("invalid portion counts are rejected and recipe allocations preserve fractional quantities", () => {
  for (const count of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    assert.equal(
      calculateRecipeConsumption(recipe, count, materials, bindings).ok,
      false,
    );
  const cupRecipe: ProductRecipe = {
    ...recipe,
    ingredients: [
      {
        name: "Аяга",
        unit: "pcs",
        quantity: 1,
        packageQuantity: 1,
        packageUnit: "pcs",
        packagePrice: 0,
      },
    ],
  };
  assert.equal(
    calculateRecipeConsumption(
      cupRecipe,
      0.5,
      [{ id: "cup", name: "Аяга", unit: "pcs" }],
      [{ ingredientIndex: 0, materialId: "cup" }],
    ).ok,
    true,
  );
});

test("POS recipe deduction uses explicit material identities and exposes unmapped recipes", async () => {
  const { analyzePosRecipeConsumption } =
    await import("../src/domain/recipe-consumption");
  const { summarizeSupplyMonth } =
    await import("../src/domain/restaurant-supply");
  const bound = recipe.ingredients.map((ingredient, index) => ({
    productId: "food",
    ingredientIndex: index,
    ingredientName: ingredient.name,
    materialId: materials[index].id,
    unit: materials[index].unit,
  }));
  const stocks = materials.map((material) => ({
    ...material,
    openingQuantity: 150,
    receipts: [],
    usages: [],
  }));
  const source = [
    {
      productId: "food",
      productName: "Хоол",
      recipeVersion: 1,
      recipe,
      servings: 50,
      bindings: null,
    },
  ];
  const analysis = analyzePosRecipeConsumption(stocks, bound, source);
  assert.deepEqual(analysis.issues, []);
  assert.deepEqual(
    summarizeSupplyMonth({ materials: stocks }, analysis.consumptions).map(
      (row) => row.remainingQuantity,
    ),
    [140, 142.5, 149],
  );
  assert.equal(
    analyzePosRecipeConsumption(stocks, bound.slice(0, 2), source).issues
      .length,
    1,
  );
  assert.equal(
    analyzePosRecipeConsumption(stocks, bound.slice(0, 2), source).consumptions
      .length,
    0,
  );
});

test("business month boundaries include the local first day and exclude the next month", async () => {
  const { supplyMonthUtcRange } =
    await import("../src/domain/recipe-consumption");
  const range = supplyMonthUtcRange("2026-11");
  assert.equal(range.from.toISOString(), "2026-10-31T16:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-11-30T16:00:00.000Z");
  assert.equal(
    supplyMonthUtcRange("2026-12").to.toISOString(),
    "2026-12-31T16:00:00.000Z",
  );
});

test("recipe-selected supply identities deduct each ingredient without monthly mappings", () => {
  const selectedRecipe = structuredClone(recipe);
  selectedRecipe.ingredients.forEach((ingredient, index) => {
    ingredient.materialId = materials[index].id;
  });
  const result = analyzePosRecipeConsumption(
    materials,
    [],
    [
      {
        productId: "food",
        productName: "Цуйван",
        recipeVersion: 1,
        servings: 50,
        recipe: selectedRecipe,
        bindings: null,
      },
    ],
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.consumptions[0].lines.map((line) => line.quantity),
    [10, 7.5, 1],
  );
});
