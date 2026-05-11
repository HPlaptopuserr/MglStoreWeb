import { API, authFetch } from "@/lib/api";
import type { PosProduct } from "../types/pos.types";

type RawProduct = {
  id: string;
  sku: string | null;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
};

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
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      sku: item.sku || item.id,
      name: item.name,
      price: Number(item.price) || 0,
      stockQty: Number(item.stock) || 0,
      taxRate: 0,
      isActive: item.isActive,
    }));
}
