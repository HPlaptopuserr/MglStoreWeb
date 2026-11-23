import type { PosReceipt } from "../types/receipt.types";
import { posRequest } from "./_pos-client";

export type PendingQrReceipt = {
  invoiceId: string;
  clientSaleId: string;
  receipt: PosReceipt;
  fiscalPending: boolean;
};
export type QrFiscalClaim = { claimed?: boolean; resumed?: boolean; alreadyIssued?: boolean; receipt?: PosReceipt };

export function getPendingQrReceipts(registerId: string, signal?: AbortSignal): Promise<{ receipts: PendingQrReceipt[] }> {
  const timeout = AbortSignal.timeout(15_000);
  return posRequest(`/pos/payments/qpay/pending-receipts?${new URLSearchParams({ registerId })}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}

export function claimQrFiscalReceipt(invoiceId: string, saleId: string, requestId: string): Promise<QrFiscalClaim> {
  return posRequest(`/pos/payments/qpay/pending-receipts/${encodeURIComponent(invoiceId)}/claim`, {
    method: "POST", body: { requestId, saleId }, signal: AbortSignal.timeout(20_000),
  });
}
