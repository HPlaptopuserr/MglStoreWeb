import {
  parseProductRecipe,
  type ProductRecipe,
  type RecipeUnit,
} from "./product-recipe";
import type { SupplyUnit } from "./restaurant-supply";

export type RecipeMaterialBinding = {
  ingredientIndex: number;
  materialId: string;
};
export type RecipeSupplyMaterial = {
  id: string;
  name: string;
  unit: SupplyUnit;
};
export type RecipeConsumptionLine = {
  ingredientIndex: number;
  ingredientName: string;
  materialId: string;
  materialName: string;
  unit: SupplyUnit;
  quantity: number;
};
const conversion: Record<RecipeUnit, { unit: SupplyUnit; factor: number }> = {
  g: { unit: "kg", factor: 0.001 },
  kg: { unit: "kg", factor: 1 },
  ml: { unit: "l", factor: 0.001 },
  l: { unit: "l", factor: 1 },
  pcs: { unit: "pcs", factor: 1 },
};

/** Compute all ingredient quantities from a recipe batch yield; never infer material identity from names. */
export function calculateRecipeConsumption(
  recipe: ProductRecipe,
  servings: number,
  materials: readonly RecipeSupplyMaterial[],
  bindings: readonly RecipeMaterialBinding[],
):
  | { ok: true; lines: RecipeConsumptionLine[] }
  | { ok: false; message: string } {
  const parsed = parseProductRecipe(recipe);
  if (!parsed.ok) return parsed;
  if (!Number.isFinite(servings) || servings <= 0 || servings > 1000000)
    return {
      ok: false,
      message: "Гарсан хоолны тоо 0-ээс их, 1,000,000 хүртэл байна",
    };
  if (
    bindings.length !== recipe.ingredients.length ||
    new Set(bindings.map((binding) => binding.ingredientIndex)).size !==
      recipe.ingredients.length
  )
    return {
      ok: false,
      message: "Жорын орц бүрийг хангамжийн материалтай холбоно уу",
    };
  const byIndex = new Map(
    bindings.map((binding) => [binding.ingredientIndex, binding.materialId]),
  );
  const byId = new Map(materials.map((material) => [material.id, material]));
  const lines: RecipeConsumptionLine[] = [];
  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const material = byId.get(byIndex.get(index) || "");
    const normalized = conversion[ingredient.unit];
    if (!material)
      return {
        ok: false,
        message: `«${ingredient.name}» орцын хангамжийн материалыг сонгоно уу`,
      };
    if (material.unit !== normalized.unit)
      return {
        ok: false,
        message: `«${ingredient.name}» ба «${material.name}» материалын нэгж тохирохгүй байна`,
      };
    const raw =
      ((ingredient.quantity * normalized.factor) / recipe.yieldQuantity) *
      servings;
    const quantity = Math.round(raw * 1000000) / 1000000;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000)
      return {
        ok: false,
        message: `«${ingredient.name}» орцын хэмжээ хэт бага эсвэл их байна. Жор болон порцын тоогоо шалгана уу`,
      };
    lines.push({
      ingredientIndex: index,
      ingredientName: ingredient.name,
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      quantity,
    });
  }
  return { ok: true, lines };
}

export type RecipeSaleSource = {
  productId: string;
  productName: string;
  recipeVersion: number;
  recipe: ProductRecipe;
  servings: number;
  bindings: SupplyPosBinding[] | null;
};
export type SupplyPosBinding = {
  unit: SupplyUnit;
  productId: string;
  ingredientIndex: number;
  ingredientName: string;
  materialId: string;
};
export type RecipeSaleConsumption = {
  productId: string;
  productName: string;
  recipeVersion: number;
  servings: number;
  lines: RecipeConsumptionLine[];
};
export const recipeBindingKey = (
  productId: string,
  index: number,
  name: string,
  unit: RecipeUnit,
): string =>
  JSON.stringify([
    productId,
    index,
    name.trim().replace(/\s+/g, " ").toLocaleLowerCase(),
    conversion[unit].unit,
  ]);

export function analyzePosRecipeConsumption(
  materials: readonly RecipeSupplyMaterial[],
  bindings: readonly SupplyPosBinding[],
  sources: readonly RecipeSaleSource[],
): {
  consumptions: RecipeSaleConsumption[];
  issues: Array<{ productName: string; servings: number; message: string }>;
} {
  const byKey = new Map(
    bindings.map((binding) => [
      recipeBindingKey(
        binding.productId,
        binding.ingredientIndex,
        binding.ingredientName,
        binding.unit,
      ),
      binding.materialId,
    ]),
  );
  const consumptions: RecipeSaleConsumption[] = [];
  const issues: Array<{
    productName: string;
    servings: number;
    message: string;
  }> = [];
  for (const source of sources) {
    const sourceMap =
      source.bindings === null
        ? byKey
        : new Map(
            source.bindings.map((binding) => [
              recipeBindingKey(
                binding.productId,
                binding.ingredientIndex,
                binding.ingredientName,
                binding.unit,
              ),
              binding.materialId,
            ]),
          );
    const mapped = source.recipe.ingredients.map(
      (ingredient, ingredientIndex) => ({
        ingredientIndex,
        materialId:
          (source.bindings === null ? ingredient.materialId : undefined) ||
          sourceMap.get(
            recipeBindingKey(
              source.productId,
              ingredientIndex,
              ingredient.name,
              ingredient.unit,
            ),
          ) ||
          "",
      }),
    );
    const result = calculateRecipeConsumption(
      source.recipe,
      source.servings,
      materials,
      mapped,
    );
    if (!result.ok) {
      issues.push({
        productName: source.productName,
        servings: source.servings,
        message: result.message,
      });
      continue;
    }
    consumptions.push({
      productId: source.productId,
      productName: source.productName,
      recipeVersion: source.recipeVersion,
      servings: source.servings,
      lines: result.lines,
    });
  }
  return { consumptions, issues };
}

/** Month boundaries in the business timezone, including historical timezone offsets. */
export function supplyMonthUtcRange(month: string): { from: Date; to: Date } {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Invalid supply month");
  const [year, period] = month.split("-").map(Number);
  const midnight = (y: number, m: number) => {
    const target = Date.UTC(y, m, 1);
    let timestamp = target;
    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(timestamp));
      const get = (type: string) =>
        Number(parts.find((part) => part.type === type)?.value);
      const local = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second"),
      );
      timestamp += target - local;
    }
    return new Date(timestamp);
  };
  return {
    from: midnight(year, period - 1),
    to: midnight(year + Math.floor(period / 12), period % 12),
  };
}
