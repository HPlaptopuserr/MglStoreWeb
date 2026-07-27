import { API, authFetch } from "@/lib/api";
import type { PosProduct } from "../types/pos.types";

type RawProduct = {
  id: string;
  sku: string | null;
  barcode?: string | null;
  name: string;
  imageUrl?: string | null;
  images?: { url: string }[];
  price: number;
  wholesalePrice?: number | null;
  orderPrice?: number | null;
  taxType?: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  cityTaxRate?: number;
  classificationCode?: string | null;
  taxProductCode?: string | null;
  stock: number;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  isActive: boolean;
};

function taxRateFromType(taxType?: string | null) {
  return taxType === "VAT_ABLE" ? 10 : 0;
}

export async function getOwnProducts(
  organizationId: string,
  signal?: AbortSignal,
): Promise<PosProduct[]> {
  const res = await authFetch(
    `${API}/products?organizationId=${encodeURIComponent(organizationId)}`,
    {
      signal,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let message = "Бараа татахад алдаа гарлаа";

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.message || parsed?.error || message;
      } catch {
        message = raw.slice(0, 160) || message;
      }
    }

    throw new Error(`${message} (HTTP ${res.status})`);
  }

  const data = (await res.json()) as RawProduct[];

  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item.isActive && item.supplyType !== "CHINA_PREORDER")
    .map((item) => ({
      id: item.id,
      sku: item.sku || item.id,
      barcode: item.barcode || null,
      name: item.name,
      imageUrl: item.imageUrl || item.images?.[0]?.url || null,
      price: Number(item.price) || 0,
      wholesalePrice:
        item.wholesalePrice == null ? null : Number(item.wholesalePrice),
      orderPrice: item.orderPrice == null ? null : Number(item.orderPrice),
      stockQty: Number(item.stock) || 0,
      taxType: item.taxType || "VAT_ABLE",
      taxRate: taxRateFromType(item.taxType || "VAT_ABLE"),
      cityTaxRate: Number(item.cityTaxRate) || 0,
      classificationCode: item.classificationCode || "4711000",
      taxProductCode: item.taxProductCode || null,
      measureUnit: "pcs",
      isActive: item.isActive,
    }));
}
