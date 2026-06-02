import crypto from "crypto";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const systemQrEnv = () => {
  const root = trimTrailingSlash(process.env.SYSTEMQR_ROOT_URL || "https://api.minu.mn");
  const suffix = process.env.NODE_ENV === "production" ? "" : "-test";
  return {
    qrpayBaseUrl: trimTrailingSlash(process.env.SYSTEMQR_BASE_URL || `${root}/qrpay${suffix}`),
    deeplinkBaseUrl: trimTrailingSlash(process.env.SYSTEMQR_DEEPLINK_URL || `${root}/deeplink${suffix}`),
    publicUrl: trimTrailingSlash(process.env.API_PUBLIC_URL || process.env.API_URL || ""),
  };
};

const isPublicCallbackUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      return false;
    }
    return url.protocol === "https:" || process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
};

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

export interface SystemQrRegisterSubMerchantParams {
  merchantName: string;
  accountNumber: string;
  bankCode: string;
  cityId: string;
  districtId: string;
  khorooId: string;
  building: string;
  doorNo: string;
  phone: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  corporateFlag: string;
  corporateName?: string | null;
  registerNumber: string;
  gender: string;
  subCategoryId: string;
}

export interface SystemQrSubMerchantResult {
  merchantCode: string;
  username: string;
  password?: string;
  raw: Record<string, unknown>;
}

export interface SystemQrSubMerchantListItem {
  merchantCode: string;
  merchantName: string;
  merchantNo?: string | null;
  terminalNo?: string | null;
  createdDate?: string | null;
}

// In-memory token cache to avoid logging in on every request
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getSystemQrToken(username?: string, password?: string): Promise<string> {
  const { qrpayBaseUrl } = systemQrEnv();

  const reqUsername = username || process.env.SYSTEMQR_USERNAME;
  const reqPassword = password || process.env.SYSTEMQR_PASSWORD;

  if (!reqUsername || !reqPassword) {
    throw new Error("SystemQR username or password is not configured");
  }

  const passwordHash = crypto.createHash("sha256").update(reqPassword).digest("hex").slice(0, 16);
  const cacheKey = `${qrpayBaseUrl}:${reqUsername}:${passwordHash}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const res = await fetch(`${qrpayBaseUrl}/login`, {
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
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + 25 * 60 * 1000 });
  
  return token;
}

export async function registerSystemQrSubMerchant(
  params: SystemQrRegisterSubMerchantParams,
  username?: string,
  password?: string,
): Promise<SystemQrSubMerchantResult> {
  const token = await getSystemQrToken(username, password);
  const { qrpayBaseUrl } = systemQrEnv();

  const res = await fetch(`${qrpayBaseUrl}/qrMerchant/registerSubMerchant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      merchantName: params.merchantName,
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      cityId: params.cityId,
      districtId: params.districtId,
      khorooId: params.khorooId,
      building: params.building,
      doorNo: params.doorNo,
      phone: params.phone,
      email: params.email || null,
      firstName: params.firstName,
      lastName: params.lastName,
      corporateFlag: params.corporateFlag,
      corporateName: params.corporateName || null,
      registerNumber: params.registerNumber,
      gender: params.gender,
      subCategoryId: params.subCategoryId,
    }),
  });

  const data = (await res.json()) as {
    status?: string;
    message?: string | null;
    entity?: {
      merchantCode?: string;
      username?: string;
      password?: string;
    } | null;
  };

  if (data.status !== "000" || !data.entity?.merchantCode) {
    console.error("SystemQR registerSubMerchant failed", {
      status: data.status || "unknown",
      message: data.message || null,
      merchantName: params.merchantName,
      bankCode: params.bankCode,
      cityId: params.cityId,
      districtId: params.districtId,
      khorooId: params.khorooId,
      subCategoryId: params.subCategoryId,
    });
    throw new Error(
      `Minu SystemQR subMerchant register failed (${data.status || "unknown"}): ${
        data.message || "merchantCode ирсэнгүй"
      }`,
    );
  }

  return {
    merchantCode: String(data.entity.merchantCode),
    username: String(data.entity.username || data.entity.merchantCode),
    password: data.entity.password ? String(data.entity.password) : undefined,
    raw: data as unknown as Record<string, unknown>,
  };
}

export async function resetSystemQrSubMerchantPassword(
  subMerchantCode: string,
  username?: string,
  password?: string,
): Promise<SystemQrSubMerchantResult> {
  const token = await getSystemQrToken(username, password);
  const { qrpayBaseUrl } = systemQrEnv();

  const res = await fetch(`${qrpayBaseUrl}/qrMerchant/resetPassword`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subMerchantCode }),
  });

  const data = (await res.json()) as {
    status?: string;
    message?: string | null;
    entity?: {
      merchantCode?: string;
      username?: string;
      password?: string;
    } | null;
  };

  if (data.status !== "000" || !data.entity?.merchantCode) {
    throw new Error(
      `Minu SystemQR subMerchant resetPassword failed (${data.status || "unknown"}): ${
        data.message || "password ирсэнгүй"
      }`,
    );
  }

  return {
    merchantCode: String(data.entity.merchantCode),
    username: String(data.entity.username || data.entity.merchantCode),
    password: data.entity.password ? String(data.entity.password) : undefined,
    raw: data as unknown as Record<string, unknown>,
  };
}

