import { SerialPort } from "serialport";
import type {
  CardTerminalProvider,
  ChargeParams,
  ChargeResult,
  ProviderHealth,
} from "./provider.interface";

type AndroidPgwConfig = {
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

export type PgwResponse = Record<string, string | number | boolean | null>;

type PgwDecision = "APPROVED" | "DECLINED" | "UNKNOWN";

const intEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const boolEnv = (name: string, fallback = false) => {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(value);
};

const parseDataBits = (value: number): AndroidPgwConfig["dataBits"] =>
  ([5, 6, 7, 8] as const).includes(value as AndroidPgwConfig["dataBits"])
    ? (value as AndroidPgwConfig["dataBits"])
    : 8;

const parseStopBits = (value: string | undefined): AndroidPgwConfig["stopBits"] => {
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
  path: String(process.env.ANDROID_PGW_PORT || process.env.ANDROID_PGW_PATH || "").trim(),
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
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (/^[A-Za-z0-9._:-]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
};

const buildPgwCommand = (fields: Record<string, string | number | boolean>) =>
  `<{${Object.entries(fields)
    .map(([key, value]) => `${key}:${escapeValue(value)}`)
    .join(",")}}>`;

const parseValue = (value: string): string | number | boolean | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^"(.*)"$/, "$1");
};

export const parsePgwResponse = (raw: string): PgwResponse => {
  const body = raw
    .trim()
    .replace(/^</, "")
    .replace(/>$/, "")
    .replace(/^\{/, "")
    .replace(/\}$/, "");

  const result: PgwResponse = {};
  const pairPattern = /"?([A-Za-z][A-Za-z0-9_]*)"?\s*:\s*("(?:\\.|[^"])*"|[^,}]*)/g;
  let match: RegExpExecArray | null;

  while ((match = pairPattern.exec(body))) {
    result[match[1]] = parseValue(match[2]);
  }

  return result;
};

const normalizeResponseKey = (key: string) => key.replace(/[^a-z0-9]/gi, "").toLowerCase();

const responseValue = (response: PgwResponse, ...aliases: string[]) => {
  const entries = Object.entries(response);
  for (const alias of aliases) {
    const normalizedAlias = normalizeResponseKey(alias);
    const match = entries.find(([key]) => normalizeResponseKey(key) === normalizedAlias);
    if (match) return match[1];
  }
  return null;
};

const responseText = (response: PgwResponse, ...aliases: string[]) =>
  String(responseValue(response, ...aliases) ?? "").trim();

const responseCode = (response: PgwResponse) =>
  responseText(response, "code", "response", "responseCode", "respCode", "resultCode");

const responseMessage = (response: PgwResponse) =>
  responseText(response, "desc", "description", "message", "responseMessage", "errorMessage");

const responseRrn = (response: PgwResponse) =>
  responseText(response, "rrn", "invoice", "traceNo", "systemRef", "transactionId");

const responseApprovalCode = (response: PgwResponse) =>
  responseText(response, "appCode", "approvalCode", "approveCode", "authCode", "authorizationCode");

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

  // An explicit failure always wins, even when a declined response happens to
  // include a trace/reference number.
  if (DECLINED_STATUS_VALUES.has(status) || DECLINED_STATUS_VALUES.has(normalizedCode)) {
    return "DECLINED";
  }
  if (/^\d+$/.test(code) && !/^0+$/.test(code)) return "DECLINED";

  if (code && /^0+$/.test(code)) return "APPROVED";
  if (APPROVED_STATUS_VALUES.has(status) || APPROVED_STATUS_VALUES.has(normalizedCode)) {
    return "APPROVED";
  }

  // Some Android PGW releases omit the response code on a successful sale,
  // but still return both the retrieval reference and bank approval code.
  if (responseRrn(response) && responseApprovalCode(response)) return "APPROVED";

  return "UNKNOWN";
};

const normalizeFrame = (value: string) => value.trim().replace(/\s+/g, "");

export const completePgwFrames = (raw: string) => raw.match(/<[\s\S]*?>/g) || [];

export const terminalResultFrame = (raw: string, command: string) => {
  const normalizedCommand = normalizeFrame(command);
  const responseFrames = completePgwFrames(raw).filter(
    (frame) => normalizeFrame(frame) !== normalizedCommand,
  );
  return responseFrames.at(-1) || "";
};

const withoutCommandEcho = (raw: string, command: string) => {
  const normalizedCommand = normalizeFrame(command);
  return completePgwFrames(raw)
    .reduce(
      (remaining, frame) =>
        normalizeFrame(frame) === normalizedCommand ? remaining.replace(frame, "") : remaining,
      raw,
    )
    .trim();
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
    /\b(code|response_?code|resp_?code|result_?code|status|result|rrn|app_?code)\s*:/i.test(text)
  );
};

export class AndroidPgwProvider implements CardTerminalProvider {
  private readonly config: AndroidPgwConfig;
  private activePath: string | null = null;
  private commandQueue: Promise<void> = Promise.resolve();

  constructor(config: AndroidPgwConfig = buildConfig()) {
    this.config = config;
  }

