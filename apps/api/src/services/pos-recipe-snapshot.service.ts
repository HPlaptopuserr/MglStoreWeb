import { Prisma } from "@mgl/database";
import {
  calculateRecipeConsumption,
  parseProductRecipe,
  parseSupplyMonth,
  recipeBindingKey,
  supplyMonthUtcRange,
  type ProductRecipe,
  type SupplyMonth,
  type SupplyPosBinding,
} from "@mgl/types";

function recipeBindings(
  productId: string,
  recipe: ProductRecipe,
  supply: SupplyMonth,
): SupplyPosBinding[] | null {
  const byKey = new Map(
    (supply.posBindings ?? []).map((binding) => [
      recipeBindingKey(
        binding.productId,
        binding.ingredientIndex,
        binding.ingredientName,
        binding.unit,
      ),
      binding,
    ]),
  );
  const bindings = recipe.ingredients.map(
    (ingredient, index): SupplyPosBinding | undefined =>
      ingredient.materialId
        ? {
            productId,
            ingredientIndex: index,
            ingredientName: ingredient.name,
            materialId: ingredient.materialId,
            unit:
              ingredient.unit === "g"
                ? "kg"
                : ingredient.unit === "ml"
                  ? "l"
                  : ingredient.unit,
          }
        : byKey.get(
            recipeBindingKey(
              productId,
              index,
              ingredient.name,
              ingredient.unit,
            ),
          ),
  );
  if (bindings.some((binding) => !binding)) return null;
  const complete = bindings.filter((binding): binding is SupplyPosBinding =>
    Boolean(binding),
  );
  return calculateRecipeConsumption(recipe, 1, supply.materials, complete).ok
    ? complete
    : null;
}
const bindingJson = (bindings: SupplyPosBinding[]) =>
  bindings.map((binding) => ({ ...binding }));

/** Called inside the successful sale transaction. Repeated calls never replace history. */
export async function capturePosRecipeSnapshots(
  tx: Prisma.TransactionClient,
  saleId: string,
): Promise<void> {
  const lines = await tx.posSaleLine.findMany({
    where: { saleId },
    select: { id: true, productId: true, productName: true, qty: true },
  });
  if (!lines.length) return;
  const sale = await tx.posSale.findUniqueOrThrow({
    where: { id: saleId },
    select: { organizationId: true, createdAt: true },
  });
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(sale.createdAt);
  const month = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
  const stored = await tx.restaurantSupplyMonth.findUnique({
    where: {
      organizationId_month: { organizationId: sale.organizationId, month },
    },
  });
  const supply = parseSupplyMonth(month, stored?.data ?? { materials: [] });
  const recipes = await tx.productRecipe.findMany({
    where: {
      productId: { in: [...new Set(lines.map((line) => line.productId))] },
    },
    select: { productId: true, version: true, data: true },
  });
  const byProduct = new Map(
    recipes.map((recipe) => [recipe.productId, recipe]),
  );
  const data: Prisma.PosSaleRecipeSnapshotCreateManyInput[] = [];
  for (const line of lines) {
    const recipe = byProduct.get(line.productId);
    if (!recipe) continue;
    const parsed = parseProductRecipe(recipe.data);
    const bindings =
      parsed.ok && supply.ok
        ? recipeBindings(line.productId, parsed.value, supply.value)
        : null;
    data.push({
      saleLineId: line.id,
      productId: line.productId,
      productName: line.productName,
      servings: line.qty,
      recipeVersion: recipe.version,
      recipe: recipe.data as Prisma.InputJsonValue,
      bindings: bindings ? bindingJson(bindings) : Prisma.DbNull,
    });
  }
  if (data.length)
    await tx.posSaleRecipeSnapshot.createMany({ data, skipDuplicates: true });
}

/** Resolve previously unconfigured sales once, without rewriting already bound history. */
export async function bindPendingRecipeSnapshots(
  tx: Prisma.TransactionClient,
  organizationId: string,
  month: string,
  supply: SupplyMonth,
): Promise<void> {
  const { from, to } = supplyMonthUtcRange(month);
  const where: Prisma.PosSaleRecipeSnapshotWhereInput = {
    bindings: { equals: Prisma.DbNull },
    saleLine: {
      sale: {
        organizationId,
        status: "COMPLETED",
        voidedAt: null,
        createdAt: { gte: from, lt: to },
      },
    },
  };
  const groups = await tx.posSaleRecipeSnapshot.groupBy({
    by: ["productId", "recipeVersion", "recipe"],
    where,
  });
  for (const group of groups) {
    const parsed = parseProductRecipe(group.recipe);
    if (!parsed.ok) continue;
    const bindings = recipeBindings(group.productId, parsed.value, supply);
    if (!bindings) continue;
    await tx.posSaleRecipeSnapshot.updateMany({
      where: {
        ...where,
        productId: group.productId,
        recipeVersion: group.recipeVersion,
        recipe: { equals: group.recipe as Prisma.InputJsonValue },
      },
      data: { bindings: bindingJson(bindings) },
    });
  }
}
