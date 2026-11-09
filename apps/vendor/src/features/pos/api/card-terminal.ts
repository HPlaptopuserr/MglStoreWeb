import type { CardAttempt, PushEcrResult, SettlementResult, SalePayload } from "@mgl/types";
import { PosApiError, posRequest } from "./_pos-client";

export type { CardAttempt, CardAttemptStatus, PushEcrResult, SettlementResult } from "@mgl/types";

export async function createCardAttempt(payload: {
  attemptId?: string;
  amount: number;
  terminalId?: string;
  bridgeUrl?: string;
  registerId?: string;
  organizationId?: string;
  clientBridge?: boolean;
  cardFlowVersion?: 2;
  signal?: AbortSignal;
  checkout?: { clientSaleId: string; branchId: string; shiftId: string; lines: SalePayload["lines"] };
}): Promise<CardAttempt> {
  const path = payload.cardFlowVersion === 2 ? "/pos/payments/card/authorize-v2" : "/pos/payments/card/authorize";
  const options = {
    method: "POST" as const,
    signal: payload.signal,
    body: {
      attemptId: payload.attemptId,
      amount: payload.amount,
      terminalId: payload.terminalId || "terminal-1",
      bridgeUrl: payload.bridgeUrl || null,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
      clientBridge: payload.clientBridge === true,
      checkout: payload.checkout,
    },
  };
  try {
    return await posRequest<CardAttempt>(path, options);
  } catch (error: unknown) {
    // A rolling deploy may lose a response. Only retry the exact same persisted
    // identity; the server returns the original invoice instead of charging again.
    const transient = error instanceof TypeError || (error instanceof PosApiError && [408, 429, 500, 502, 503, 504].includes(error.status));
    if (payload.signal?.aborted || !payload.attemptId || !transient) throw error;
    return posRequest<CardAttempt>(path, options);
  }
}

export type ClientBridgeChargeResult = {
  status?: string;
  transactionId?: string;
  message?: string;
  [key: string]: unknown;
};

type ClientBridgeHealth = {
  ok?: boolean;
  provider?: string;
  message?: string;
  serialPath?: string;
  raw?: string;
  [key: string]: unknown;
};

export class ClientBridgeNotStartedError extends Error {}

/** Transport failures never authorize a payment or switch its configured mode. */
export function clientBridgeFailureResult(error: unknown): ClientBridgeChargeResult {
  const notStarted = error instanceof ClientBridgeNotStartedError;
  return {
    status: notStarted ? "DECLINED" : "PENDING",
    message: notStarted
      ? "Терминалтай холбогдож чадсангүй. Төлбөр эхлээгүй. Холболтоо шалгаад дахин оролдоно уу."
      : "Терминалын эцсийн хариу ирээгүй байна. Төлсөн бол дахин карт уншуулахгүйгээр төлөвийг шалгана уу.",
  };
}

async function getClientBridgeHealth(bridgeUrl: string, signal?: AbortSignal): Promise<ClientBridgeHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  const abortFromCaller = () => controller.abort();

  try {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    const res = await fetch(`${bridgeUrl}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as ClientBridgeHealth;

    if (!res.ok) {
      throw new Error(String(data.message || `Bridge health HTTP ${res.status}`));
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("POS bridge health шалгах хугацаа дууслаа");
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortFromCaller);
    window.clearTimeout(timeout);
  }
}

export async function chargeClientBridge(payload: {
  bridgeUrl: string;
  attemptId: string;
  amount: number;
  terminalId: string;
  signal?: AbortSignal;
}): Promise<ClientBridgeChargeResult> {
  const bridgeUrl = payload.bridgeUrl.replace(/\/$/, "");
  let health: ClientBridgeHealth;
  try {
    health = await getClientBridgeHealth(bridgeUrl, payload.signal);
  } catch (error: unknown) {
    if (payload.signal?.aborted) throw error;
    // No /charge request was sent. This attempt can fail without recording
    // a manual payment or claiming that the bank approved it.
    throw new ClientBridgeNotStartedError(error instanceof Error ? error.message : "Терминал холбогдоогүй");
  }
  const provider = String(health.provider || "").toLowerCase();

  if (provider && provider !== "android-pgw") {
    throw new ClientBridgeNotStartedError(`POS bridge provider ${health.provider} байна. BRIDGE_PROVIDER=android-pgw болгож bridge restart хийнэ үү.`);
  }

  if (health.ok === false) {
    throw new ClientBridgeNotStartedError(health.message || "Android PGW terminal холбогдоогүй байна");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  const abortFromCaller = () => controller.abort();

  try {
    if (payload.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    payload.signal?.addEventListener("abort", abortFromCaller, { once: true });

    const res = await fetch(`${bridgeUrl}/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: payload.attemptId,
        amount: payload.amount,
        terminalId: payload.terminalId,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();

    let data: ClientBridgeChargeResult = {};
    if (text) {
      try {
        data = JSON.parse(text) as ClientBridgeChargeResult;
      } catch {
        data = { status: "FAILED", message: text.slice(0, 220) };
      }
    }

    if (!res.ok) {
      throw new Error(String(data.message || `Bridge HTTP ${res.status}`));
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Terminal хариу өгөх хугацаа дууслаа");
    }
    throw error;
  } finally {
    payload.signal?.removeEventListener("abort", abortFromCaller);
    window.clearTimeout(timeout);
  }
}

export function submitClientBridgeResult(payload: {
  attemptId: string;
  result: ClientBridgeChargeResult;
  cardFlowVersion?: 2;
}): Promise<CardAttempt> {
  return posRequest<CardAttempt>(payload.cardFlowVersion === 2 ? "/pos/payments/card/client-bridge-result-v2" : "/pos/payments/card/client-bridge-result", {
    method: "POST",
    body: payload,
  });
}

export function getCardAttemptStatus(attemptId: string, signal?: AbortSignal): Promise<CardAttempt> {
  const timeout = AbortSignal.timeout(40_000);
  return posRequest<CardAttempt>(`/pos/payments/card/status/${encodeURIComponent(attemptId)}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
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
