import { SerialPort } from "serialport";
import type {
  CardTerminalProvider,
  ChargeParams,
  ChargeResult,
  ProviderHealth,
  TerminalCommand,
} from "./provider.interface";

export type AndroidPgwConfig = {
  path: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 1.5 | 2;
  parity: "none" | "even" | "mark" | "odd" | "space";
  timeoutMs: number;
  healthTimeoutMs: number;
  responseIdleMs: number;
  amountMultiplier: number;
  appendCrlf: boolean;
};

export type PgwValue =
  | string
  | number
  | boolean
  | null
  | PgwValue[]
  | { [key: string]: PgwValue };
export type PgwResponse = Record<string, PgwValue>;
export type PgwTransport = (
  command: string,
  timeoutMs: number,
) => Promise<string>;

type PgwDecision = "APPROVED" | "DECLINED" | "UNKNOWN";

const intEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const boolEnv = (name: string, fallback = false) => {
  const value = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(value);
};

const parseDataBits = (value: number): AndroidPgwConfig["dataBits"] =>
  ([5, 6, 7, 8] as const).includes(value as AndroidPgwConfig["dataBits"])
    ? (value as AndroidPgwConfig["dataBits"])
    : 8;

const parseStopBits = (
  value: string | undefined,
): AndroidPgwConfig["stopBits"] => {
  if (value === "1.5") return 1.5;
  if (value === "2") return 2;
  return 1;
};

const parseParity = (value: string | undefined): AndroidPgwConfig["parity"] => {
  const parity = String(value || "none").toLowerCase();
  return ["none", "even", "mark", "odd", "space"].includes(parity)
    ? (parity as AndroidPgwConfig["parity"])
    : "none";
};

const buildConfig = (): AndroidPgwConfig => ({
  path: String(
    process.env.ANDROID_PGW_PORT || process.env.ANDROID_PGW_PATH || "",
  ).trim(),
  baudRate: intEnv("ANDROID_PGW_BAUD_RATE", 9600),
  dataBits: parseDataBits(intEnv("ANDROID_PGW_DATA_BITS", 8)),
  stopBits: parseStopBits(process.env.ANDROID_PGW_STOP_BITS),
  parity: parseParity(process.env.ANDROID_PGW_PARITY),
  timeoutMs: intEnv("ANDROID_PGW_TIMEOUT_MS", 120_000),
  healthTimeoutMs: intEnv("ANDROID_PGW_HEALTH_TIMEOUT_MS", 4_000),
  responseIdleMs: intEnv("ANDROID_PGW_RESPONSE_IDLE_MS", 700),
  amountMultiplier: intEnv("ANDROID_PGW_AMOUNT_MULTIPLIER", 100),
  appendCrlf: boolEnv("ANDROID_PGW_APPEND_CRLF"),
});

const escapeValue = (value: string | number | boolean) => {
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (/^[A-Za-z0-9._:-]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
};

const buildPgwCommand = (fields: Record<string, string | number | boolean>) =>
  `<{${Object.entries(fields)
    .map(
      ([key, value]) =>
        `${key}:${["rrn", "vendingCancel"].includes(key) ? JSON.stringify(String(value)) : escapeValue(value)}`,
    )
    .join(",")}}>`;

// Split only top-level fields: settlement includes JSON arrays and nested objects.
export const parsePgwResponse = (raw: string): PgwResponse => {
  const body = raw
    .trim()
    .replace(/^</, "")
    .replace(/>$/, "")
    .trim()
    .replace(/^\{/, "")
    .replace(/\}$/, "");
  const fields: string[] = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") depth -= 1;
    else if (char === "," && depth === 0) {
      fields.push(body.slice(start, i));
      start = i + 1;
    }
  }
  if (quoted || depth !== 0) return {};
  fields.push(body.slice(start));
  const result: PgwResponse = {};
  for (const field of fields) {
    const match = field.match(
      /^\s*"?([A-Za-z][A-Za-z0-9_]*)"?\s*:\s*([\s\S]*)$/,
    );
    if (!match) continue;
    const [, key, value] = match;
    const trimmed = value.trim();
    // Preserve leading zeros and long reference numbers without numeric rounding.
    const identifier =
      /^(rrn|data|terminal|terminalid|merchantid|appcode|traceno|pan)$/i.test(
        key,
      );
    if (identifier && !trimmed.startsWith('"'))
      result[key] = !trimmed || trimmed === "null" ? null : trimmed;
    else {
      try {
        result[key] = JSON.parse(trimmed) as PgwValue;
      } catch {
        result[key] = trimmed;
      }
    }
  }
  return result;
};

