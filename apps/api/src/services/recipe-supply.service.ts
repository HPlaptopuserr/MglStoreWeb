import type { Prisma } from "@mgl/database";
import {
  parseSupplyMonth,
  summarizeSupplyMonth,
  type RecipeSupplyChoice,
} from "@mgl/types";

/** Material choices and weighted purchase prices from this organization's selected supply month. */
export async function readRecipeSupply(
  db: Pick<Prisma.TransactionClient, "restaurantSupplyMonth">,
  organizationId: string,
  month: string,
): Promise<RecipeSupplyChoice[]> {
  const record = await db.restaurantSupplyMonth.findUnique({
    where: { organizationId_month: { organizationId, month } },
  });
  const parsed = parseSupplyMonth(month, record?.data ?? { materials: [] });
  if (!parsed.ok) throw new Error("Invalid supply month data");
  return summarizeSupplyMonth(parsed.value).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    unitPrice: row.unitCost,
  }));
}
