import { posRequest } from "./_pos-client";

export type VoidSaleResult = {
  ok: boolean;
  message: string;
};

export function voidSale(saleId: string, reason: string): Promise<VoidSaleResult> {
  return posRequest<VoidSaleResult>(`/pos/sales/${encodeURIComponent(saleId)}/void`, {
    method: "POST",
    body: { reason },
  });
}