const normalizeResponseKey = (key: string) =>
  key.replace(/[^a-z0-9]/gi, "").toLowerCase();

const responseValue = (response: PgwResponse, ...aliases: string[]) => {
  const entries = Object.entries(response);
  for (const alias of aliases) {
    const normalizedAlias = normalizeResponseKey(alias);
    const match = entries.find(
      ([key]) => normalizeResponseKey(key) === normalizedAlias,
    );
    if (match) return match[1];
  }
  return null;
};

const responseText = (response: PgwResponse, ...aliases: string[]) =>
  String(responseValue(response, ...aliases) ?? "").trim();

const responseCode = (response: PgwResponse) =>
  responseText(
    response,
    "code",
    "response",
    "responseCode",
    "respCode",
    "resultCode",
  );

const responseMessage = (response: PgwResponse) =>
  responseText(
    response,
    "desc",
    "description",
    "message",
    "responseMessage",
    "errorMessage",
  );

const responseRrn = (response: PgwResponse) =>
  responseText(
    response,
    "rrn",
    "invoice",
    "traceNo",
    "systemRef",
    "transactionId",
  );

const responseApprovalCode = (response: PgwResponse) =>
  responseText(
    response,
    "appCode",
    "approvalCode",
    "approveCode",
    "authCode",
    "authorizationCode",
  );

const responseTerminal = (response: PgwResponse) =>
  responseText(response, "terminal", "terminalId", "tid");

const APPROVED_STATUS_VALUES = new Set([
  "APPROVED",
  "SUCCESS",
  "SUCCEEDED",
  "SUCCESSFUL",
  "TRUE",
]);

const DECLINED_STATUS_VALUES = new Set([
  "CANCEL",
  "CANCELED",
  "CANCELLED",
  "DECLINED",
  "ERROR",
  "FAILED",
  "FAILURE",
  "FALSE",
  "REJECTED",
]);

export const classifyPgwResponse = (response: PgwResponse): PgwDecision => {
  const code = responseCode(response);
  const normalizedCode = code.toUpperCase();
  const status = responseText(
    response,
    "status",
    "result",
    "transactionStatus",
    "paymentStatus",
    "success",
    "succeed",
    "approved",
  ).toUpperCase();

  // Terminal storage/transport errors and duplicate responses cannot prove no debit.
  if (
    [
      "-1",
      "-2",
      "-3",
      "-4",
      "-6",
      "-7",
      "-8",
      "-9",
      "-10",
      "-11",
      "-12",
      "-13",
      "-14",
      "-19",
      "50",
      "52",
      "5",
      "909",
      "903",
      "912",
      "913",
    ].includes(code)
  )
    return "UNKNOWN";
  const approved = APPROVED_STATUS_VALUES.has(status);
  const declined = DECLINED_STATUS_VALUES.has(status);
  if (code && /^0+$/.test(code)) return declined ? "UNKNOWN" : "APPROVED";
  if (["-21", "-22"].includes(code)) {
    const conflictingEvidence = Object.entries(response).some(([key, value]) => {
      const name = normalizeResponseKey(key);
      const text = String(value ?? "").trim();
      return (value !== null && typeof value === "object") ||
        (/^(rrn|invoice|traceno|systemref|transactionid|appcode|approvalcode|approvecode|authcode|authorizationcode)$/.test(name) && Boolean(text)) ||
        (/^(status|result|transactionstatus|paymentstatus|success|succeed|approved)$/.test(name) &&
          (value === true || APPROVED_STATUS_VALUES.has(text.toUpperCase()))) ||
        (/^(code|response|responsecode|respcode|resultcode)$/.test(name) && Boolean(text) && text !== code);
    });
    return conflictingEvidence || approved
      ? "UNKNOWN"
      : "DECLINED";
  }
  if (
    [
      "-5",
      "-20",
      "-23",
      "-25",
      "-26",
      "-27",
      "-28",
      "-29",
      "-33",
      "-34",
      "-36",
      "-37",
      "-39",
      "-41",
      "101",
      "104",
      "105",
      "106",
      "109",
      "110",
      "111",
      "116",
      "117",
      "119",
      "120",
      "123",
      "125",
      "126",
      "127",
      "128",
      "200",
      "201",
      "202",
      "203",
      "204",
      "205",
      "206",
      "207",
      "920",
    ].includes(code)
  )
    return approved ? "UNKNOWN" : "DECLINED";
  if (code) return "UNKNOWN";
  // Legacy classifier callers may receive explicit textual status fields. The
  // documented serial purchase path additionally requires a code and correlation.
  if (declined || DECLINED_STATUS_VALUES.has(normalizedCode)) return "DECLINED";
  if (approved || APPROVED_STATUS_VALUES.has(normalizedCode)) return "APPROVED";
  if (responseRrn(response) && responseApprovalCode(response))
    return "APPROVED";
  return "UNKNOWN";
};

