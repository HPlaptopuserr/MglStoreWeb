import { requirePaymentRecoverySupport } from "./payment-capabilities";
import type { QPayInvoice } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type { QPayInvoice, QPayInvoiceStatus } from "@mgl/types";

export async function createQPayInvoice(payload: {
  requestId?: string;
  amount: number;
  registerId?: string;
  organizationId?: string;
}): Promise<QPayInvoice> {
  await requirePaymentRecoverySupport();
  return posRequest<QPayInvoice>("/pos/payments/qpay/invoice", {
    signal: AbortSignal.timeout(90_000),
    method: "POST",
    body: {
      requestId: payload.requestId,
      amount: payload.amount,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
    },
  });
}

export function getQPayInvoiceStatus(invoiceId: string, signal?: AbortSignal): Promise<QPayInvoice> {
  const timeout = AbortSignal.timeout(70_000);
  return posRequest<QPayInvoice>(`/pos/payments/qpay/status/${encodeURIComponent(invoiceId)}?refresh=1`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
}

export function confirmQPayInvoice(invoiceId: string): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/confirm", {
    method: "POST",
    body: { invoiceId },
  });
}

export function cancelQPayInvoice(invoiceId: string): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/cancel", {
    method: "POST", body: { invoiceId }, signal: AbortSignal.timeout(90_000),
  });
}
