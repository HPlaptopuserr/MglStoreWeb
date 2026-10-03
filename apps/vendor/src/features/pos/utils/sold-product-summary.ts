import type { PosReceipt } from "@mgl/types";

export interface ProductSaleOccurrence {
  receipt: PosReceipt;
  line: PosReceipt["lines"][number];
}

export interface SoldProductSummary {
  key: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  unit: string;
  quantity: number;
  amount: number;
  receiptCount: number;
  sales: ProductSaleOccurrence[];
}

function displayUnit(unit?: string) {
  const normalized = unit?.trim().toLowerCase() || "ш";
  if (["pcs", "ш", "ширхэг"].includes(normalized)) return "ш";
  if (["kg", "кг"].includes(normalized)) return "кг";
  return normalized;
}

/** Snapshot codes can change; product identity and compatible units determine grouping. */
export function summarizeSoldProducts(
  receipts: readonly PosReceipt[],
): SoldProductSummary[] {
  const groups = new Map<string, SoldProductSummary>();
  const receiptIds = new Map<string, Set<string>>();
  const completed = receipts
    .filter((receipt) => receipt.status === "COMPLETED")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const receipt of completed) {
    for (const line of receipt.lines) {
      const unit = displayUnit(line.measureUnit);
      const key = JSON.stringify([line.productId, unit]);
      let row = groups.get(key);
      if (!row) {
        row = {
          key,
          productId: line.productId,
          name: line.name,
          sku: line.sku || "",
          barcode: line.barcode || "",
          unit,
          quantity: 0,
          amount: 0,
          receiptCount: 0,
          sales: [],
        };
        groups.set(key, row);
        receiptIds.set(key, new Set());
      }
      row.quantity += line.qty;
      row.amount += line.lineTotal;
      row.sales.push({ receipt, line });
      receiptIds.get(key)?.add(receipt.id);
    }
  }
  return [...groups.values()]
    .map((row) => ({
      ...row,
      quantity: Math.round(row.quantity * 1000) / 1000,
      amount: Math.round(row.amount * 100) / 100,
      receiptCount: receiptIds.get(row.key)?.size || 0,
    }))
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.amount - a.amount ||
        a.name.localeCompare(b.name, "mn"),
    );
}