const normalizeFrame = (value: string) => value.trim().replace(/\s+/g, "");

export const completePgwFrames = (raw: string) =>
  raw.match(/<[\s\S]*?>/g) || [];

export const terminalResultFrame = (raw: string, command: string) => {
  const normalizedCommand = normalizeFrame(command);
  const responseFrames = completePgwFrames(raw).filter(
    (frame) =>
      normalizeFrame(frame) !== normalizedCommand &&
      !("vendingCancel" in parsePgwResponse(frame)),
  );
  return responseFrames.at(-1) || "";
};

const withoutCommandEcho = (raw: string, command: string) => {
  const normalizedCommand = normalizeFrame(command);
  return completePgwFrames(raw)
    .reduce(
      (remaining, frame) =>
        normalizeFrame(frame) === normalizedCommand
          ? remaining.replace(frame, "")
          : remaining,
      raw,
    )
    .trim();
};

// Serial idle time is not a message boundary: a USB reply may pause inside a
// quoted description or before its final identity fields. Never finalize that
// prefix as a decline (or approval) before the full structure arrives.
export const hasIncompletePgwResponse = (raw: string): boolean => {
  let quoted = false;
  let escaped = false;
  let angle = false;
  const brackets: string[] = [];
  for (const char of raw) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "<") angle = true;
    else if (char === ">") angle = false;
    else if (char === "{" || char === "[") brackets.push(char);
    else if (char === "}" || char === "]") {
      if (brackets.pop() !== (char === "}" ? "{" : "[")) return true;
    }
  }
  return quoted || angle || brackets.length > 0;
};

/** Only for a result captured on the exclusive original purchase connection,
 * or its durable journal entry with the exact original request fingerprint. */
export const normalizeAndroidPgwCancellation = (
  result: ChargeResult,
  request: ChargeParams,
  expectedMinorAmount = Math.round(request.amount * 100),
): ChargeResult => {
  if (result.status !== "FAILED" || result.provider !== "ANDROID_PGW" || result.manualCard === true ||
      typeof result.raw !== "string" || hasIncompletePgwResponse(result.raw) ||
      !result.parsed || typeof result.parsed !== "object" || Array.isArray(result.parsed)) return result;
  const parsed = result.parsed as PgwResponse;
  const rawParsed = parsePgwResponse(result.raw);
  const code = responseCode(parsed);
  if (!["-21", "-22"].includes(code) || responseCode(rawParsed) !== code || String(result.code) !== code)
    return result;
  const bankKeys = /^(rrn|invoice|traceno|systemref|transactionid|appcode|approvalcode|approvecode|authcode|authorizationcode)$/;
  const statusKeys = /^(status|result|transactionstatus|paymentstatus|success|succeed|approved)$/;
  const safe = (record: Record<string, unknown>) => Object.entries(record).every(([key, value]) => {
    const normalized = normalizeResponseKey(key);
    if (normalized === "parsed" && record === result) return true;
    // Cancellation replies are flat. Unknown nested evidence is not a refusal.
    if (value !== null && typeof value === "object") return false;
    const text = String(value ?? "").trim();
    if (/^(code|response|responsecode|respcode|resultcode)$/.test(normalized) && text && text !== code) return false;
    if (bankKeys.test(normalized) && text) return false;
    if (statusKeys.test(normalized) && (value === true || APPROVED_STATUS_VALUES.has(text.toUpperCase()))) return false;
    if (normalized === "data" && text && text !== request.attemptId) return false;
    if (normalized === "amount" && text && Number(value) !== expectedMinorAmount) return false;
    if (["terminal", "terminalid"].includes(normalized) && text && request.terminalId !== "terminal-1" && text !== request.terminalId) return false;
    return true;
  });
  if (!safe(parsed) || !safe(rawParsed) || !safe(result)) return result;
  const terminals = [parsed, rawParsed, result].flatMap((record) => Object.entries(record)
    .filter(([key]) => ["terminal", "terminalid"].includes(normalizeResponseKey(key)))
    .map(([, value]) => String(value ?? "").trim()).filter(Boolean));
  if (new Set(terminals).size > 1) return result;
  for (const [key, expected] of Object.entries({ attemptId: request.attemptId, requestAmount: request.amount, requestedTerminalId: request.terminalId })) {
    if (result[key] !== undefined && String(result[key]) !== String(expected)) return result;
  }
  return { ...result, status: "DECLINED", message: responseMessage(parsed) || "Terminal payment cancelled" };
};

