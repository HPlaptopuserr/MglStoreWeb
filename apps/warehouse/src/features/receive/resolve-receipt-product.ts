import type { ReceiveItem } from "./receipt-types";

export interface ReceiptProductIdentity {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeAliases?: string[];
  masterProductId?: string | null;
  unit?: string | null;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Exact identifiers only: a similar product name must never resolve a draft. */
export async function findReceiptProduct(
  endpoint: string,
  item: ReceiveItem,
  fetcher: Fetcher,
): Promise<ReceiptProductIdentity | null> {
  const barcode = item.draftProduct?.barcode.trim();
  const masterProductId = item.draftProduct?.masterProductId;
  if (!barcode && !masterProductId) return null;
  const params = new URLSearchParams({ limit: "2" });
  if (barcode) params.set("barcode", barcode);
  if (masterProductId) params.set("masterProductId", masterProductId);
  const response = await fetcher(`${endpoint}?${params}`);
  if (!response.ok)
    throw new Error("Бүртгэлтэй барааг шалгаж чадсангүй. Дахин оролдоно уу.");
  const products = (await response.json()) as ReceiptProductIdentity[];
  // Validate the identity even if an older API ignores the exact filters.
  const matches = products.filter(
    (product) =>
      (!barcode ||
        product.barcode === barcode ||
        product.barcodeAliases?.includes(barcode)) &&
      (!masterProductId || product.masterProductId === masterProductId),
  );
  if (matches.length > 1)
    throw new Error(
      `“${item.name}” барааны код хэд хэдэн бараанд байна. Барааны хайлтаас зөв барааг сонгоно уу.`,
    );
  return matches[0] ?? null;
}

export function resolveReceiptItem(
  item: ReceiveItem,
  product: ReceiptProductIdentity,
): ReceiveItem {
  return {
    ...item,
    productId: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit || item.unit,
    draftProduct: undefined,
  };
}
