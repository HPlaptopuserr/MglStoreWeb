import type { PosProduct } from "../types/pos.types";
import { posRequest } from "./_pos-client";

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
  const data = await posRequest<RawProduct[]>(
    `/products?organizationId=${encodeURIComponent(organizationId)}`,
    { signal },
  );

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