export async function listSystemQrSubMerchants(
  username?: string,
  password?: string,
): Promise<SystemQrSubMerchantListItem[]> {
  const token = await getSystemQrToken(username, password);
  const { qrpayBaseUrl } = systemQrEnv();

  const res = await fetch(`${qrpayBaseUrl}/qrMerchant/subMerchant`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as {
    status?: string;
    message?: string | null;
    entity?: Array<{
      merchantCode?: string | null;
      merchantName?: string | null;
      merchantNo?: string | null;
      terminalNo?: string | null;
      createdDate?: string | null;
    }> | null;
  };

  if (data.status !== "000" || !Array.isArray(data.entity)) {
    throw new Error(`Minu SystemQR subMerchant list failed (${data.status || "unknown"}): ${data.message || "list ирсэнгүй"}`);
  }

  return data.entity.map((item) => ({
    merchantCode: String(item.merchantCode || "").trim(),
    merchantName: String(item.merchantName || "").trim(),
    merchantNo: item.merchantNo ? String(item.merchantNo).trim() : null,
    terminalNo: item.terminalNo ? String(item.terminalNo).trim() : null,
    createdDate: item.createdDate ? String(item.createdDate).trim() : null,
  }));
}

export async function getSystemQrCityList() {
  const token = await getSystemQrToken();
  const { qrpayBaseUrl } = systemQrEnv();
  const res = await fetch(`${qrpayBaseUrl}/qrMerchant/city`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { status?: string; entity?: any[] | null };
  if (data.status !== "000" || !Array.isArray(data.entity)) return [];

  return data.entity.map((city) => ({
    code: String(city.cityId || ""),
    name: String(city.cityName || ""),
    districts: Array.isArray(city.districtList)
      ? city.districtList.map((district: any) => ({
          code: String(district.districtId || ""),
          name: String(district.districtName || ""),
        }))
      : [],
  }));
}

export async function getSystemQrKhorooList(districtId: string) {
  const token = await getSystemQrToken();
  const { qrpayBaseUrl } = systemQrEnv();
  const res = await fetch(
    `${qrpayBaseUrl}/qrMerchant/khoroo?districtId=${encodeURIComponent(districtId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await res.json()) as { status?: string; entity?: any[] | null };
  if (data.status !== "000" || !Array.isArray(data.entity)) return [];

  return data.entity.map((khoroo) => ({
    code: String(khoroo.khorooId || ""),
    name: String(khoroo.khorooName || ""),
  }));
}

export async function getSystemQrCategoryList() {
  const token = await getSystemQrToken();
  const { qrpayBaseUrl } = systemQrEnv();
  const res = await fetch(`${qrpayBaseUrl}/qrMerchant/category`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { status?: string; entity?: any[] | null };
  if (data.status !== "000" || !Array.isArray(data.entity)) return [];

  return data.entity.flatMap((category) =>
    Array.isArray(category.psSubCategoryList)
      ? category.psSubCategoryList.map((subCategory: any) => ({
          code: String(subCategory.subCategoryId || ""),
          name: String(subCategory.subCategoryName || ""),
          categoryCode: String(category.categoryId || ""),
          categoryName: String(category.categoryName || ""),
        })).filter((item: { code: string; categoryCode: string }) => item.code !== "1000" && item.categoryCode !== "9")
      : [],
  );
}

export async function createSystemQrInvoice(params: SystemQrCreateInvoiceParams, username?: string, password?: string) {
  const token = await getSystemQrToken(username, password);
  const { deeplinkBaseUrl, publicUrl } = systemQrEnv();
  const fallbackWebhook = publicUrl ? `${publicUrl}/api/pos/qpay/cb` : undefined;
  const webhook = isPublicCallbackUrl(params.webhook)
    ? params.webhook
    : isPublicCallbackUrl(fallbackWebhook)
      ? fallbackWebhook
      : undefined;

  try {
    const res = await fetch(`${deeplinkBaseUrl}/subMerchant/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        referenceNumber: params.referenceNumber,
        amount: params.amount,
        merchantCode: params.merchantCode,
        ...(webhook ? { webhook } : {}),
      }),
    });

    const data = await res.json() as any;

    if (data.status !== "000") {
      throw new Error(
        `Minu SystemQR createInvoice failed (${data.status || "unknown"}): ${
          data.message || "SystemQR invoice creation failed"
        }. Дэлгүүрийн Minu Dynamic QR merchantCode/Sub-Merchant Code зөв эсэхийг Minu талаас шалгана уу.`,
      );
    }

    // Map entity to generic format used by frontend
    const entity = data.entity;
    if (!entity?.invoiceNumber || !entity?.mainQr) {
      throw new Error("Minu SystemQR createInvoice returned an incomplete invoice");
    }

    return {
      invoiceId: entity.invoiceNumber, // SystemQR uses invoiceNumber
      qrText: entity.mainQr,
      urls: (entity.deeplinkList || []).map((d: any) => ({
        name: d.deeplinkName,
        description: d.deeplinkDesc,
        link: String(d.deeplinkLink || "").replace(
          "qPay_QRcode=null",
          `qPay_QRcode=${encodeURIComponent(entity.mainQr)}`,
        ),
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
  const { deeplinkBaseUrl } = systemQrEnv();

  try {
    const res = await fetch(`${deeplinkBaseUrl}/subMerchant/checkInvoice`, {
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
