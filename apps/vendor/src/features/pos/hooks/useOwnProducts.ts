import { useProductCatalog } from "./useProductCatalog";

export function useOwnProducts(organizationId: string) {
  return useProductCatalog("organization", organizationId);
}
