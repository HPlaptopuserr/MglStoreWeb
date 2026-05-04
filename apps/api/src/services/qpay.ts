/**
 * QPay V2 API service
 * Docs: https://developer.qpay.mn
 *
 * Env vars are read lazily (via getters) so that dotenv.config()
 * in index.ts has time to run before values are captured.
 */

import type { QPayCallbackConfig, QPayMerchantContext } from "./qpay.types";

const env = () => ({
  baseUrl: process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2",
  quickqrBaseUrl: process.env.QPAY_QUICKQR_BASE_URL || "",
  clientId: process.env.QPAY_CLIENT_ID || "",
  clientSecret: process.env.QPAY_CLIENT_SECRET || "",
  invoiceCode: process.env.QPAY_INVOICE_CODE || "",
  publicUrl: process.env.API_PUBLIC_URL || "http://localhost:3001",
});

// Vendor merchant contexts use QPAY_QUICKQR_BASE_URL only when merchantId is set
// (QuickQR multi-merchant). Standard QPay V2 contexts always use QPAY_BASE_URL.
const resolveBaseUrl = (context?: QPayMerchantContext) => {
  const { baseUrl, quickqrBaseUrl } = env();
  if (context?.merchantId && quickqrBaseUrl) return quickqrBaseUrl;
  return baseUrl;
};

/* ── Token cache ──────────────────────────────────────── */
type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

/** Cache-г бүхэлд нь эсвэл тодорхой key-р цэвэрлэх */
export function clearTokenCache(cacheKey?: string): void {
  if (cacheKey) {
    tokenCache.delete(cacheKey);
  } else {
    tokenCache.clear();
  }
}

function getContextIdentity(context?: QPayMerchantContext): {
  cacheKey: string;
  username: string;
  password: string;
  terminalId?: string;
} {
  const { clientId, clientSecret } = env();
  const username = (context?.username || clientId || "").trim();
  const password = (context?.password || clientSecret || "").trim();
  const terminalId = (context?.terminalId || "").trim() || undefined;
  const cacheKey =
    context?.merchantKey || `default:${username}:${terminalId || "no-terminal"}`;

  if (!username || !password) {
    throw new Error("QPay credentials are not configured");
  }

  return { cacheKey, username, password, terminalId };
}

async function fetchNewToken(
  baseUrl: string,
  username: string,
  password: string,
  terminalId?: string,
): Promise<{ token: string; expiresAt: number }> {
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const bodyPayload = terminalId ? JSON.stringify({ terminal_id: terminalId }) : undefined;

  const res = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: bodyPayload,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("QPay auth failed:", res.status, errText);
    throw new Error(`QPay auth failed: ${res.status} - ${errText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
  };

  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getAccessToken(context?: QPayMerchantContext): Promise<string> {
  const baseUrl = resolveBaseUrl(context);
  const { cacheKey, username, password, terminalId } = getContextIdentity(context);
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid (60 s buffer)
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  // Cache хоосон эсвэл хугацаа дууссан — шинэ token авах
  const entry = await fetchNewToken(baseUrl, username, password, terminalId);
  tokenCache.set(cacheKey, entry);
  return entry.token;
}

/**
 * Bearer token-тэй request хийх. 401 гарвал cache арилгаж нэг удаа retry хийнэ.
 */
async function authorizedFetch(
  url: string,
  options: RequestInit,
  context?: QPayMerchantContext,
): Promise<Response> {
  const { cacheKey } = getContextIdentity(context);
  const token = await getAccessToken(context);

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  // 401 → cache арилгаж нэг удаа retry
  if (res.status === 401) {
    console.warn("QPay 401 — cache арилгаж дахин оролдож байна:", cacheKey);
    tokenCache.delete(cacheKey);
    const retryToken = await getAccessToken(context);
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${retryToken}`,
      },
    });
  }

  return res;
}

/* ── Create invoice ───────────────────────────────────── */
export interface QPayInvoiceResponse {
  invoice_id: string;
  qr_text: string;
  qr_image: string; // base64 PNG
  urls: QPayDeepLink[];
}

