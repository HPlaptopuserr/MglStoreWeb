import { useProductCatalog } from "./useProductCatalog";

export function usePosProducts(branchId: string) {
  return useProductCatalog("branch", branchId);
}
