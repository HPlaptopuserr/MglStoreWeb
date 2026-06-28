import type { PosProduct } from "../types/pos.types";
import { posRequest } from "./_pos-client";

export function getPosProducts(branchId: string, signal?: AbortSignal): Promise<PosProduct[]> {
  return posRequest<PosProduct[]>(`/pos/products?branchId=${encodeURIComponent(branchId)}`, {
    signal,
  });
}
