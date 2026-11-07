import type { CartLine } from "../types/pos.types";

export function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as CartLine;
  return (
    typeof line.productId === "string" &&
    typeof line.name === "string" &&
    Number.isFinite(line.qty) &&
    line.qty > 0 &&
    Number.isFinite(line.stockQty) &&
    Number.isFinite(line.unitPrice) &&
    Number.isFinite(line.taxRate) &&
    Number.isFinite(line.discountAmount)
  );
}
