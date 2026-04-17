/**
 * QPay V2 API service
 * Docs: https://developer.qpay.mn
 *
 * Env vars are read lazily (via getters) so that dotenv.config()
 * in index.ts has time to run before values are captured.
 */

const env = () => ({
  baseUrl: process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2",
  clientId: process.env.QPAY_CLIENT_ID || "",
  clientSecret: process.env.QPAY_CLIENT_SECRET || "",
  invoiceCode: process.env.QPAY_INVOICE_CODE || "",
  publicUrl: process.env.API_PUBLIC_URL || "http://localhost:3001",
});

/* ── Token cache ──────────────────────────────────────── */
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (60 s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { baseUrl, clientId, clientSecret } = env();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
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

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
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
}): Promise<QPayInvoiceResponse> {
  const token = await getAccessToken();
  const { baseUrl, invoiceCode, publicUrl } = env();

  const callbackUrl = `${publicUrl}/api/store/qpay/callback?orderId=${params.orderId}`;

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

export async function checkQPayPayment(invoiceId: string): Promise<QPayPaymentCheckResponse> {
  const token = await getAccessToken();

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
