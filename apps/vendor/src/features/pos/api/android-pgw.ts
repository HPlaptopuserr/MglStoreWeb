import { posRequest } from "./_pos-client";

export type PgwOperationInput = {
  registerId: string;
  operation: "void" | "settlement" | "cancel";
  attemptId?: string;
  shiftId?: string;
};
export type PgwOperationResult = {
  succeed: boolean;
  status: string;
  message?: string;
  details?: Record<string, unknown>;
};

type DeclineProof = { body: string; signature: string };
const declinedCommands = new Map<string, DeclineProof>();

/** Relay server signatures; no shared secret is ever exposed to the browser. */
export async function runAndroidPgwCommand(
  input: PgwOperationInput,
): Promise<PgwOperationResult> {
  const endpoint = "/pos/payments/android-pgw/command";
  const key = `pgw-command:${input.registerId}:${input.operation}:${input.attemptId || input.shiftId || ""}`;
  let previousDecline = declinedCommands.get(key);
  if (!previousDecline && typeof sessionStorage !== "undefined") {
    try {
      previousDecline = JSON.parse(sessionStorage.getItem(key) || "null") as
        | DeclineProof
        | undefined;
    } catch {
      /* storage may be unavailable */
    }
  }
  const request = { ...input, ...(previousDecline ? { previousDecline } : {}) };
  const authorization = await posRequest<{
    command: Record<string, string>;
    bridgeUrl: string;
    signature: string;
  }>(endpoint, {
    method: "POST",
    body: request,
  });
  const response = await fetch(
    `${authorization.bridgeUrl.replace(/\/$/, "")}/terminal/command`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mgl-bridge-signature": authorization.signature,
      },
      body: JSON.stringify(authorization.command),
      signal: AbortSignal.timeout(130_000),
      cache: "no-store",
    },
  );
  const body = await response.text();
  if (!response.ok)
    throw new Error(
      "Терминалын хариу баталгаажаагүй. Өмнөх үйлдлийг шалгана уу.",
    );
  const signature = response.headers.get("x-mgl-bridge-signature");
  const result = await posRequest<PgwOperationResult>(endpoint, {
    method: "POST",
    body: {
      ...request,
      bridgeResponse: body,
      bridgeSignature: signature,
    },
  });
  if (
    result.status === "DECLINED" &&
    input.operation !== "cancel" &&
    signature
  ) {
    const proof = { body, signature };
    declinedCommands.set(key, proof);
    try {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem(key, JSON.stringify(proof));
    } catch {
      /* a retry can still use the in-memory proof */
    }
  }
  return result;
}
