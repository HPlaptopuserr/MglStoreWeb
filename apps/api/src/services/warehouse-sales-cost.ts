import { Prisma } from "@mgl/database";
import { fromPosStoredStockQuantity } from "@mgl/types";

type CostProduct = { costPrice: Prisma.Decimal | null; unit: string | null };
/** Invoice costs use warehouse quantities (grams for kg products). */
export function stockInvoiceCost(
  items: ReadonlyArray<{ productId: string; quantity: number }>,
  productFor: (productId: string) => CostProduct | undefined,
): Prisma.Decimal | null {
  let total = new Prisma.Decimal(0);
  for (const item of items) {
    const product = productFor(item.productId);
    if (!product || product.costPrice === null) return null;
    total = total.add(
      product.costPrice.mul(
        fromPosStoredStockQuantity(item.quantity, product.unit),
      ),
    );
  }
  return total.toDecimalPlaces(2);
}
