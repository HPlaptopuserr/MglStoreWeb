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

/** Reconcile legacy drafts against this warehouse's catalog before creating a receipt. */
export async function reconcileReceiptProducts(
  endpoint: string,
  items: ReceiveItem[],
  fetcher: Fetcher,
): Promise<ReceiveItem[]> {
  const resolved = await Promise.all(
    items.map(async (item) => {
      if (item.draftProduct) return item;
      const search =
        item.barcode?.trim() || item.sku?.trim() || item.name.trim();
      const params = new URLSearchParams({ search, limit: "50" });
      if (item.barcode?.trim()) params.set("barcode", item.barcode.trim());
      const response = await fetcher(`${endpoint}?${params}`);
      if (!response.ok)
        throw new Error(
          `“${item.name}”: Агуулахын бүртгэлийг шалгаж чадсангүй. Ноорог хадгалагдсан.`,
        );
      const products = (await response.json()) as ReceiptProductIdentity[];
      const same = products.find((product) => product.id === item.productId);
      const matches = products.filter((product) =>
        item.barcode?.trim()
          ? product.barcode === item.barcode.trim() ||
            product.barcodeAliases?.includes(item.barcode.trim())
          : Boolean(item.sku?.trim() && product.sku === item.sku.trim()),
      );
      const product = same ?? (matches.length === 1 ? matches[0] : null);
      if (!product)
        throw new Error(
          `“${item.name}”: Энэ агуулахын бараатай холбож чадсангүй. Тоо, өртгөө хадгалаад мөрийг агуулахын хайлтаас дахин сонгоно уу.`,
        );
      const unit = (value: string | null | undefined) => {
        const normalized = value?.trim().toLowerCase();
        return !normalized || ["pcs", "ш", "шт"].includes(normalized)
          ? "pcs"
          : normalized;
      };
      if (unit(item.unit) !== unit(product.unit))
        throw new Error(
          `“${item.name}”: Хэмжих нэгж зөрж байна. Агуулахын бүртгэлээс зөв барааг сонгоно уу.`,
        );
      return resolveReceiptItem(item, product);
    }),
  );
  if (new Set(resolved.map((item) => item.productId)).size !== resolved.length)
    throw new Error(
      "Нэг бараа хэд хэдэн мөрд давхардсан байна. Тоо, өртгийг тулгаад давхардсан мөрөө засна уу.",
    );
  return resolved;
}
