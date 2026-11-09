"use client";

import {
  compatibleRecipeUnits,
  recipeBindingKey,
  type ProductRecipe,
  type RecipeSaleSource,
  type SupplyPosBinding,
} from "@mgl/types";
import type { MaterialDraft } from "./supply-draft";
export type SupplyProductChoice = {
  id: string;
  name: string;
  recipe?: ProductRecipe | null;
  recipeVersion?: number;
};
type Props = {
  materials: MaterialDraft[];
  products: SupplyProductChoice[];
  sources: RecipeSaleSource[];
  bindings: SupplyPosBinding[];
  disabled: boolean;
  onChange: (bindings: SupplyPosBinding[]) => void;
};
const unitLabels = { g: "гр", kg: "кг", ml: "мл", l: "л", pcs: "ширхэг" };

export function PosRecipeBindings({
  materials,
  products,
  sources,
  bindings,
  disabled,
  onChange,
}: Props) {
  const options = new Map<
    string,
    {
      productId: string;
      productName: string;
      ingredientIndex: number;
      ingredient: ProductRecipe["ingredients"][number];
      yieldQuantity: number;
    }
  >();
  const addRecipe = (
    productId: string,
    productName: string,
    recipe: ProductRecipe,
  ) => {
    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      const key = recipeBindingKey(
        productId,
        ingredientIndex,
        ingredient.name,
        ingredient.unit,
      );
      if (!options.has(key))
        options.set(key, {
          productId,
          productName,
          ingredientIndex,
          ingredient,
          yieldQuantity: recipe.yieldQuantity,
        });
    });
  };
  for (const product of products)
    if (product.recipe) addRecipe(product.id, product.name, product.recipe);
  for (const source of sources)
    addRecipe(source.productId, source.productName, source.recipe);
  if (!options.size)
    return (
      <p className="border-t border-slate-200 bg-white p-4 text-xs text-slate-600">
        Бүтээгдэхүүний «Орц, жор» хэсэгт жороо хадгалсны дараа орцыг хангамжтай
        холбоно.
      </p>
    );
  return (
    <section className="space-y-3 bg-white p-4" aria-label="POS орцын холбоос">
      <h2 className="text-sm font-bold">Жорын орцыг хангамжтай холбох</h2>
      <p className="text-xs leading-5 text-slate-500">
        Хоол зарагдахад орц бүрийг доорх материалаас тооцож хасна. Жишээ: «Мах»
        орцыг «Хонины мах»-тай холбоно. Холбоосоо сарын хангамжтай хамт
        хадгална.
      </p>
      {!materials.length && (
        <p className="text-sm font-semibold text-amber-800">
          Эхлээд хангамжийн түүхий эдүүдээ нэмнэ үү.
        </p>
      )}
      <fieldset disabled={disabled} className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
          <caption className="sr-only">Жорын орцын материалын холбоос</caption>
          <thead className="bg-slate-100 text-xs text-slate-600">
            <tr>
              {[
                "Бүтээгдэхүүн",
                "Жорын орц",
                "Хэмжээ / гарц",
                "Хангамжийн материал",
              ].map((title) => (
                <th key={title} scope="col" className="px-3 py-2">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...options].map(([key, option]) => {
              const binding = bindings.find(
                (entry) =>
                  recipeBindingKey(
                    entry.productId,
                    entry.ingredientIndex,
                    entry.ingredientName,
                    entry.unit,
                  ) === key,
              );
              const available = materials.filter(
                (material) =>
                  material.name.trim() &&
                  compatibleRecipeUnits(option.ingredient.unit, material.unit),
              );
              return (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium">
                    {option.productName}
                  </td>
                  <td className="px-3 py-2">{option.ingredient.name}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {option.ingredient.quantity}{" "}
                    {unitLabels[option.ingredient.unit]} /{" "}
                    {option.yieldQuantity}
                  </td>
                  <td>
                    <select
                      aria-label={`${option.productName} · ${option.ingredient.name} хангамжийн материал`}
                      value={
                        option.ingredient.materialId ??
                        binding?.materialId ??
                        ""
                      }
                      disabled={Boolean(option.ingredient.materialId)}
                      title={
                        option.ingredient.materialId
                          ? "Хангамжийн материалыг бүтээгдэхүүний жор дээр сонгосон"
                          : undefined
                      }
                      onChange={(event) => {
                        const other = bindings.filter(
                          (entry) =>
                            recipeBindingKey(
                              entry.productId,
                              entry.ingredientIndex,
                              entry.ingredientName,
                              entry.unit,
                            ) !== key,
                        );
                        onChange(
                          event.target.value
                            ? [
                                ...other,
                                {
                                  productId: option.productId,
                                  ingredientIndex: option.ingredientIndex,
                                  ingredientName: option.ingredient.name,
                                  materialId: event.target.value,
                                  unit:
                                    option.ingredient.unit === "g"
                                      ? "kg"
                                      : option.ingredient.unit === "ml"
                                        ? "l"
                                        : option.ingredient.unit,
                                },
                              ]
                            : other,
                        );
                      }}
                      className="min-h-10 w-full border border-transparent bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Материал сонгох</option>
                      {available.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({unitLabels[material.unit]})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>
    </section>
  );
}