export interface QPayDeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export async function createQPayInvoice(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  description?: string;
  merchantContext?: QPayMerchantContext;
  callbackConfig?: QPayCallbackConfig;
}): Promise<QPayInvoiceResponse> {
  const baseUrl = resolveBaseUrl(params.merchantContext);
  const { invoiceCode: defaultInvoiceCode, publicUrl } = env();

  const callbackPath = params.callbackConfig?.path || "/api/store/qpay/callback";
  const callbackQuery = new URLSearchParams({ orderId: params.orderId });

  for (const [key, value] of Object.entries(params.callbackConfig?.query || {})) {
    if (value !== null && value !== undefined) {
      callbackQuery.set(key, String(value));
    }
  }

  const callbackUrl = `${publicUrl}${callbackPath}?${callbackQuery.toString()}`;
  console.log("[QPay] callbackUrl length:", callbackUrl.length, "url:", callbackUrl);

  // ── QuickQR branch ──────────────────────────────────────────
  // QuickQR uses merchant_id + bank_accounts instead of invoice_code
  if (params.merchantContext?.merchantId) {
    const body: Record<string, unknown> = {
      merchant_id: params.merchantContext.merchantId,
      amount: params.amount,
      currency: "MNT",
      callback_url: callbackUrl,
      description: params.description || `MGL Store - ${params.orderNumber}`,
      customer_name: "MGL Store Customer",
      customer_logo: "",
    };

    if (params.merchantContext.branchCode) {
      body.branch_code = params.merchantContext.branchCode;
    }

    if (params.merchantContext.bankAccounts?.length) {
      body.bank_accounts = params.merchantContext.bankAccounts.map((b) => ({
        account_bank_code: b.account_bank_code,
        account_number: b.account_number,
        account_name: b.account_name,
        is_default: b.is_default ?? true,
        default: b.is_default ?? true,
      }));
    }

    const res = await authorizedFetch(
      `${baseUrl}/invoice`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      params.merchantContext,
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("QuickQR create invoice failed:", res.status, errBody);
      throw new Error(`QuickQR create invoice failed: ${res.status} - ${errBody}`);
    }

    const raw = (await res.json()) as Record<string, unknown>;
    // QuickQR response: { id, qr_code, urls } — note: field is qr_code not qr_text
    return {
      invoice_id: String(raw.id || raw.invoice_id || ""),
      qr_text: String(raw.qr_text || raw.qr_code || ""),
      qr_image: String(raw.qr_image || ""),
      urls: (raw.urls as QPayDeepLink[]) || [],
    };
  }

  // ── Standard QPay V2 branch ─────────────────────────────────
  const invoiceCode =
    (params.merchantContext?.invoiceCode || "").trim() || defaultInvoiceCode;

  if (!invoiceCode) {
    throw new Error("QPay invoice code is not configured");
  }

  const bankAccounts = params.merchantContext?.bankAccounts;
  const body: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: params.orderNumber,
    invoice_receiver_code: params.orderId,
    invoice_description: params.description || `MGL Store - ${params.orderNumber}`,
    amount: params.amount,
    callback_url: callbackUrl,
  };

  if (bankAccounts?.length) {
    body.bank_accounts = bankAccounts.map((b) => ({
      account_bank_code: b.account_bank_code,
      account_number: b.account_number,
      account_name: b.account_name,
      is_default: b.is_default ?? true,
    }));
  }

  const res = await authorizedFetch(
    `${baseUrl}/invoice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    params.merchantContext,
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("QPay create invoice failed:", res.status, errBody);
    throw new Error(`QPay create invoice failed: ${res.status} - ${errBody}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    invoice_id: String(data.invoice_id || data.id || ""),
    qr_text: String(data.qr_text || ""),
    qr_image: String(data.qr_image || ""),
    urls: (data.urls as QPayDeepLink[]) || [],
  };
}

/* ── QuickQR merchant registration ───────────────────── */

const masterEnv = () => ({
  username: process.env.QPAY_QUICKQR_MASTER_USERNAME || "",
  password: process.env.QPAY_QUICKQR_MASTER_PASSWORD || "",
  terminalId: process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || "",
});

async function getMasterToken(): Promise<string> {
  const { quickqrBaseUrl } = env();
  const { username, password, terminalId } = masterEnv();

  if (!quickqrBaseUrl || !username || !password) {
    throw new Error("QPay QuickQR master credentials are not configured");
  }

  const cacheKey = `master:${username}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  // QuickQR always requires terminal_id; fall back to username if not explicitly configured
  const effectiveTerminalId = terminalId || username;
  const entry = await fetchNewToken(quickqrBaseUrl, username, password, effectiveTerminalId);
  tokenCache.set(cacheKey, entry);
  return entry.token;
}

export type QPayBankAccount = {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
};

export type QPayRegisterCompanyParams = {
  register_number: string;
  company_name: string;
  name: string;
  name_eng?: string;
  mcc_code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  owner_first_name?: string;
  owner_last_name?: string;
  bank_accounts?: QPayBankAccount[];
};

export type QPayRegisterPersonParams = {
  register_number: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  name_eng?: string;
  business_name: string;
  mcc_code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  bank_accounts?: QPayBankAccount[];
};

export type QPayMerchantRegistrationResult = {
  raw: Record<string, unknown>;
  merchantId?: string;
  merchantKey?: string;
  invoiceCode?: string;
};

export class QPayAlreadyRegisteredError extends Error {
  constructor(public readonly registerNumber: string) {
    super("MERCHANT_ALREADY_REGISTERED");
    this.name = "QPayAlreadyRegisteredError";
  }
}

export async function registerQPayMerchantCompany(
  params: QPayRegisterCompanyParams,
): Promise<QPayMerchantRegistrationResult> {
  const { quickqrBaseUrl } = env();
  const token = await getMasterToken();

  const res = await fetch(`${quickqrBaseUrl}/merchant/company`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errBody = await res.text();
    // Detect already-registered and throw typed error
    console.error("QPay company register error body:", errBody);
    try {
      const parsed = JSON.parse(errBody);
      const errStr = JSON.stringify(parsed).toLowerCase();
      if (
        parsed?.error === "MERCHANT_ALREADY_REGISTERED" ||
        parsed?.code === "MERCHANT_ALREADY_REGISTERED" ||
        errStr.includes("already") ||
        errStr.includes("exist")
      ) {
        throw new QPayAlreadyRegisteredError(params.register_number);
      }
    } catch (e) {
      if (e instanceof QPayAlreadyRegisteredError) throw e;
    }
    throw new Error(`QPay register company failed: ${res.status} ${errBody}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  console.log("QPay company registration response keys:", Object.keys(raw));
  console.log("QPay company registration raw:", JSON.stringify(raw));
  return {
    raw,
    merchantId: String(raw.merchant_id || raw.username || raw.id || ""),
    merchantKey: String(raw.merchant_key || raw.password || raw.secret || ""),
    invoiceCode: String(raw.invoice_code || raw.terminal_id || ""),
  };
}

