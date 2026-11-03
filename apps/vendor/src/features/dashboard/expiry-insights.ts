export type ExpiryRiskLevel = "critical" | "high" | "medium" | "low";

export interface ExpiryInsightProduct {
  inventoryId: string;
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  warehouseName: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  salesLast30Days: number;
  dailyVelocity: number;
  sellThroughDays: number | null;
  riskScore: number;
  riskLevel: ExpiryRiskLevel;
  stockValue: number;
  recommendation: string;
}

export interface ExpiryInsights {
  generatedAt: string;
  windowDays: number;
  totalAtRisk: number;
  criticalCount: number;
  highCount: number;
  urgentCount: number;
  urgentProducts?: ExpiryInsightProduct[];
  stagnantCount: number;
  riskValue: number;
  highestRiskScore: number;
  recommendations: string[];
  products: ExpiryInsightProduct[];
}

export type ExpiryFilter = "all" | "expired" | "urgent" | "stagnant";
export type ExpirySort = "risk" | "date" | "value";
export function filterExpiryProducts(
  products: readonly ExpiryInsightProduct[],
  filter: ExpiryFilter,
  search: string,
  sort: ExpirySort,
): ExpiryInsightProduct[] {
  const query = search.trim().toLocaleLowerCase("mn-MN");
  return products
    .filter((product) => {
      const matches =
        filter === "all" ||
        (filter === "expired" && product.daysUntilExpiry < 0) ||
        (filter === "urgent" &&
          product.daysUntilExpiry >= 0 &&
          product.daysUntilExpiry <= 14) ||
        (filter === "stagnant" && product.salesLast30Days === 0);
      return (
        matches &&
        (!query ||
          [product.name, product.sku, product.warehouseName].some((value) =>
            value?.toLocaleLowerCase("mn-MN").includes(query),
          ))
      );
    })
    .sort(
      (a, b) =>
        (sort === "date"
          ? a.daysUntilExpiry - b.daysUntilExpiry
          : sort === "value"
            ? b.stockValue - a.stockValue
            : b.riskScore - a.riskScore) ||
        a.daysUntilExpiry - b.daysUntilExpiry ||
        a.inventoryId.localeCompare(b.inventoryId),
    );
}
export const expiryMoney = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")}₮`;
