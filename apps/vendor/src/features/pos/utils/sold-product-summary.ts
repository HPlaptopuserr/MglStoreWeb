import { calculateSaleFinancials, roundSalesMoney } from "./sale-financials";
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
  cost: number | null;
  unitCost: number | null;
  sellingPrice: number | null;
  profit: number | null;
  margin: number | null;
  markup: number | null;
  discount: number;
  knownCost: number;
  knownRevenue: number;
  missingCostCount: number;
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
          cost: null,
          unitCost: null,
          sellingPrice: null,
          profit: null,
          margin: null,
          markup: null,
          discount: 0,
          knownCost: 0,
          knownRevenue: 0,
          missingCostCount: 0,
          sales: [],
        };
        groups.set(key, row);
        receiptIds.set(key, new Set());
      }
      row.quantity += line.qty;
      row.amount += line.lineTotal;
      const financials = calculateSaleFinancials(line);
      row.discount += financials.discount;
      if (financials.cost == null) row.missingCostCount += 1;
      else {
        row.knownCost += financials.cost;
        row.knownRevenue += line.lineTotal;
      }
      row.sales.push({ receipt, line });
      receiptIds.get(key)?.add(receipt.id);
    }
  }
  return [...groups.values()]
    .map((row) => {
      const cost =
        row.missingCostCount === 0 ? roundSalesMoney(row.knownCost) : null;
      const profit = cost == null ? null : roundSalesMoney(row.amount - cost);
      return {
        ...row,
        quantity: Math.round(row.quantity * 1000) / 1000,
        amount: roundSalesMoney(row.amount),
        discount: roundSalesMoney(row.discount),
        knownCost: roundSalesMoney(row.knownCost),
        knownRevenue: roundSalesMoney(row.knownRevenue),
        cost,
        profit,
        unitCost: cost != null && row.quantity > 0 ? cost / row.quantity : null,
        sellingPrice: row.quantity > 0 ? row.amount / row.quantity : null,
        margin:
          profit != null && row.amount > 0 ? (profit / row.amount) * 100 : null,
        markup:
          profit != null && cost != null && cost > 0
            ? (profit / cost) * 100
            : null,
        receiptCount: receiptIds.get(row.key)?.size || 0,
      };
    })
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.amount - a.amount ||
        a.name.localeCompare(b.name, "mn"),
    );
}

export function summarizeSalesFinancials(rows: readonly SoldProductSummary[]) {
  const revenue = roundSalesMoney(
    rows.reduce((sum, row) => sum + row.amount, 0),
  );
  const knownCost = roundSalesMoney(
    rows.reduce((sum, row) => sum + row.knownCost, 0),
  );
  const knownRevenue = roundSalesMoney(
    rows.reduce((sum, row) => sum + row.knownRevenue, 0),
  );
  const profit = roundSalesMoney(knownRevenue - knownCost);
  const missingCostCount = rows.reduce(
    (sum, row) => sum + row.missingCostCount,
    0,
  );
  return {
    revenue,
    knownCost,
    knownRevenue,
    profit,
    missingCostCount,
    discount: roundSalesMoney(rows.reduce((sum, row) => sum + row.discount, 0)),
    margin: knownRevenue > 0 ? (profit / knownRevenue) * 100 : null,
    markup: knownCost > 0 ? (profit / knownCost) * 100 : null,
  };
}
