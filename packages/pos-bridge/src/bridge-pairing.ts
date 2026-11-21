import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { postJson, secureApiUrl } from "./bridge-http";

export type BridgeCredentials = {
  bindingId: string;
  registerId: string;
  deviceId: string;
  secret: string;
  apiUrl: string;
  revoked?: boolean;
  terminalId?: string;
};

const credentialsFile = (directory: string) =>
  path.join(directory, "bridge-credentials.json");

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readBridgeCredentials(
  directory: string,
): BridgeCredentials | null {
  const filename = credentialsFile(directory);
  if (!fs.existsSync(filename)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filename, "utf8")) as unknown;
  } catch {
    throw new Error("Bridge credentials are damaged; reconnect from Admin");
  }
  const value = record(parsed);
  if (
    !value ||
    !["bindingId", "registerId", "deviceId", "secret", "apiUrl"].every(
      (key) => typeof value[key] === "string",
    ) ||
    !/^[a-f0-9]{64}$/i.test(String(value.secret)) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(String(value.deviceId)) ||
    (value.revoked !== undefined && typeof value.revoked !== "boolean") ||
    (value.terminalId !== undefined &&
      (typeof value.terminalId !== "string" ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(value.terminalId)))
  )
    throw new Error("Bridge credentials are damaged; reconnect from Admin");
  secureApiUrl(String(value.apiUrl));
  const credentials = value as BridgeCredentials;
  const state = readBridgeState(directory, credentials);
  return {
    ...credentials,
    ...state,
    ...(credentials.revoked === true || state.revoked === true
      ? { revoked: true }
      : {}),
  };
}

type BridgeState = { revoked?: boolean; terminalId?: string };
const stateFile = (directory: string, credentials: BridgeCredentials) =>
  path.join(
    directory,
    `bridge-state-${crypto.createHash("sha256").update(credentials.secret).digest("hex")}.json`,
  );

function readBridgeState(
  directory: string,
  credentials: BridgeCredentials,
): BridgeState {
  const filename = stateFile(directory, credentials);
  if (!fs.existsSync(filename)) return {};
  let state: unknown;
  try {
    state = JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch {
    throw new Error("Bridge state is damaged; reconnect from Admin");
  }
  const value = record(state);
  if (
    !value ||
    (value.revoked !== undefined && typeof value.revoked !== "boolean") ||
    (value.terminalId !== undefined &&
      (typeof value.terminalId !== "string" ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(value.terminalId)))
  )
    throw new Error("Bridge state is damaged; reconnect from Admin");
  return value as BridgeState;
}

// Background processes write only their own generation's state. They must never
// overwrite the active credential pointer after a successful re-pair.
export function writeBridgeState(
  directory: string,
  credentials: BridgeCredentials,
  update: BridgeState,
) {
  const previous = readBridgeState(directory, credentials);
  writePrivateJson(stateFile(directory, credentials), {
    ...previous,
    ...update,
    revoked:
      previous.revoked === true ||
      update.revoked === true ||
      credentials.revoked === true,
  });
}

export function markBridgeRevokedIfCurrent(
  directory: string,
  credentials: BridgeCredentials,
) {
  const current = readBridgeCredentials(directory);
  if (
    current?.bindingId === credentials.bindingId &&
    current.deviceId === credentials.deviceId &&
    current.secret === credentials.secret
  )
    writeBridgeState(directory, credentials, { revoked: true });
}

function writePrivateJson(filename: string, value: unknown) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const temporary = `${filename}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, JSON.stringify(value));
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, filename);
}

export function writeBridgeCredentials(
  directory: string,
  credentials: BridgeCredentials,
) {
  writePrivateJson(credentialsFile(directory), credentials);
}

export function assertPairingSafe(directory: string) {
  if (fs.existsSync(path.join(directory, "terminal.lock")))
    throw new Error(
      "Terminal has an unresolved operation. Reconcile it before reconnecting; do not delete the journal.",
    );
}

export function stableDeviceId(directory: string): string {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "device-id");
  if (!fs.existsSync(filename)) {
    const descriptor = fs.openSync(filename, "wx", 0o600);
    try {
      fs.writeFileSync(descriptor, crypto.randomBytes(16).toString("hex"));
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  }
  const id = fs.readFileSync(filename, "utf8").trim();
  if (!/^[a-f0-9]{32}$/.test(id))
    throw new Error("Bridge device identity is damaged");
  return id;
}

export function parsePairingInput(
  raw: string,
  defaultApiUrl = "https://mgl-api.onrender.com/api",
) {
  let code = raw.trim();
  let apiUrl = defaultApiUrl.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(code)) {
    const activation = new URL(code);
    code = decodeURIComponent(activation.hash.slice(1));
    activation.hash = "";
    if (!activation.pathname.endsWith("/pos/bridge/pair"))
      throw new Error("Invalid Admin activation link");
    secureApiUrl(activation.toString());
    apiUrl = activation.toString().replace(/\/pos\/bridge\/pair$/, "");
  }
  secureApiUrl(apiUrl);
  if (!/^[A-F0-9]{20}$/.test(code.replace(/-/g, "").toUpperCase()))
    throw new Error(
      "Enter the one-time code or connection link copied from Admin",
    );
  return { code, apiUrl };
}

export async function pairBridge(
  directory: string,
  input: string,
  defaultApiUrl?: string,
): Promise<BridgeCredentials> {
  assertPairingSafe(directory);
  const { code, apiUrl } = parsePairingInput(input, defaultApiUrl);
  const deviceId = stableDeviceId(directory);
  const response = await postJson(`${apiUrl}/pos/bridge/pair`, {
    code,
    deviceId,
  });
  const value = record(response.data);
  if (response.status !== 200)
    throw new Error(
      typeof value?.message === "string"
        ? value.message.slice(0, 300)
        : "Pairing failed; request a new code from Admin",
    );
  if (
    !value ||
    typeof value.bindingId !== "string" ||
    typeof value.registerId !== "string" ||
    value.deviceId !== deviceId ||
    typeof value.secret !== "string" ||
    !/^[a-f0-9]{64}$/i.test(value.secret)
  )
    throw new Error("Invalid pairing response; request a new Admin code");
  // Re-check before replacing existing credentials if another local operation began during the exchange.
  assertPairingSafe(directory);
  const credentials: BridgeCredentials = {
    bindingId: value.bindingId,
    registerId: value.registerId,
    deviceId,
    secret: value.secret,
    apiUrl,
  };
  writeBridgeCredentials(directory, credentials);
  return credentials;
}
