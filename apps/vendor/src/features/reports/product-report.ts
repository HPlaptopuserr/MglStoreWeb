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
  | "receiptLots"
  | "expiryDate"
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
  inconsistentLotCount: number;
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
      const valuation = calculateProductInventoryValue(product);
      if (valuation.missingCostQuantity > 0) totals.missingCostCount += 1;
      if (valuation.inconsistentLots) totals.inconsistentLotCount += 1;
      if (rawStock < 0) totals.negativeStockCount += 1;
      totals.stockByUnit[unit] = (totals.stockByUnit[unit] || 0) + stock;
      const salePrice = Math.max(0, Number(product.price) || 0);

      totals.productCount += 1;
      totals.stockQuantity += stock;
      totals.inventoryCost += valuation.inventoryCost;
      totals.inventoryRetailValue += stock * salePrice;
      totals.projectedGrossProfit +=
        valuation.knownCostQuantity * salePrice - valuation.inventoryCost;
      return totals;
    },
    {
      productCount: 0,
      stockQuantity: 0,
      stockByUnit: {},
      missingCostCount: 0,
      negativeStockCount: 0,
      inconsistentLotCount: 0,
      inventoryCost: 0,
      inventoryRetailValue: 0,
      projectedGrossProfit: 0,
    },
  );
}

function validCost(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(Number(value)) && Number(value) >= 0
    ? Number(value)
    : null;
}

export interface ProductInventoryValue {
  inventoryCost: number;
  knownCostQuantity: number;
  missingCostQuantity: number;
  averageCost: number | null;
  inconsistentLots: boolean;
}

/** API quantities are already converted to display units (pieces or kilograms). */
export function calculateProductInventoryValue(
  product: ProductReportRow,
): ProductInventoryValue {
  const stock = Number.isFinite(Number(product.stock))
    ? Math.max(0, Number(product.stock))
    : 0;
  const lots = product.receiptLots ?? [];
  const lotQuantity = lots.reduce(
    (sum, lot) => sum + Math.max(0, lot.remainingQuantity),
    0,
  );
  // Do not guess which lots remain after an untracked adjustment. A tiny
  // tolerance only absorbs floating point addition of kilogram quantities.
  const inconsistentLots =
    !Number.isFinite(lotQuantity) || lotQuantity > stock + 1e-9;
  if (inconsistentLots) {
    return {
      inventoryCost: 0,
      knownCostQuantity: 0,
      missingCostQuantity: stock,
      averageCost: null,
      inconsistentLots: true,
    };
  }
  let inventoryCost = 0;
  let knownCostQuantity = 0;
  const addCost = (quantity: number, cost: number | null) => {
    if (cost === null || quantity <= 0) return;
    inventoryCost += quantity * cost;
    knownCostQuantity += quantity;
  };
  for (const lot of lots) {
    addCost(Math.max(0, lot.remainingQuantity), validCost(lot.unitCost));
  }
  // Only stock without a receipt uses the catalog cost. An explicitly unknown
  // receipt cost must remain unknown, even when the catalog has a price.
  addCost(Math.max(0, stock - lotQuantity), validCost(product.costPrice));
  const missingCostQuantity = Math.max(0, stock - knownCostQuantity);
  return {
    inventoryCost,
    knownCostQuantity,
    missingCostQuantity: missingCostQuantity > 1e-9 ? missingCostQuantity : 0,
    averageCost:
      stock === 0
        ? validCost(product.costPrice)
        : missingCostQuantity > 1e-9
          ? null
          : inventoryCost / stock,
    inconsistentLots: false,
  };
}

export function calculateMarginPercent(
  product: ProductReportRow,
): number | null {
  const salePrice = Number(product.price) || 0;
  const { averageCost } = calculateProductInventoryValue(product);
  if (salePrice <= 0 || averageCost === null) return null;
  return ((salePrice - averageCost) / salePrice) * 100;
}

export const INVENTORY_VALUATION_DESCRIPTION =
  "Нөөцийн өртөг = орлого бүрийн үлдэгдэл × тухайн орлогын авсан үнийн нийлбэр. Орлогын түүхгүй үлдэгдэлд барааны бүртгэлтэй авсан үнийг ашиглана. Дундаж өртөг нь үлдэгдлээр жигнэсэн үнэ. Үнэ дутуу хэсэг болон үлдэгдлийн зөрүүтэй барааг өртөг, ашгийн тооцоонд оруулахгүй. Боломжит ашиг нь бодит борлуулалтын ашиг биш.";

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
