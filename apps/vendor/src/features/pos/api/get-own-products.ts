import type { PosProduct } from "../types/pos.types";
import type { CatalogResponse } from "../catalog/catalog-model";
import { getProductCatalog } from "./get-pos-products";

export function getOwnCatalog(
  organizationId: string,
  signal?: AbortSignal,
  etag?: string | null,
): Promise<CatalogResponse> {
  return getProductCatalog(
    new URLSearchParams({ organizationId }),
    signal,
    etag,
  );
}

export async function getOwnProducts(
  organizationId: string,
  signal?: AbortSignal,
): Promise<PosProduct[]> {
  const response = await getOwnCatalog(organizationId, signal);
  if (response.unchanged) throw new Error("Барааны бүрэн жагсаалт ирсэнгүй.");
  return response.products;
}
