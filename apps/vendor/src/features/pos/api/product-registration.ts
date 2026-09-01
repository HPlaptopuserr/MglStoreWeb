import { API, authFetch } from "@/lib/api";
import type { PosProduct } from "../types/pos.types";
import type {
  QuickProductRegistrationInput,
  SharedCatalogSuggestion,
} from "../types/product-registration.types";

type CreatedProduct = {
  id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  price: number | string;
  stock: number;
  taxType?: PosProduct["taxType"];
  cityTaxRate?: number | string;
  classificationCode?: string | null;
  taxProductCode?: string | null;
  images?: Array<{ url: string }>;
  businessCategory?: { name: string } | null;
};

async function readApiError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function findSharedProductsByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<SharedCatalogSuggestion[]> {
  const params = new URLSearchParams({ barcode: barcode.trim() });
  const response = await authFetch(
    `${API}/products/master-catalog/search?${params.toString()}`,
    { signal, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        "Нэгдсэн барааны сангаас хайхад алдаа гарлаа",
      ),
    );
  }

  const body: unknown = await response.json();
  return Array.isArray(body) ? (body as SharedCatalogSuggestion[]) : [];
}

export async function registerProductFromPos(
  input: QuickProductRegistrationInput,
): Promise<PosProduct> {
  const response = await authFetch(`${API}/products`, {
    method: "POST",
    body: JSON.stringify({
      organizationId: input.organizationId,
      masterProductId: input.masterProductId,
      name: input.name.trim(),
      sku: null,
      barcode: input.barcode.trim(),
      price: input.price,
      costPrice: input.costPrice,
      stock: input.stock,
      supplyType: "IN_STOCK",
      taxType: "VAT_ABLE",
      cityTaxRate: 0,
      classificationCode: "6212991",
      images: input.imageUrl ? [input.imageUrl] : [],
    }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Бараа бүртгэхэд алдаа гарлаа"),
    );
  }

  const product = (await response.json()) as CreatedProduct;
  return {
    id: product.id,
    sku: product.sku || product.id,
    barcode: product.barcode,
    name: product.name,
    imageUrl: product.images?.[0]?.url ?? input.imageUrl,
    price: Number(product.price) || 0,
    wholesalePrice: null,
    orderPrice: null,
    stockQty: Number(product.stock) || 0,
    taxType: product.taxType || "VAT_ABLE",
    taxRate: product.taxType === "VAT_ABLE" ? 10 : 0,
    cityTaxRate: Number(product.cityTaxRate) || 0,
    classificationCode: product.classificationCode || "6212991",
    taxProductCode: product.taxProductCode || null,
    measureUnit: "pcs",
    isActive: true,
    categoryName: product.businessCategory?.name ?? null,
  };
}
