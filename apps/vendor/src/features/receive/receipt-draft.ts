import type { ReceiptLine } from "./receipt-types";

export interface ReceiptDraft {
  selectedRegisterId: string;
  supplierName: string;
  supplierRegisterNo: string;
  documentNo: string;
  note: string;
  search: string;
  markup: string;
  lines: ReceiptLine[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function parseReceiptDraft(raw: string): ReceiptDraft | null {
  try {
    const stored: unknown = JSON.parse(raw);
    if (!record(stored) || stored.version !== 1 || !record(stored.draft))
      return null;
    const draft = stored.draft;
    if (
      ![
        "selectedRegisterId",
        "supplierName",
        "supplierRegisterNo",
        "documentNo",
        "note",
        "search",
        "markup",
      ].every((key) => typeof draft[key] === "string")
    )
      return null;
    if (
      !Array.isArray(draft.lines) ||
      !draft.lines.every((line: unknown) => {
        if (!record(line) || !record(line.product)) return false;
        return (
          ["id", "unitCost", "salePrice", "batchNumber", "expiryDate"].every(
            (key) => typeof line[key] === "string",
          ) &&
          typeof line.quantity === "number" &&
          Number.isFinite(line.quantity) &&
          line.quantity > 0 &&
          typeof line.manualPrice === "boolean" &&
          typeof line.product.id === "string" &&
          typeof line.product.name === "string" &&
          typeof line.product.stock === "number"
        );
      })
    )
      return null;
    return draft as unknown as ReceiptDraft;
  } catch {
    return null;
  }
}
export function hasReceiptDraft(draft: ReceiptDraft) {
  return Boolean(
    draft.lines.length ||
    draft.supplierName ||
    draft.supplierRegisterNo ||
    draft.documentNo ||
    draft.note ||
    draft.search,
  );
}
