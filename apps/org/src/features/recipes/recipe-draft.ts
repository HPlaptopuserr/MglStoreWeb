import {
  parseProductRecipe,
  type ProductRecipe,
  type RecipeKind,
  type RecipeUnit,
  type RecipeSupplyChoice,
} from "@mgl/types";

export type IngredientDraft = {
  materialId?: string;
  id: string;
  name: string;
  quantity: string;
  unit: RecipeUnit;
  packageQuantity: string;
  packageUnit: RecipeUnit;
  packagePrice: string;
};
export type RecipeDraft = {
  kind: RecipeKind;
  yieldQuantity: string;
  servingLabel: string;
  ingredients: IngredientDraft[];
  laborCost: string;
  overheadCost: string;
  instructions: string;
};
export const newIngredient = (): IngredientDraft => ({
  id: crypto.randomUUID(),
  name: "",
  quantity: "",
  unit: "g",
  packageQuantity: "",
  packageUnit: "g",
  packagePrice: "",
});
export const newRecipeDraft = (): RecipeDraft => ({
  kind: "FOOD",
  yieldQuantity: "1",
  servingLabel: "1 порц",
  ingredients: [newIngredient()],
  laborCost: "0",
  overheadCost: "0",
  instructions: "",
});
export const toRecipeDraft = (recipe: ProductRecipe): RecipeDraft => ({
  ...recipe,
  yieldQuantity: String(recipe.yieldQuantity),
  laborCost: String(recipe.laborCost),
  overheadCost: String(recipe.overheadCost),
  ingredients: recipe.ingredients.map((row) => ({
    ...row,
    id: crypto.randomUUID(),
    quantity: String(row.quantity),
    packageQuantity: String(row.packageQuantity),
    packagePrice: row.packagePrice === null ? "" : String(row.packagePrice),
  })),
});
const requiredNumber = (value: string) =>
  value.trim() ? Number(value) : Number.NaN;
export const parseRecipeDraft = (draft: RecipeDraft) =>
  parseProductRecipe({
    ...draft,
    yieldQuantity: requiredNumber(draft.yieldQuantity),
    laborCost: draft.laborCost.trim() ? Number(draft.laborCost) : 0,
    overheadCost: draft.overheadCost.trim() ? Number(draft.overheadCost) : 0,
    ingredients: draft.ingredients.map((row) => ({
      ...row,
      quantity: requiredNumber(row.quantity),
      // An unpriced ingredient only needs its recipe amount. A neutral basis keeps
      // the stored schema valid without inventing a cost or a purchase package.
      packageQuantity:
        !row.packageQuantity.trim() && !row.packagePrice.trim()
          ? 1
          : requiredNumber(row.packageQuantity),
      packageUnit:
        !row.packageQuantity.trim() && !row.packagePrice.trim()
          ? row.unit
          : row.packageUnit,
      packagePrice: row.packagePrice.trim() ? Number(row.packagePrice) : null,
    })),
  });

/** Reprice linked ingredients from saved supply data while preserving recipe quantities. */
export function withSupplyPrices(
  draft: RecipeDraft,
  materials: readonly RecipeSupplyChoice[],
): RecipeDraft {
  const byId = new Map(materials.map((material) => [material.id, material]));
  return {
    ...draft,
    ingredients: draft.ingredients.map((ingredient) => {
      const material = ingredient.materialId
        ? byId.get(ingredient.materialId)
        : undefined;
      return material
        ? {
            ...ingredient,
            name: material.name,
            packageQuantity: "1",
            packageUnit: material.unit,
            packagePrice:
              material.unitPrice === null ? "" : String(material.unitPrice),
          }
        : ingredient;
    }),
  };
}