  async health(): Promise<ProviderHealth> {
    try {
      const raw = await this.sendCommand(buildPgwCommand({ connection: "check" }), this.config.healthTimeoutMs, true);
      const connected = raw.toUpperCase().includes("CONNECTED");
      return {
        ok: connected,
        message: connected ? "Android PGW terminal connected" : "Android PGW terminal did not return CONNECTED",
        serialPath: this.activePath || this.config.path || "auto",
        raw,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Android PGW terminal health check failed",
        serialPath: this.activePath || this.config.path || "auto",
      };
    }
  }

  async charge(params: ChargeParams): Promise<ChargeResult> {
    const amount = Math.round(params.amount * this.config.amountMultiplier);
    const command = buildPgwCommand({
      amount,
      data: params.attemptId,
    });

    const raw = await this.sendCommand(command, this.config.timeoutMs, true);
    const parsed = parsePgwResponse(raw);
    const code = responseCode(parsed);
    const decision = classifyPgwResponse(parsed);
    const rrn = responseRrn(parsed);
    const terminal = responseTerminal(parsed);
    const parsedKeys = Object.keys(parsed).join(", ") || "none";
    const message =
      responseMessage(parsed) ||
      (decision === "APPROVED"
        ? "Approved"
        : decision === "DECLINED"
          ? `Declined${code ? ` (${code})` : ""}`
          : `Terminal result was not recognized (fields: ${parsedKeys})`);

    return {
      status: decision === "UNKNOWN" ? "FAILED" : decision,
      transactionId: rrn || String(parsed.data ?? params.attemptId),
      message,
      provider: "ANDROID_PGW",
      raw,
      code,
      rrn: rrn || null,
      terminal: terminal || null,
      appCode: parsed.appCode ?? null,
      entryMode: parsed.entryMode ?? null,
      pan: parsed.pan ?? null,
      amount: parsed.amount ?? amount,
      data: parsed.data ?? params.attemptId,
      parsed,
    };
  }

  private async sendCommand(command: string, timeoutMs: number, allowDiscovery = false): Promise<string> {
    return this.runExclusive(() => this.sendCommandUnlocked(command, timeoutMs, allowDiscovery));
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

  private async sendCommandUnlocked(command: string, timeoutMs: number, allowDiscovery = false): Promise<string> {
    const configuredPath = this.normalizedConfiguredPath();
    const firstPath = this.activePath || configuredPath || (allowDiscovery ? await this.discoverConnectedPath() : "");
    if (!firstPath) {
      throw new Error("ANDROID_PGW_PORT is required, or set ANDROID_PGW_PORT=auto to discover the terminal");
    }

    try {
      const raw = await this.sendCommandToPath(firstPath, command, timeoutMs);
      this.activePath = firstPath;
      return raw;
    } catch (error) {
      if (!allowDiscovery || !this.isPortMissingError(error)) {
        throw error;
      }
      this.activePath = null;
      const discoveredPath = await this.discoverConnectedPath(firstPath);
      const raw = await this.sendCommandToPath(discoveredPath, command, timeoutMs);
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
      .map((port: any) => port.path)
      .filter((path: string) => path && path !== excludePath);

    if (!candidates.length) {
      throw new Error("No Android PGW serial ports detected. Reconnect USB and check Windows Device Manager.");
    }

    const checkCommand = buildPgwCommand({ connection: "check" });
    for (const path of candidates) {
      try {
        const raw = await this.sendCommandToPath(path, checkCommand, this.config.healthTimeoutMs);
        if (raw.toUpperCase().includes("CONNECTED")) {
          return path;
        }
      } catch {
        // Try the next detected COM port.
      }
    }

    throw new Error(`Android PGW terminal was not found on detected ports: ${candidates.join(", ")}`);
  }

  private async sendCommandToPath(path: string, command: string, timeoutMs: number): Promise<string> {
    const payload = this.config.appendCrlf ? `${command}\r\n` : command;

    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
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
        finish(new Error(`Android PGW terminal response timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      port.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        const current = Buffer.concat(chunks).toString("utf8");
        if (current.toUpperCase().includes("CONNECTED")) {
          finish(undefined, current.trim());
          return;
        }

        const framedResult = terminalResultFrame(current, command);
        if (framedResult && isFinalTerminalResponse(framedResult)) {
          finish(undefined, framedResult.trim());
          return;
        }

        // Android/USB serial drivers may echo the command first. Waiting for
        // a different, final frame prevents <{amount,data}> from being parsed
        // as a declined payment before the terminal sends its actual result.
        const unframedResult = withoutCommandEcho(current, command);
        const terminalCandidate = framedResult || unframedResult;
        if (terminalCandidate && hasTerminalResponse(terminalCandidate)) {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            const buffered = Buffer.concat(chunks).toString("utf8");
            finish(
              undefined,
              terminalResultFrame(buffered, command) || withoutCommandEcho(buffered, command),
            );
          }, this.config.responseIdleMs);
        }
      });

      port.on("error", (error: Error | null | undefined) => finish(error || undefined));

      port.open((openError: Error | null | undefined) => {
        if (openError) {
          finish(openError);
          return;
        }
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
