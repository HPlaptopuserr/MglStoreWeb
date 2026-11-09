import type { RecoverableCardPayment, VerifiedCardRecovery, TerminalCardPayment, TerminalCardRecoveryResult } from "@mgl/types";
import { posRequest } from "./_pos-client";

export function getRecoverableCardPayments(
  registerId: string,
  date: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ registerId, date });
  return posRequest<{ payments: RecoverableCardPayment[]; truncated: boolean }>(
    `/pos/payments/card/recovery?${params}`,
    { signal },
  );
}

export function verifyCardRecovery(
  attemptId: string,
  registerId: string,
  amount: number,
) {
  return posRequest<VerifiedCardRecovery>(
    `/pos/payments/card/recovery/${encodeURIComponent(attemptId)}/verify`,
    {
      method: "POST",
      body: { registerId, amount },
    },
  );
}

export function getTerminalCardPayments(registerId: string, signal: AbortSignal) {
  return posRequest<{ payments: TerminalCardPayment[]; truncated: boolean }>(
    `/pos/payments/card/terminal-recovery?${new URLSearchParams({ registerId })}`, { signal },
  );
}

export function checkTerminalCardPayment(registerId: string, attemptId: string) {
  return posRequest<TerminalCardRecoveryResult>(
    `/pos/payments/card/terminal-recovery/${encodeURIComponent(attemptId)}/check`,
    { method: "POST", body: { registerId } },
  );
}
