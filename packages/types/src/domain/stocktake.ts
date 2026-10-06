/** Stock quantities use the same integer storage scale as POS (kg → grams). */
export type StocktakeStatus = "DRAFT" | "REVIEW" | "APPROVED" | "CANCELLED";
export type StocktakeKind = "FULL" | "PARTIAL";
export interface StocktakeLineDto {
  id: string;
  productId: string;
  name: string;
  barcode: string | null;
  barcodeAliases: string[];
  unit: string | null;
  expected: number;
  counted: number | null;
  note: string;
  countedAt: string | null;
  countedById: string | null;
}
export interface StocktakeSummary {
  id: string;
  title: string;
  kind: StocktakeKind;
  status: StocktakeStatus;
  warehouseId: string | null;
  warehouse: { name: string } | null;
  version: number;
  createdAt: string;
  approvedAt: string | null;
  createdById: string;
  approvedById: string | null;
}
export interface StocktakeDetail extends StocktakeSummary {
  lines: StocktakeLineDto[];
}
export interface StocktakeOverview {
  canApprove: boolean;
  warehouses: { id: string; name: string }[];
  sessions: StocktakeSummary[];
}
export interface StocktakeCountEdit {
  id: string;
  counted: number | null;
  note: string;
}
