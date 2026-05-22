import type { CardAttempt, PushEcrResult, SettlementResult } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type { CardAttempt, CardAttemptStatus, PushEcrResult, SettlementResult } from "@mgl/types";

export function createCardAttempt(payload: {
  amount: number;
  terminalId?: string;
  bridgeUrl?: string;
  registerId?: string;
  organizationId?: string;
  clientBridge?: boolean;
}): Promise<CardAttempt> {
  return posRequest<CardAttempt>("/pos/payments/card/authorize", {
    method: "POST",
    body: {
      amount: payload.amount,
      terminalId: payload.terminalId || "terminal-1",
      bridgeUrl: payload.bridgeUrl || null,
      registerId: payload.registerId || null,
      organizationId: payload.organizationId || null,
      clientBridge: payload.clientBridge === true,
    },
  });
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
  const health = await getClientBridgeHealth(bridgeUrl, payload.signal);
  const provider = String(health.provider || "").toLowerCase();

  if (provider && provider !== "android-pgw") {
    throw new Error(`POS bridge provider ${health.provider} байна. BRIDGE_PROVIDER=android-pgw болгож bridge restart хийнэ үү.`);
  }

  if (health.ok === false) {
    throw new Error(health.message || "Android PGW terminal холбогдоогүй байна");
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
}): Promise<CardAttempt> {
  return posRequest<CardAttempt>("/pos/payments/card/client-bridge-result", {
    method: "POST",
    body: payload,
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
