import type { QPayInvoice } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type { QPayInvoice, QPayInvoiceStatus } from "@mgl/types";

export function createQPayInvoice(payload: {
  amount: number;
  registerId?: string;
  organizationId?: string;
}): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/invoice", {
    method: "POST",
    body: {
      amount: payload.amount,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
    },
  });
}

export function getQPayInvoiceStatus(invoiceId: string): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>(`/pos/payments/qpay/status/${invoiceId}`);
}

export function confirmQPayInvoice(invoiceId: string): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/confirm", {
    method: "POST",
    body: { invoiceId },
  });
}
