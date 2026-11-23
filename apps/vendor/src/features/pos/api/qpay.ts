import type { RecoverableQPayInvoice } from "../utils/qpay-server-recovery";
import type { SalePayload } from "../types/pos.types";
import { requirePaymentRecoverySupport } from "./payment-capabilities";
import type { QPayInvoice } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type { QPayInvoice, QPayInvoiceStatus } from "@mgl/types";

export async function createQPayInvoice(payload: {
  requestId?: string;
  checkout?: { clientSaleId: string; branchId: string; shiftId: string; lines: SalePayload["lines"]; autoFinalizeEligible?: boolean };
  amount: number;
  registerId?: string;
  organizationId?: string;
}): Promise<QPayInvoice> {
  await requirePaymentRecoverySupport(Boolean(payload.checkout));
  return posRequest<QPayInvoice>("/pos/payments/qpay/invoice", {
    signal: AbortSignal.timeout(90_000),
    method: "POST",
    body: {
      requestId: payload.requestId,
      checkout: payload.checkout,
      amount: payload.amount,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
    },
  });
}

export function getQPayInvoiceStatus(invoiceId: string, signal?: AbortSignal, refreshProvider = true): Promise<QPayInvoice & { reviewArchiveId?: string; recoveryRequired?: boolean; recoveryMessage?: string; providerCancellationConfirmed?: boolean }> {
  const timeout = AbortSignal.timeout(15_000);
  return posRequest<QPayInvoice>(`/pos/payments/qpay/status/${encodeURIComponent(invoiceId)}?refresh=${refreshProvider ? "1" : "0"}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
}

export function confirmQPayInvoice(invoiceId: string): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/confirm", {
    method: "POST",
    body: { invoiceId },
  });
}

export function cancelQPayInvoice(invoiceId: string, requireProviderCancellation = false, signal?: AbortSignal): Promise<QPayInvoice & { providerCancellationConfirmed?: boolean }> {
  const timeout = AbortSignal.timeout(15_000);
  return posRequest<QPayInvoice>("/pos/payments/qpay/cancel", {
    method: "POST", body: { invoiceId, requireProviderCancellation }, signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}

export function getQPayCheckoutRecovery(registerId: string, clientSaleId: string, signal?: AbortSignal): Promise<{ invoices: RecoverableQPayInvoice[] }> {
  const timeout = AbortSignal.timeout(15_000);
  return posRequest(`/pos/payments/qpay/recovery?${new URLSearchParams({ registerId, clientSaleId })}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
}

export function archiveExpiredQPayCheckout(invoiceId: string, snapshot: string, signal?: AbortSignal): Promise<{ archiveId: string }> {
  const timeout = AbortSignal.timeout(15_000);
  return posRequest("/pos/payments/qpay/review", {
    method: "POST", body: { invoiceId, snapshot }, signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}