export async function registerQPayMerchantPerson(
  params: QPayRegisterPersonParams,
): Promise<QPayMerchantRegistrationResult> {
  const { quickqrBaseUrl } = env();
  const token = await getMasterToken();

  const res = await fetch(`${quickqrBaseUrl}/merchant/person`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("QPay person register error body:", errBody);
    try {
      const parsed = JSON.parse(errBody);
      const errStr = JSON.stringify(parsed).toLowerCase();
      if (
        parsed?.error === "MERCHANT_ALREADY_REGISTERED" ||
        parsed?.code === "MERCHANT_ALREADY_REGISTERED" ||
        errStr.includes("already") ||
        errStr.includes("exist")
      ) {
        throw new QPayAlreadyRegisteredError(params.register_number);
      }
    } catch (e) {
      if (e instanceof QPayAlreadyRegisteredError) throw e;
    }
    throw new Error(`QPay register person failed: ${res.status} ${errBody}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  console.log("QPay person registration response keys:", Object.keys(raw));
  console.log("QPay person registration raw:", JSON.stringify(raw));
  return {
    raw,
    merchantId: String(raw.merchant_id || raw.username || raw.id || ""),
    merchantKey: String(raw.merchant_key || raw.password || raw.secret || ""),
    invoiceCode: String(raw.invoice_code || raw.terminal_id || ""),
  };
}

export async function getQPayCityList(): Promise<{ code: string; name: string }[]> {
  const { quickqrBaseUrl } = env();
  const token = await getMasterToken();
  const res = await fetch(`${quickqrBaseUrl}/aimaghot`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { code?: string; name?: string }[] | Record<string, unknown>;
  return Array.isArray(data) ? data.map((d) => ({ code: String(d.code || ""), name: String(d.name || "") })) : [];
}

export async function getQPayDistrictList(cityCode: string): Promise<{ code: string; name: string }[]> {
  const { quickqrBaseUrl } = env();
  const token = await getMasterToken();
  const res = await fetch(`${quickqrBaseUrl}/sumduureg/${cityCode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { code?: string; name?: string }[] | Record<string, unknown>;
  return Array.isArray(data) ? data.map((d) => ({ code: String(d.code || ""), name: String(d.name || "") })) : [];
}

/* ── Check payment ────────────────────────────────────── */
export interface QPayPaymentCheckResponse {
  count: number;
  paid_amount: number;
  rows: {
    payment_id: string;
    payment_status: string;
    payment_amount: number;
    transaction_id: string;
  }[];
}

export async function checkQPayPayment(
  invoiceId: string,
  merchantContext?: QPayMerchantContext,
): Promise<QPayPaymentCheckResponse> {
  const baseUrl = resolveBaseUrl(merchantContext);

  // QuickQR uses { invoice_id } — standard QPay uses { object_type, object_id }
  const isQuickQr = !!merchantContext?.merchantId;

  const body = isQuickQr
    ? { invoice_id: invoiceId }
    : { object_type: "INVOICE", object_id: invoiceId };

  const res = await authorizedFetch(
    `${baseUrl}/payment/check`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    merchantContext,
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("QPay payment check failed:", res.status, errBody);
    throw new Error(`QPay payment check failed: ${res.status}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;

  // QuickQR response format: { invoice_status, payments: [...] }
  // Standard QPay format: { count, paid_amount, rows: [...] }
  if (isQuickQr && raw.payments) {
    const payments = raw.payments as Record<string, unknown>[];
    const paidPayments = payments.filter(
      (p) => String(p.payment_status || p.status || "").toUpperCase() === "SUCCESS",
    );
    return {
      count: paidPayments.length,
      paid_amount: paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      rows: paidPayments.map((p) => ({
        payment_id: String(p.id || p.payment_id || ""),
        payment_status: String(p.payment_status || p.status || ""),
        payment_amount: Number(p.amount || 0),
        transaction_id: String(p.transaction_id || ""),
      })),
    };
  }

  return raw as unknown as QPayPaymentCheckResponse;
}
