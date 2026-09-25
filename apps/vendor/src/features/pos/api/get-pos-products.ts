import type { PosProduct } from "../types/pos.types";
import { API } from "@/lib/api";
import { requestCatalog } from "../catalog/catalog-request";
import {
  isCompleteProductList,
  type CatalogResponse,
} from "../catalog/catalog-model";

export async function getProductCatalog(
  params: URLSearchParams,
  signal?: AbortSignal,
  etag?: string | null,
): Promise<CatalogResponse> {
  const response = await requestCatalog(
    `${API}/pos/products?${params}`,
    signal,
    etag,
  );
  if (response.unchanged) return response;
  if (!isCompleteProductList(response.rows))
    throw new Error("Барааны мэдээлэл дутуу эсвэл буруу ирлээ.");
  return { ...response, products: response.rows };
}

export function getPosCatalog(
  branchId: string,
  signal?: AbortSignal,
  etag?: string | null,
  organizationId?: string,
): Promise<CatalogResponse> {
  const params = new URLSearchParams({ branchId });
  if (organizationId) params.set("organizationId", organizationId);
  return getProductCatalog(params, signal, etag);
}

export async function getPosProducts(
  branchId: string,
  signal?: AbortSignal,
): Promise<PosProduct[]> {
  const response = await getPosCatalog(branchId, signal);
  if (response.unchanged) throw new Error("Барааны бүрэн жагсаалт ирсэнгүй.");
  return response.products;
}
