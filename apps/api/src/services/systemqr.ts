const SYSTEMQR_BASE_URL = process.env.SYSTEMQR_BASE_URL || "https://api.minu.mn/qrpay-test";
const SYSTEMQR_DEEPLINK_URL = process.env.SYSTEMQR_DEEPLINK_URL || "https://api.minu.mn/deeplink-test";

interface SystemQrLoginResponse {
  status: string;
  message: string;
  entity: string; // Token
}

interface SystemQrCreateInvoiceParams {
  merchantCode: string;
  amount: number;
  referenceNumber: string;
  webhook?: string;
}

interface SystemQrCheckInvoiceParams {
  merchantCode: string;
  invoiceNumber: string;
}

// In-memory token cache to avoid logging in on every request
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSystemQrToken(username?: string, password?: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const reqUsername = username || process.env.SYSTEMQR_USERNAME;
  const reqPassword = password || process.env.SYSTEMQR_PASSWORD;

  if (!reqUsername || !reqPassword) {
    throw new Error("SystemQR username or password is not configured");
  }

  const res = await fetch(`https://api.minu.mn/qrpay/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: reqUsername, password: reqPassword }),
  });

  const data = await res.json() as SystemQrLoginResponse;

  if (data.status !== "000" || !data.entity) {
    throw new Error(`SystemQR Login Error: ${data.message}`);
  }

  const token = data.entity;
  // Token expires in 30 minutes, let's cache for 25 minutes
  tokenCache = { token, expiresAt: Date.now() + 25 * 60 * 1000 };
  
  return token;
}

export async function createSystemQrInvoice(params: SystemQrCreateInvoiceParams, username?: string, password?: string) {
  const token = await getSystemQrToken(username, password);

  try {
    const res = await fetch(`${SYSTEMQR_DEEPLINK_URL}/subMerchant/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        referenceNumber: params.referenceNumber,
        amount: params.amount,
        merchantCode: params.merchantCode,
        webhook: params.webhook || `${process.env.API_URL}/contracts/systemqr/callback`,
      }),
    });

    const data = await res.json() as any;

    if (data.status !== "000") {
      throw new Error(data.message || "SystemQR invoice creation failed");
    }

    // Map entity to generic format used by frontend
    const entity = data.entity;
    return {
      invoiceId: entity.invoiceNumber, // SystemQR uses invoiceNumber
      qrText: entity.mainQr,
      urls: (entity.deeplinkList || []).map((d: any) => ({
        name: d.deeplinkName,
        description: d.deeplinkDesc,
        link: d.deeplinkLink,
        logo: d.image || "",
      })),
    };
  } catch (error: any) {
    console.error("SystemQR createInvoice error:", error.message);
    throw error;
  }
}

export async function checkSystemQrPayment(params: SystemQrCheckInvoiceParams, username?: string, password?: string) {
  const token = await getSystemQrToken(username, password);

  try {
    const res = await fetch(`${SYSTEMQR_DEEPLINK_URL}/subMerchant/checkInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        merchantCode: params.merchantCode,
        invoiceNumber: params.invoiceNumber,
      }),
    });

    const data = await res.json() as any;

    // According to docs, entity.status = null (pending), "000" (success), "00x" (failed)
    const entity = data.entity;
    if (data.status === "000" && entity?.status === "000") {
      return { paid: true };
    }
    
    return { paid: false };
  } catch (error: any) {
    console.error("SystemQR checkInvoice error:", error.message);
    throw error;
  }
}
