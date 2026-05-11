import type { CardAttempt, PushEcrResult, SettlementResult } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type { CardAttempt, CardAttemptStatus, PushEcrResult, SettlementResult } from "@mgl/types";

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

export function cancelPushEcr(terminalId: string): Promise<PushEcrResult> {
  return posRequest<PushEcrResult>("/pos/payments/push-ecr/cancel", {
    method: "POST",
    body: { terminalId },
  });
}

export function voidPushEcr(payload: {
  terminalId: string;
  traceno: string;
  skipPrint?: boolean;
}): Promise<PushEcrResult> {
  return posRequest<PushEcrResult>("/pos/payments/push-ecr/void", {
    method: "POST",
    body: payload,
  });
}

export function settlePushEcr(
  terminalId: string,
  skipPrint = false,
): Promise<SettlementResult> {
  return posRequest<SettlementResult>("/pos/payments/push-ecr/settlement", {
    method: "POST",
    body: { terminalId, skipPrint },
  });
}