const isFinalTerminalResponse = (raw: string) => {
  const parsed = parsePgwResponse(raw);
  if (classifyPgwResponse(parsed) !== "UNKNOWN") return true;

  const upper = raw.toUpperCase();
  return (
    upper.includes("CANCEL") ||
    upper.includes("DECLIN") ||
    upper.includes("FAILED") ||
    upper.includes("ERROR")
  );
};

const hasTerminalResponse = (raw: string) => {
  const text = raw.trim();
  if (!text) return false;
  const upper = text.toUpperCase();
  return (
    text.includes("}") ||
    upper.includes("CONNECTED") ||
    upper.includes("CANCEL") ||
    upper.includes("DECLIN") ||
    upper.includes("FAILED") ||
    upper.includes("ERROR") ||
    /\b(code|response_?code|resp_?code|result_?code|status|result|rrn|app_?code)\s*:/i.test(
      text,
    )
  );
};

export class AndroidPgwProvider implements CardTerminalProvider {
  private readonly config: AndroidPgwConfig;
  private activePath: string | null = null;
  private commandQueue: Promise<void> = Promise.resolve();
  private cancelActive: (() => Promise<void>) | null = null;
  private activeAttemptId: string | null = null;

  constructor(
    config: AndroidPgwConfig = buildConfig(),
    private readonly transport?: PgwTransport,
  ) {
    this.config = config;
  }

  async health(): Promise<ProviderHealth> {
    try {
      const command = buildPgwCommand({ connection: "check" });
      const raw = await this.sendCommand(
        command,
        this.config.healthTimeoutMs,
        true,
      );
      const connected = /^CONNECTED$/i.test(
        withoutCommandEcho(raw, command).trim(),
      );
      return {
        ok: connected,
        message: connected
          ? "Android PGW terminal connected"
          : "Android PGW terminal did not return CONNECTED",
        serialPath: this.activePath || this.config.path || "auto",
        raw,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Android PGW terminal health check failed",
        serialPath: this.activePath || this.config.path || "auto",
      };
    }
  }

  async charge(params: ChargeParams): Promise<ChargeResult> {
    const amount = Math.round(params.amount * this.config.amountMultiplier);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error("Invalid PGW amount");
    return this.runExclusive(async () => {
      this.activeAttemptId = params.attemptId;
      try {
        const raw = await this.executeCommand(
          buildPgwCommand({ amount, data: params.attemptId }),
          this.config.timeoutMs,
        );
        const parsed = parsePgwResponse(raw);
        const returnedAmount = responseValue(parsed, "amount");
        const terminal = responseTerminal(parsed);
        const candidate = hasIncompletePgwResponse(raw) ? "UNKNOWN" : classifyPgwResponse(parsed);
        const hasApprovalFields =
          candidate !== "APPROVED" ||
          (returnedAmount !== null && Boolean(terminal));
        const matches =
          hasApprovalFields &&
          responseText(parsed, "data") === params.attemptId &&
          (returnedAmount === null || Number(returnedAmount) === amount) &&
          (!terminal ||
            params.terminalId === "terminal-1" ||
            terminal === params.terminalId);
        const decision =
          matches && responseCode(parsed) !== "" ? candidate : "UNKNOWN";
        return normalizeAndroidPgwCancellation(this.result(
          raw,
          parsed,
          decision,
          matches ? undefined : "Terminal response does not match this payment",
        ), params, amount);
      } finally {
        this.activeAttemptId = null;
      }
    });
  }

