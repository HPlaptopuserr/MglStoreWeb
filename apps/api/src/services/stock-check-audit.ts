export interface StockCheckAdjustment {
  beforeStock: number;
  afterStock: number;
  beforePrice: number;
  afterPrice: number;
  unit: string;
}
export function readStockCheckAdjustment(
  value: unknown,
): StockCheckAdjustment | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const number = (key: string): number | null =>
    typeof data[key] === "number" && Number.isFinite(data[key])
      ? data[key]
      : null;
  const beforeStock = number("beforeStock"),
    afterStock = number("afterStock"),
    beforePrice = number("beforePrice"),
    afterPrice = number("afterPrice");
  if (
    data.version !== 1 ||
    typeof data.unit !== "string" ||
    beforeStock === null ||
    afterStock === null ||
    beforePrice === null ||
    afterPrice === null
  )
    return null;
  return { beforeStock, afterStock, beforePrice, afterPrice, unit: data.unit };
}
