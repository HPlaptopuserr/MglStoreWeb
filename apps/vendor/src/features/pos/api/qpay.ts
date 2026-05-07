import { posRequest } from "./_pos-client";

export type QPayInvoiceStatus = "PENDING" | "PAID" | "EXPIRED";

export type QPayInvoice = {
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  status: QPayInvoiceStatus;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
};

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
