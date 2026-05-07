import { posRequest } from "./_pos-client";

export type CardAttemptStatus = "PENDING" | "APPROVED" | "DECLINED" | "FAILED";

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

export function createCardAttempt(payload: {
  amount: number;
  terminalId?: string;
  bridgeUrl?: string;
  registerId?: string;
  organizationId?: string;
}): Promise<CardAttempt> {
  return posRequest<CardAttempt>("/pos/payments/card/authorize", {
    method: "POST",
    body: {
      amount: payload.amount,
      terminalId: payload.terminalId || "terminal-1",
      bridgeUrl: payload.bridgeUrl || null,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
    },
  });
}

export function getCardAttemptStatus(attemptId: string): Promise<CardAttempt> {
  return posRequest<CardAttempt>(`/pos/payments/card/status/${attemptId}`);
}

export function cancelPushEcr(terminalId: string): Promise<{ succeed: boolean; message?: string }> {
  return posRequest("/pos/payments/push-ecr/cancel", {
    method: "POST",
    body: { terminalId },
  });
}

export function voidPushEcr(payload: {
  terminalId: string;
  traceno: string;
  skipPrint?: boolean;
}): Promise<{ succeed: boolean; message?: string }> {
  return posRequest("/pos/payments/push-ecr/void", {
    method: "POST",
    body: payload,
  });
}