  async command(params: TerminalCommand): Promise<ChargeResult> {
    if (params.operation === "cancel") {
      if (
        !params.attemptId ||
        params.attemptId !== this.activeAttemptId ||
        !this.cancelActive
      )
        return {
          status: "FAILED",
          message:
            "No matching active terminal payment; verify the original payment",
        };
      // Write to the open purchase connection rather than queueing behind it.
      // This acknowledgement never declares the original purchase declined.
      await this.cancelActive();
      return {
        status: "FAILED",
        message: "Cancellation requested; await the original terminal result",
      };
    }
    if (params.operation === "void" && !/^\d{1,32}$/.test(params.rrn || ""))
      throw new Error("A bank RRN is required");
    return this.runExclusive(async () => {
      const fields: Record<string, string | number | boolean> =
        params.operation === "void"
          ? { void: true, rrn: params.rrn!, data: params.requestId }
          : { settlement: true, data: params.requestId };
      const raw = await this.executeCommand(
        buildPgwCommand(fields),
        this.config.timeoutMs,
      );
      const parsed = parsePgwResponse(raw);
      const returnedData = responseText(parsed, "data");
      const terminal = responseText(parsed, "terminal", "terminalID");
      // Settlement's documented response does not contain data.
      const matches =
        (params.operation === "settlement"
          ? !returnedData || returnedData === params.requestId
          : returnedData === params.requestId) &&
        (!terminal ||
          params.terminalId === "terminal-1" ||
          terminal === params.terminalId);
      return this.result(
        raw,
        parsed,
        matches && responseCode(parsed) !== ""
          ? classifyPgwResponse(parsed)
          : "UNKNOWN",
      );
    });
  }

  private result(
    raw: string,
    parsed: PgwResponse,
    decision: PgwDecision,
    message?: string,
  ): ChargeResult {
    return {
      status: decision === "UNKNOWN" ? "FAILED" : decision,
      transactionId: responseRrn(parsed) || undefined,
      message:
        message ||
        responseMessage(parsed) ||
        (decision === "UNKNOWN"
          ? "Terminal result requires verification"
          : decision),
      provider: "ANDROID_PGW",
      raw,
      code: responseCode(parsed),
      rrn: responseRrn(parsed) || null,
      terminal: responseTerminal(parsed) || null,
      appCode: responseApprovalCode(parsed) || null,
      entryMode: parsed.entryMode ?? null,
      pan: parsed.pan ?? null,
      amount: parsed.amount ?? null,
      data: parsed.data ?? null,
      parsed,
    };
  }

  private executeCommand(command: string, timeoutMs: number): Promise<string> {
    return this.transport
      ? this.transport(command, timeoutMs)
      : this.sendCommandUnlocked(command, timeoutMs, true);
  }

  private async sendCommand(
    command: string,
    timeoutMs: number,
    allowDiscovery = false,
  ): Promise<string> {
    return this.runExclusive(() =>
      this.transport
        ? this.transport(command, timeoutMs)
        : this.sendCommandUnlocked(command, timeoutMs, allowDiscovery),
    );
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.commandQueue;
    let release: () => void = () => undefined;
    this.commandQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async sendCommandUnlocked(
    command: string,
    timeoutMs: number,
    allowDiscovery = false,
  ): Promise<string> {
    const configuredPath = this.normalizedConfiguredPath();
    const firstPath =
      this.activePath ||
      configuredPath ||
      (allowDiscovery ? await this.discoverConnectedPath() : "");
    if (!firstPath) {
      throw new Error(
        "ANDROID_PGW_PORT is required, or set ANDROID_PGW_PORT=auto to discover the terminal",
      );
    }

    try {
      const raw = await this.sendCommandToPath(firstPath, command, timeoutMs);
      this.activePath = firstPath;
      return raw;
    } catch (error) {
      if (
        configuredPath ||
        !allowDiscovery ||
        !this.isPortMissingError(error)
      ) {
        throw error;
      }
      this.activePath = null;
      const discoveredPath = await this.discoverConnectedPath(firstPath);
      const raw = await this.sendCommandToPath(
        discoveredPath,
        command,
        timeoutMs,
      );
      this.activePath = discoveredPath;
      return raw;
    }
  }

  private normalizedConfiguredPath() {
    const path = this.config.path.trim();
    return path && path.toLowerCase() !== "auto" ? path : "";
  }

  private isPortMissingError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return /file not found|cannot find|opening .* failed/i.test(message);
  }

