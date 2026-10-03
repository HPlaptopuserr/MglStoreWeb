export type ReceiptSearchKind = "barcode" | "sku" | "name";

export function classifyReceiptSearch(value: string): ReceiptSearchKind {
  const query = value.trim();
  if (/^\d{4,}$/.test(query)) return "barcode";
  if (/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+$/.test(query)) return "sku";
  return "name";
}
