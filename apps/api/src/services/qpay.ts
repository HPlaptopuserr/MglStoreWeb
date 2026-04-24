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
  clientId: process.env.QPAY_CLIENT_ID || "",
  clientSecret: process.env.QPAY_CLIENT_SECRET || "",
  invoiceCode: process.env.QPAY_INVOICE_CODE || "",
  publicUrl: process.env.API_PUBLIC_URL || "http://localhost:3001",
});

/* ── Token cache ──────────────────────────────────────── */
type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

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

async function getAccessToken(context?: QPayMerchantContext): Promise<string> {
  const { baseUrl } = env();
  const { cacheKey, username, password, terminalId } = getContextIdentity(context);
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid (60 s buffer)
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const body = terminalId ? JSON.stringify({ terminal_id: terminalId }) : undefined;

  const res = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("QPay auth failed:", res.status, body);
    throw new Error(`QPay auth failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
  };

  const token = data.access_token;
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return token;
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
  const token = await getAccessToken(params.merchantContext);
  const { baseUrl, invoiceCode: defaultInvoiceCode, publicUrl } = env();

  const callbackPath = params.callbackConfig?.path || "/api/store/qpay/callback";
  const callbackQuery = new URLSearchParams({ orderId: params.orderId });

  for (const [key, value] of Object.entries(params.callbackConfig?.query || {})) {
    if (value !== null && value !== undefined) {
      callbackQuery.set(key, String(value));
    }
  }

  const callbackUrl = `${publicUrl}${callbackPath}?${callbackQuery.toString()}`;
  const invoiceCode =
    (params.merchantContext?.invoiceCode || "").trim() || defaultInvoiceCode;

  if (!invoiceCode) {
    throw new Error("QPay invoice code is not configured");
  }

  const body = {
    invoice_code: invoiceCode,
    sender_invoice_no: params.orderNumber,
    invoice_receiver_code: params.orderId,
    invoice_description: params.description || `MGL Store - ${params.orderNumber}`,
    amount: params.amount,
    callback_url: callbackUrl,
  };

  const res = await fetch(`${baseUrl}/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("QPay create invoice failed:", res.status, errBody);
    throw new Error(`QPay create invoice failed: ${res.status}`);
  }

  const data = (await res.json()) as QPayInvoiceResponse;
  return data;
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
  const token = await getAccessToken(merchantContext);

  const { baseUrl } = env();

  const res = await fetch(`${baseUrl}/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("QPay payment check failed:", res.status, errBody);
    throw new Error(`QPay payment check failed: ${res.status}`);
  }

  return (await res.json()) as QPayPaymentCheckResponse;
}
