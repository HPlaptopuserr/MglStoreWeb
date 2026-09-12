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
  inventoryCost: number;
  inventoryRetailValue: number;
  projectedGrossProfit: number;
}

export function calculateProductReportTotals(
  products: ProductReportRow[],
): ProductReportTotals {
  return products.reduce<ProductReportTotals>(
    (totals, product) => {
      const stock = Math.max(0, Number(product.stock) || 0);
      const costPrice = Math.max(0, Number(product.costPrice) || 0);
      const salePrice = Math.max(0, Number(product.price) || 0);

      totals.productCount += 1;
      totals.stockQuantity += stock;
      totals.inventoryCost += stock * costPrice;
      totals.inventoryRetailValue += stock * salePrice;
      totals.projectedGrossProfit += stock * (salePrice - costPrice);
      return totals;
    },
    {
      productCount: 0,
      stockQuantity: 0,
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
