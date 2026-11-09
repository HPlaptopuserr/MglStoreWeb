import type { RecoverableCardPayment, VerifiedCardRecovery, DeferredCardCheckout } from "@mgl/types";
import { posRequest } from "./_pos-client";

export const getDeferredCardCheckouts = (registerId: string) =>
  posRequest<{ checkouts: DeferredCardCheckout[] }>(`/pos/payments/card/deferred?${new URLSearchParams({ registerId })}`);
export const deferCardCheckout = (registerId: string, attemptId: string, clientSaleId: string, snapshot: string) =>
  posRequest<DeferredCardCheckout>(`/pos/payments/card/deferred/${encodeURIComponent(attemptId)}`, {
    method: "POST", body: { registerId, clientSaleId, snapshot, kind: "RETAIL" },
  });
export const acknowledgeDeferredCardCheckout = (registerId: string, attemptId: string) =>
  posRequest<DeferredCardCheckout>(`/pos/payments/card/deferred/${encodeURIComponent(attemptId)}`, {
    method: "POST", body: { registerId, resume: true },
  });

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
