import type { Prisma } from "@mgl/database";
import {
  parseProductRecipe,
  supplyMonthUtcRange,
  type RecipeSaleSource,
  type SupplyPosBinding,
} from "@mgl/types";

type Reader = Pick<
  Prisma.TransactionClient,
  "posSaleRecipeSnapshot" | "posSaleLine"
>;
/** Completed sales count once. Voided sales disappear from the same query, restoring recipe balances. */
export async function readSupplyPosSources(
  db: Reader,
  organizationId: string,
  month: string,
): Promise<{ posSources: RecipeSaleSource[]; uncapturedSaleLines: number }> {
  const { from, to } = supplyMonthUtcRange(month);
  const sale = {
    organizationId,
    status: "COMPLETED" as const,
    voidedAt: null,
    createdAt: { gte: from, lt: to },
  };
  const [groups, uncapturedSaleLines] = await Promise.all([
    db.posSaleRecipeSnapshot.groupBy({
      by: ["productId", "productName", "recipeVersion", "recipe", "bindings"],
      where: { saleLine: { sale } },
      _sum: { servings: true },
    }),
    db.posSaleLine.count({
      where: {
        sale,
        recipeSnapshot: null,
        product: { recipe: { isNot: null } },
      },
    }),
  ]);
  const posSources: RecipeSaleSource[] = groups.map((group) => {
    const parsed = parseProductRecipe(group.recipe);
    if (!parsed.ok)
      throw new Error(`Invalid POS recipe snapshot: ${group.productId}`);
    return {
      productId: group.productId,
      productName: group.productName,
      recipeVersion: group.recipeVersion,
      recipe: parsed.value,
      bindings: parseSnapshotBindings(group.bindings),
      servings: Number(group._sum.servings ?? 0),
    };
  });
  return { posSources, uncapturedSaleLines };
}

function parseSnapshotBindings(
  value: Prisma.JsonValue,
): SupplyPosBinding[] | null {
  if (value === null) return null;
  if (!Array.isArray(value))
    throw new Error("Invalid recipe material snapshot");
  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.productId !== "string" ||
      typeof item.ingredientIndex !== "number" ||
      !Number.isSafeInteger(item.ingredientIndex) ||
      item.ingredientIndex < 0 ||
      typeof item.ingredientName !== "string" ||
      typeof item.materialId !== "string" ||
      (item.unit !== "kg" && item.unit !== "l" && item.unit !== "pcs")
    )
      throw new Error("Invalid recipe material snapshot");
    return {
      productId: item.productId,
      ingredientIndex: item.ingredientIndex,
      ingredientName: item.ingredientName,
      materialId: item.materialId,
      unit: item.unit,
    };
  });
}
