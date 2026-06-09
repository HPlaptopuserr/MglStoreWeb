type MinuAgentResponse<T = unknown> = {
  status?: string;
  message?: string;
  entity?: T;
};

type MinuTokenCacheEntry = {
  token: string;
  expiresAt: number;
};

export type MinuAgentContext = {
  username: string;
  password: string;
  branchId: string;
  baseUrl?: string | null;
};

export type MinuInvoiceResult = {
  invoice: string;
  status: string;
  message?: string;
  raw: MinuAgentResponse;
};

export class MinuAgentApiError extends Error {
  status?: string;
  raw: MinuAgentResponse;

  constructor(message: string, raw: MinuAgentResponse) {
    super(message);
    this.name = "MinuAgentApiError";
    this.status = raw.status;
    this.raw = raw;
  }
}

export const isMinuAgentApiError = (error: unknown): error is MinuAgentApiError =>
  error instanceof MinuAgentApiError;

export type MinuTxnEntity = {
  branchId?: string;
  paySource?: string;
  invoice?: string;
  terminalId?: string;
  type?: string;
  message?: string;
  error?: string;
  cardNo?: string;
  status?: string;
  rrn?: string;
};

export type MinuTxnResult = {
  approved: boolean;
  pending: boolean;
  status: string;
  message?: string;
  transactionId?: string;
  entity?: MinuTxnEntity;
  raw: MinuAgentResponse<MinuTxnEntity>;
};

const tokenCache = new Map<string, MinuTokenCacheEntry>();

const baseUrl = (context?: Pick<MinuAgentContext, "baseUrl">) =>
  (context?.baseUrl || process.env.MINU_AGENT_BASE_URL || "https://api.minu.mn").replace(/\/$/, "");

export function assertMinuAgentContext(context: Partial<MinuAgentContext> | null | undefined): MinuAgentContext {
  const username = String(context?.username || "").trim();
  const password = String(context?.password || "").trim();
  const branchId = String(context?.branchId || "").trim();
  if (!username || !password || !branchId) {
    throw new Error("Minu Agent username, password, branchId бүрэн тохируулаагүй байна");
  }
  return {
    username,
    password,
    branchId,
    baseUrl: context?.baseUrl || null,
  };
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Minu API JSON биш хариу буцаалаа: ${text.slice(0, 180)}`);
  }
}

async function fetchMinu<T>(
  path: string,
  init: RequestInit,
  context: Pick<MinuAgentContext, "baseUrl">,
): Promise<T> {
  const res = await fetch(`${baseUrl(context)}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
  const data = await readJsonResponse<T>(res);
  if (!res.ok) {
    const apiMessage =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message || "").trim()
        : "";
    throw new Error(apiMessage || `Minu API HTTP ${res.status}`);
  }
  return data;
}

export async function getMinuAgentToken(contextInput: MinuAgentContext): Promise<string> {
  const context = assertMinuAgentContext(contextInput);
  const cacheKey = `${baseUrl(context)}:${context.username}:${context.password}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const data = await fetchMinu<MinuAgentResponse<string>>("/agent/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: context.username,
      password: context.password,
    }),
  }, context);

  if (data.status !== "000" || !data.entity) {
    throw new Error(data.message || "Minu Agent login амжилтгүй");
  }

  tokenCache.set(cacheKey, {
    token: data.entity,
    expiresAt: Date.now() + 29 * 60 * 1000,
  });

  return data.entity;
}

export async function createMinuAgentInvoice(params: {
  context: MinuAgentContext;
  terminalId: string;
  amount: number;
  invoice: string;
  branchId?: string | null;
  purchaseType?: "card" | "qr";
}): Promise<MinuInvoiceResult> {
  const context = assertMinuAgentContext(params.context);
  const token = await getMinuAgentToken(context);
  const branchId = (params.branchId || "").trim() || context.branchId;

  const data = await fetchMinu<MinuAgentResponse>("/agent/invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      terminalId: params.terminalId,
      invoice: params.invoice,
      branchId,
      amount: params.amount,
      purchaseType: params.purchaseType || "card",
    }),
  }, context);

  if (data.status !== "000") {
    throw new MinuAgentApiError(data.message || "Minu invoice үүсгэхэд алдаа гарлаа", data);
  }

  return {
    invoice: params.invoice,
    status: data.status,
    message: data.message,
    raw: data,
  };
}

export async function checkMinuAgentTransaction(contextInput: MinuAgentContext, invoice: string): Promise<MinuTxnResult> {
  const context = assertMinuAgentContext(contextInput);
  const token = await getMinuAgentToken(context);
  const data = await fetchMinu<MinuAgentResponse<MinuTxnEntity>>("/agent/checkTxn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ invoice }),
  }, context);

  const topStatus = String(data.status || "").trim();
  const entityStatus = String(data.entity?.status || "").trim();
  const normalizedEntityStatus = entityStatus.toUpperCase();
  const normalizedTopStatus = topStatus.toUpperCase();

  // Minu's top-level status means the checkTxn API call succeeded. The actual
  // payment result is in entity.status: null/empty = not paid yet, "000" = paid.
  const approved =
    normalizedTopStatus === "000" &&
    ["000", "SUCCESS", "APPROVED", "PAID"].includes(normalizedEntityStatus);
  const pending =
    (normalizedTopStatus === "000" && !normalizedEntityStatus) ||
    ["0064", "PENDING", "PROCESSING", ""].includes(normalizedTopStatus);
  const status = entityStatus || topStatus;

  return {
    approved,
    pending,
    status,
    message: data.entity?.message || data.message,
    transactionId: data.entity?.rrn || data.entity?.invoice,
    entity: data.entity,
    raw: data,
  };
}