  private async discoverConnectedPath(excludePath?: string): Promise<string> {
    const ports = await SerialPort.list();
    const candidates = ports
      .map((port) => port.path)
      .filter((path: string) => path && path !== excludePath);

    if (!candidates.length) {
      throw new Error(
        "No Android PGW serial ports detected. Reconnect USB and check Windows Device Manager.",
      );
    }

    const checkCommand = buildPgwCommand({ connection: "check" });
    for (const path of candidates) {
      try {
        const raw = await this.sendCommandToPath(
          path,
          checkCommand,
          this.config.healthTimeoutMs,
        );
        if (/^CONNECTED$/i.test(raw.trim())) {
          return path;
        }
      } catch {
        // Try the next detected COM port.
      }
    }

    throw new Error(
      `Android PGW terminal was not found on detected ports: ${candidates.join(", ")}`,
    );
  }

  private async sendCommandToPath(
    path: string,
    command: string,
    timeoutMs: number,
  ): Promise<string> {
    const payload = this.config.appendCrlf ? `${command}\r\n` : command;

    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let bufferedBytes = 0;
      let settled = false;
      let idleTimer: NodeJS.Timeout | null = null;

      const port = new SerialPort({
        path,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity,
        autoOpen: false,
      });

      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        this.cancelActive = null;
        clearTimeout(timer);
        if (idleTimer) clearTimeout(idleTimer);
        // Keep the error listener attached while/after close. On Windows the
        // serialport binding can emit an asynchronous "Operation aborted"
        // error when close cancels a pending write. Removing every listener
        // first turns that expected cleanup error into an uncaught event and
        // terminates the entire POS Bridge process.
        port.removeAllListeners("data");
        if (port.isOpen) {
          port.close(() => {
            error ? reject(error) : resolve(value || "");
          });
          return;
        }
        error ? reject(error) : resolve(value || "");
      };

      const timer = setTimeout(() => {
        finish(
          new Error(
            `Android PGW terminal response timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      port.on("data", (chunk: Buffer) => {
        bufferedBytes += chunk.length;
        if (bufferedBytes > 256_000) {
          finish(
            new Error(
              "PGW response exceeds maximum size; verify original operation",
            ),
          );
          return;
        }
        chunks.push(chunk);
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        const current = Buffer.concat(chunks).toString("utf8");
        if (/^CONNECTED$/i.test(withoutCommandEcho(current, command).trim())) {
          finish(undefined, withoutCommandEcho(current, command).trim());
          return;
        }

        const framedResult = terminalResultFrame(current, command);
        if (framedResult && !hasIncompletePgwResponse(framedResult) && isFinalTerminalResponse(framedResult)) {
          finish(undefined, framedResult.trim());
          return;
        }

        // Android/USB serial drivers may echo the command first. Waiting for
        // a different, final frame prevents <{amount,data}> from being parsed
        // as a declined payment before the terminal sends its actual result.
        const unframedResult = withoutCommandEcho(current, command);
        const terminalCandidate = framedResult || unframedResult;
        if (
          terminalCandidate &&
          !hasIncompletePgwResponse(terminalCandidate) &&
          hasTerminalResponse(terminalCandidate)
        ) {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            const buffered = Buffer.concat(chunks).toString("utf8");
            finish(
              undefined,
              terminalResultFrame(buffered, command) ||
                withoutCommandEcho(buffered, command),
            );
          }, this.config.responseIdleMs);
        }
      });

      port.on("error", (error: Error | null | undefined) =>
        finish(error || undefined),
      );

      port.open((openError: Error | null | undefined) => {
        if (openError) {
          finish(openError);
          return;
        }
        if (this.activeAttemptId)
          this.cancelActive = () =>
            new Promise<void>((done, fail) => {
              port.write(buildPgwCommand({ vendingCancel: "1" }), (error) =>
                error
                  ? fail(error)
                  : port.drain((drainError) =>
                      drainError ? fail(drainError) : done(),
                    ),
              );
            });
        port.write(payload, (writeError: Error | null | undefined) => {
          if (writeError) {
            finish(writeError);
            return;
          }
          port.drain((drainError: Error | null | undefined) => {
            if (drainError) finish(drainError);
          });
        });
      });
    });
  }
}
