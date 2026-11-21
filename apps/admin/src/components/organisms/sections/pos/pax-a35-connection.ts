import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

export type BridgeState =
  | "UNPAIRED"
  | "PAIRING"
  | "CONNECTED"
  | "TERMINAL_OFFLINE"
  | "OFFLINE"
  | "REVOKED";
export type BridgeStatus = {
  state: BridgeState;
  pairedAt: string | null;
  lastSeenAt: string | null;
  pairingExpiresAt: string | null;
  serialPath: string | null;
  terminalId: string | null;
  bridgeVersion: string | null;
  lastError: string | null;
  hasUnresolvedOperation: boolean;
};
export type PairingCode = { code: string; expiresAt: string };

const states = new Set<BridgeState>([
  "UNPAIRED",
  "PAIRING",
  "CONNECTED",
  "TERMINAL_OFFLINE",
  "OFFLINE",
  "REVOKED",
]);
const nullableFields = [
  "pairedAt",
  "lastSeenAt",
  "pairingExpiresAt",
  "serialPath",
  "terminalId",
  "bridgeVersion",
  "lastError",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseBridgeStatus(value: unknown): BridgeStatus {
  if (
    !record(value) ||
    !states.has(value.state as BridgeState) ||
    typeof value.hasUnresolvedOperation !== "boolean" ||
    nullableFields.some(
      (field) => value[field] !== null && typeof value[field] !== "string",
    )
  ) {
    throw new Error("PAX A35 төлөвийн хариу буруу байна.");
  }
  for (const field of ["pairedAt", "lastSeenAt", "pairingExpiresAt"] as const) {
    if (
      value[field] !== null &&
      !Number.isFinite(Date.parse(String(value[field])))
    )
      throw new Error("PAX A35 төлөвийн огноо буруу байна.");
  }
  return {
    state: value.state as BridgeState,
    pairedAt: value.pairedAt as string | null,
    lastSeenAt: value.lastSeenAt as string | null,
    pairingExpiresAt: value.pairingExpiresAt as string | null,
    serialPath: value.serialPath as string | null,
    terminalId: value.terminalId as string | null,
    bridgeVersion: value.bridgeVersion as string | null,
    lastError: value.lastError as string | null,
    hasUnresolvedOperation: value.hasUnresolvedOperation,
  };
}

export function parsePairingCode(value: unknown): PairingCode {
  if (
    !record(value) ||
    typeof value.code !== "string" ||
    !/^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/i.test(value.code) ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.expiresAt))
  ) {
    throw new Error("Холбох кодын хариу буруу байна.");
  }
  return { code: value.code, expiresAt: value.expiresAt };
}

export function pairingActivationLink(api: string, code: string): string {
  const url = new URL(api);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Холбох холбоос HTTPS API хаягтай байх ёстой.");
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/pos/bridge/pair`;
  url.hash = code;
  return url.toString();
}

export function currentBridgeState(
  status: BridgeStatus,
  now: number,
): BridgeState {
  if (
    (status.state === "CONNECTED" || status.state === "TERMINAL_OFFLINE") &&
    (!status.lastSeenAt || now - Date.parse(status.lastSeenAt) >= 150_000)
  )
    return "OFFLINE";
  if (
    status.state === "PAIRING" &&
    !status.pairedAt &&
    status.pairingExpiresAt &&
    now >= Date.parse(status.pairingExpiresAt)
  )
    return "UNPAIRED";
  return status.state;
}

export function pairingSecondsRemaining(
  expiresAt: string,
  now: number,
): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

async function bridgeRequest(
  registerId: string,
  suffix: string,
  method: "GET" | "POST" | "DELETE",
  signal?: AbortSignal,
) {
  const response = await adminFetch(
    `${API}/admin/pos-registers/${encodeURIComponent(registerId)}/bridge${suffix}`,
    {
      method,
      signal,
      ...(method === "POST" ? { body: "{}" } : {}),
    },
  );
  if (!response.ok)
    throw new Error(
      await getApiErrorMessage(
        response,
        "PAX A35 холбоосын үйлдэл амжилтгүй боллоо",
      ),
    );
  return response;
}

export async function getBridgeStatus(
  registerId: string,
  signal?: AbortSignal,
): Promise<BridgeStatus> {
  return parseBridgeStatus(
    await (await bridgeRequest(registerId, "", "GET", signal)).json(),
  );
}

export async function issuePairingCode(
  registerId: string,
  signal?: AbortSignal,
): Promise<PairingCode> {
  return parsePairingCode(
    await (
      await bridgeRequest(registerId, "/pairing-code", "POST", signal)
    ).json(),
  );
}

export async function revokeBridge(
  registerId: string,
  signal?: AbortSignal,
): Promise<void> {
  await bridgeRequest(registerId, "", "DELETE", signal);
}
