import { TtlCache } from "../lib/ttl-cache";

export const productListCache = new TtlCache<unknown>(250, 45_000);

export function invalidatePublicProductListCache() {
  productListCache.clear();
}
