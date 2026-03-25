import { posRequest } from "./_pos-client";

export type CardAttemptStatus = "PENDING" | "APPROVED" | "DECLINED" | "FAILED";
export type QPayInvoiceStatus = "PENDING" | "PAID" | "EXPIRED";

export type CardAttempt = {
  attemptId: string;
  amount: number;
  terminalId: string;
  status: CardAttemptStatus;
  transactionId?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
};

export type QPayInvoice = {
  invoiceId: string;
  amount: number;
  qrText: string;
  status: QPayInvoiceStatus;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
};

export function createCardAttempt(payload: {
  amount: number;
  terminalId?: string;
  bridgeUrl?: string;
}): Promise<CardAttempt> {
  return posRequest<CardAttempt>("/pos/payments/card/authorize", {
    method: "POST",
    body: {
      amount: payload.amount,
      terminalId: payload.terminalId || "terminal-1",
      bridgeUrl: payload.bridgeUrl || null,
    },
  });
}

export function getCardAttemptStatus(attemptId: string): Promise<CardAttempt> {
  return posRequest<CardAttempt>(`/pos/payments/card/status/${attemptId}`);
}

export function createQPayInvoice(payload: { amount: number }): Promise<QPayInvoice> {
  return posRequest<QPayInvoice>("/pos/payments/qpay/invoice", {
    method: "POST",
    body: {
      amount: payload.amount,
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

/* ─── Register config ─────────────────────────────────────────────── */

export type RegisterConfig = {
  id: string;
  name: string;
  label: string | null;
  cardEnabled: boolean;
  cardProviderType: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  qpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  branch: { id: string; name: string };
};

export function fetchRegisterConfig(registerId: string): Promise<RegisterConfig> {
  return posRequest<RegisterConfig>(
    `/pos/register-config?registerId=${encodeURIComponent(registerId)}`,
  );
}
