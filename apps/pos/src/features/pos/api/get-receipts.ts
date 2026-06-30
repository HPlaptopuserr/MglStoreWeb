import type { PosReceipt } from "../types/receipt.types";
import { posRequest } from "./_pos-client";

export function getReceipts(shiftId: string, signal?: AbortSignal): Promise<PosReceipt[]> {
  return posRequest<PosReceipt[]>(`/pos/receipts?shiftId=${encodeURIComponent(shiftId)}`, {
    signal,
  });
}
