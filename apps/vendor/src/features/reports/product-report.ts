import type { Product } from "@/features/products";

export type ProductReportRow = Pick<
  Product,
  | "id"
  | "name"
  | "sku"
  | "barcode"
  | "price"
  | "wholesalePrice"
  | "costPrice"
  | "stock"
  | "unit"
  | "isActive"
  | "businessCategory"
>;

export interface ProductReportTotals {
  productCount: number;
  stockQuantity: number;
  stockByUnit: Record<string, number>;
  missingCostCount: number;
  negativeStockCount: number;
  inventoryCost: number;
  inventoryRetailValue: number;
  projectedGrossProfit: number;
}

export function calculateProductReportTotals(
  products: ProductReportRow[],
): ProductReportTotals {
  return products.reduce<ProductReportTotals>(
    (totals, product) => {
      const rawStock = Number(product.stock) || 0;
      const stock = Math.max(0, rawStock);
      const unit = product.unit === "kg" ? "кг" : "ш";
      const hasCost =
        product.costPrice != null && Number.isFinite(Number(product.costPrice));
      if (!hasCost) totals.missingCostCount += 1;
      if (rawStock < 0) totals.negativeStockCount += 1;
      totals.stockByUnit[unit] = (totals.stockByUnit[unit] || 0) + stock;
      const costPrice = Math.max(0, Number(product.costPrice) || 0);
      const salePrice = Math.max(0, Number(product.price) || 0);

      totals.productCount += 1;
      totals.stockQuantity += stock;
      totals.inventoryCost += stock * costPrice;
      totals.inventoryRetailValue += stock * salePrice;
      if (hasCost)
        totals.projectedGrossProfit += stock * (salePrice - costPrice);
      return totals;
    },
    {
      productCount: 0,
      stockQuantity: 0,
      stockByUnit: {},
      missingCostCount: 0,
      negativeStockCount: 0,
      inventoryCost: 0,
      inventoryRetailValue: 0,
      projectedGrossProfit: 0,
    },
  );
}

export function calculateMarginPercent(
  product: ProductReportRow,
): number | null {
  const salePrice = Number(product.price) || 0;
  const costPrice = Number(product.costPrice) || 0;
  if (salePrice <= 0 || product.costPrice == null) return null;
  return ((salePrice - costPrice) / salePrice) * 100;
}

export function formatReportStock(totals: ProductReportTotals) {
  return (
    Object.entries(totals.stockByUnit)
      .map(
        ([unit, quantity]) =>
          `${quantity.toLocaleString("mn-MN", { maximumFractionDigits: 3 })} ${unit}`,
      )
      .join(" · ") || "0 ш"
  );
}
