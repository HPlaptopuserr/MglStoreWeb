import {
  EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  isValidEbarimtTaxProductCode,
  type PosReceipt,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";

export type EbarimtRegisterConfig = {
  terminalBridgeUrl?: string | null;
  ebarimtPosApiUrl?: string | null;
  ebarimtMerchantTin?: string | null;
  ebarimtPosNo?: string | null;
};

export type EbarimtBuyer =
  | { type: "B2C" }
  | { type: "B2B"; tin: string; regNo?: string; name?: string | null };

export type EbarimtTinLookupResult = {
  regNo: string;
  tin: string;
  name?: string | null;
};

export type AttachEbarimtPayload = {
  status: "SUCCESS" | "FAILED" | "RETURN_PENDING" | "RETURNED";
  billId?: string | null;
  receiptId?: string | null;
  qrData?: string | null;
  lottery?: string | null;
  date?: string | null;
  error?: string | null;
  receiptType?: "B2C" | "B2B" | null;
  customerName?: string | null;
  customerTin?: string | null;
  customerRegNo?: string | null;
  payload?: unknown;
};

export type EbarimtReturnReceiptResult = {
  id: string;
  date: string;
  response: unknown;
};

export type EbarimtInfo = {
  operatorTIN?: string;
  posNo?: string;
  lastSentDate?: string | null;
  merchants?: Array<{
    tin?: string;
    name?: string;
    vatPayer?: boolean;
  }>;
};

type EbarimtReceiptContent = {
  id?: string;
  billId?: string;
  ddtd?: string;
  status?: string;
  qrData?: string;
  qrdata?: string;
  qrText?: string;
  qrCode?: string;
  qr?: string;
  lottery?: string;
  lotteryNo?: string;
  date?: string;
  receipts?: Array<{
    id?: string;
    receiptId?: string;
    qrData?: string;
    qrdata?: string;
    qrText?: string;
    qrCode?: string;
    qr?: string;
    lottery?: string;
    lotteryNo?: string;
  }>;
  message?: string;
};

type EbarimtWrapperResponse = {
  StatusCode?: number;
  Content?: string;
  message?: string;
};

const DEFAULT_POS_API_URL = "http://localhost:7080";
const DEFAULT_LOCAL_BRIDGE_URL = "http://127.0.0.1:7420";
const DEFAULT_BRANCH_NO = "001";
const DEFAULT_DISTRICT_CODE = "0101";
const money = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

class PosApiHttpError extends Error {}
class BridgeTinLookupError extends Error {
  constructor(
    message: string,
    readonly final = false,
  ) {
    super(message);
  }
}

function normalizeTin(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

function getPosApiErrorMessage(raw: string, status: number) {
  let message = raw.trim();
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    message =
      pickText(payload.message, payload.Message, payload.error, payload.Error) ||
      message;
  } catch {
    // Some PosAPI versions return plain text instead of JSON.
  }

  if (/Customer-н бүртгэл алдаатай байна/i.test(message)) {
    return "Ebarimt-ийн merchant/POS бүртгэл баталгаажаагүй байна. operator.ebarimt.mn дээр тухайн POS дугаарт merchant-аа бүртгэж баталгаажуулна уу.";
  }

  return message || `eBarimt PosAPI алдаа гарлаа (HTTP ${status})`;
}

function getPosApiUrl(register?: EbarimtRegisterConfig | null) {
  const configured =
    register?.ebarimtPosApiUrl ||
    process.env.NEXT_PUBLIC_EBARIMT_POS_API_URL ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("mgl_ebarimt_pos_api_url")
      : "") ||
    DEFAULT_POS_API_URL;
  return configured.replace(/\/+$/, "");
}

function getPosApiFetchUrls(
  path: string,
  register?: EbarimtRegisterConfig | null,
) {
  const baseUrl = getPosApiUrl(register);
  if (typeof window === "undefined") return [`${baseUrl}${path}`];
  const params = new URLSearchParams({ path, baseUrl });
  return [`${baseUrl}${path}`, `/api/ebarimt/posapi?${params.toString()}`];
}

async function fetchPosApiUrl<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 10_000,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new PosApiHttpError(getPosApiErrorMessage(raw, response.status));
    }
    if (!raw) return {} as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("eBarimt PosAPI хариу өгөхгүй байна");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchPosApi<T>(
  path: string,
  init?: RequestInit,
  register?: EbarimtRegisterConfig | null,
  timeoutMs = 10_000,
) {
  let lastError: unknown;
  for (const url of getPosApiFetchUrls(path, register)) {
    try {
      return await fetchPosApiUrl<T>(url, init, timeoutMs);
    } catch (error) {
      lastError = error;
      if (error instanceof PosApiHttpError) break;
    }
  }
  throw lastError;
}

export async function sendLocalEbarimtData(
  register?: EbarimtRegisterConfig | null,
): Promise<EbarimtInfo> {
  await fetchPosApi<unknown>(
    "/rest/sendData",
    undefined,
    register,
    600_000,
  );
  return fetchPosApi<EbarimtInfo>(
    "/rest/info",
    undefined,
    register,
    10_000,
  );
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return value;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatPosApiReceiptDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) return text;

  const parsed = text ? new Date(text.replace(" ", "T")) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  const useUtcParts = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const year = useUtcParts ? parsed.getUTCFullYear() : parsed.getFullYear();
  const month = useUtcParts ? parsed.getUTCMonth() + 1 : parsed.getMonth() + 1;
  const day = useUtcParts ? parsed.getUTCDate() : parsed.getDate();
  const hours = useUtcParts ? parsed.getUTCHours() : parsed.getHours();
  const minutes = useUtcParts ? parsed.getUTCMinutes() : parsed.getMinutes();
  const seconds = useUtcParts ? parsed.getUTCSeconds() : parsed.getSeconds();

  return `${year}-${padDatePart(month)}-${padDatePart(day)} ${padDatePart(hours)}:${padDatePart(minutes)}:${padDatePart(seconds)}`;
}

function assertReturnReceiptResponse(raw: unknown) {
  const parsed = parseMaybeJson(raw);
  if (typeof parsed !== "object" || parsed === null) return;

  const value = parsed as Record<string, unknown>;
  const statusCode = Number(
    value.StatusCode ?? value.statusCode ?? value.status,
  );
  if (Number.isFinite(statusCode) && statusCode >= 400) {
    throw new Error(
      pickText(value.message, value.Message, value.error) ||
        `Ebarimt буцаалт амжилтгүй (төлөв ${statusCode})`,
    );
  }
}

export async function returnLocalEbarimtReceipt(
  receipt: Pick<PosReceipt, "createdAt" | "ebarimt">,
  register?: EbarimtRegisterConfig | null,
): Promise<EbarimtReturnReceiptResult | null> {
  const status = String(receipt.ebarimt?.status || "").toUpperCase();
  if (!["SUCCESS", "RETURN_PENDING", "RETURNED"].includes(status)) {
    return null;
  }

  // PosAPI requires the 33-digit batch receipt DDTD. The child receipt ID is
  // not interchangeable and silently fails to create a seller return request
  // on some PosAPI versions.
  const id = pickText(receipt.ebarimt?.billId);
  if (!id || !/^\d{33}$/.test(id)) {
    throw new Error(
      "Ebarimt буцаахад анхны баримтын 33 оронтой багц ДДТД олдсонгүй.",
    );
  }

  const date = formatPosApiReceiptDate(
    receipt.ebarimt?.date || receipt.createdAt,
  );
  if (!date) {
    throw new Error("Ebarimt буцаахад анхны баримтын огноо олдсонгүй.");
  }

  const response = await fetchPosApi<unknown>(
    "/rest/receipt",
    { method: "DELETE", body: JSON.stringify({ id, date }) },
    register,
    10_000,
  );
  assertReturnReceiptResponse(response);
  return { id, date, response };
}

function getBridgeUrls(register?: EbarimtRegisterConfig | null) {
  const stored =
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("mgl_ebarimt_tin_bridge_url") ||
        window.localStorage.getItem("mgl_pos_bridge_url") ||
        "";
  return Array.from(
    new Set(
      [register?.terminalBridgeUrl, stored, DEFAULT_LOCAL_BRIDGE_URL]
        .map((value) => String(value || "").trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  );
}

async function lookupTinFromBridge(
  regNo: string,
  register?: EbarimtRegisterConfig | null,
) {
  for (const bridgeUrl of getBridgeUrls(register)) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3_500);
    try {
      const response = await fetch(
        `${bridgeUrl}/ebarimt/tin?regNo=${encodeURIComponent(regNo)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const raw = await response.text();
      let payload: Partial<EbarimtTinLookupResult> & { message?: string };
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        if (response.status === 404) continue;
        throw new BridgeTinLookupError("TIN лавлагааны хариу буруу байна");
      }
      if (!response.ok) {
        throw new BridgeTinLookupError(
          payload.message || "Байгууллагын мэдээлэл олдсонгүй",
          true,
        );
      }
      const tin = normalizeTin(payload.tin);
      if (!/^\d{11,14}$/.test(tin)) {
        throw new BridgeTinLookupError("Байгууллагын TIN мэдээлэл буруу байна", true);
      }
      return {
        regNo,
        tin,
        name: pickText(payload.name),
      } satisfies EbarimtTinLookupResult;
    } catch (error) {
      if (error instanceof BridgeTinLookupError && error.final) throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  return null;
}

export async function lookupEbarimtTin(
  regNo: string,
  register?: EbarimtRegisterConfig | null,
): Promise<EbarimtTinLookupResult> {
  const normalized = regNo.replace(/\D/g, "");
  if (!/^\d{7}$/.test(normalized)) {
    throw new Error("Байгууллагын регистр 7 оронтой байна");
  }
  const bridgeResult = await lookupTinFromBridge(normalized, register);
  if (bridgeResult?.name) return bridgeResult;

  try {
    const response = await fetch(
      `/api/ebarimt/tin?regNo=${encodeURIComponent(normalized)}`,
      { cache: "no-store" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.message ||
          `eBarimt TIN лавлагаа амжилтгүй (HTTP ${response.status})`,
      );
    }
    const tin = normalizeTin(payload?.tin);
    if (!/^\d{11,14}$/.test(tin)) {
      throw new Error("Байгууллагын TIN мэдээлэл дутуу ирлээ");
    }
    return {
      regNo: String(payload?.regNo || normalized).replace(/\D/g, ""),
      tin,
      name: pickText(payload?.name),
    };
  } catch (error) {
    if (bridgeResult) return bridgeResult;
    throw error;
  }
}

function selectMerchant(
  info: EbarimtInfo,
  register?: EbarimtRegisterConfig | null,
) {
  const configuredTin = normalizeTin(register?.ebarimtMerchantTin);
  const merchants = Array.isArray(info.merchants) ? info.merchants : [];
  if (configuredTin) {
    const merchant = merchants.find(
      (item) => normalizeTin(item.tin) === configuredTin,
    );
    if (merchants.length > 0 && !merchant) {
      throw new Error("Тохируулсан merchant TIN PosAPI дээр олдсонгүй");
    }
    return { merchant, merchantTin: configuredTin };
  }
  if (merchants.length > 1) {
    throw new Error("Олон merchant байна. Кассын merchant TIN-ийг тохируулна уу");
  }
  const merchant = merchants[0];
  return {
    merchant,
    merchantTin: normalizeTin(merchant?.tin) || normalizeTin(info.operatorTIN),
  };
}

function paymentCode(method: string) {
  const value = method.toUpperCase();
  if (value === "CARD") return "PAYMENT_CARD";
  if (value === "QR" || value === "QPAY") return "BANK_TRANSFER_QPAY";
  return "CASH";
}

function normalizeTaxType(value: unknown) {
  const taxType = String(value || "VAT_ABLE").toUpperCase();
  return taxType === "VAT_FREE" ||
    taxType === "VAT_ZERO" ||
    taxType === "NOT_VAT"
    ? taxType
    : "VAT_ABLE";
}

function getTaxProductCode(
  line: PosReceipt["lines"][number],
  taxType: string,
) {
  if (taxType !== "VAT_FREE" && taxType !== "VAT_ZERO") return "";
  const code = String(line.taxProductCode ?? "").replace(/\D/g, "");
  if (code.length === 3 && isValidEbarimtTaxProductCode(taxType, code)) {
    return code;
  }
  throw new Error(`${line.name} барааны eBarimt татварын код дутуу байна`);
}

function numericBarcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 13).padEnd(13, "0");
}

function parseReceiptResponse(
  raw: EbarimtWrapperResponse | EbarimtReceiptContent,
): EbarimtReceiptContent {
  if ("Content" in raw) {
    if (raw.StatusCode && raw.StatusCode >= 400) {
      throw new Error(raw.message || "eBarimt баримт үүсгэхэд алдаа гарлаа");
    }
    return raw.Content
      ? (JSON.parse(raw.Content) as EbarimtReceiptContent)
      : {};
  }
  return raw as EbarimtReceiptContent;
}

export async function issueLocalEbarimtReceipt(
  receipt: PosReceipt,
  payments: Array<{ method: string; amount: number }>,
  register?: EbarimtRegisterConfig | null,
  buyer: EbarimtBuyer = { type: "B2C" },
): Promise<AttachEbarimtPayload> {
  const info = await fetchPosApi<EbarimtInfo>("/rest/info", undefined, register);
  const { merchant, merchantTin } = selectMerchant(info, register);
  const posNo = pickText(register?.ebarimtPosNo, info.posNo);
  if (!merchantTin || !posNo) {
    throw new Error("eBarimt PosAPI дээр merchant эсвэл POS дугаар олдсонгүй");
  }

  const vatPayer = merchant?.vatPayer !== false;
  const grouped = new Map<
    string,
    {
      taxType: string;
      totalAmount: number;
      totalVAT: number;
      totalCityTax: number;
      items: Array<Record<string, string | number>>;
    }
  >();

  for (const line of receipt.lines) {
    const taxType = vatPayer ? normalizeTaxType(line.taxType) : "VAT_ABLE";
    const totalAmount = money(line.lineTotal);
    const qty = Math.max(1, Number(line.qty) || 1);
    const taxProductCode = getTaxProductCode(line, taxType);
    const totalVAT =
      taxType === "VAT_ABLE" && vatPayer
        ? money(Number(line.taxAmount) > 0 ? line.taxAmount : totalAmount / 11)
        : 0;
    const item = {
      name: line.name,
      barCode: numericBarcode(line.productId),
      barCodeType: "UNDEFINED",
      classificationCode:
        line.classificationCode ||
        process.env.NEXT_PUBLIC_EBARIMT_CLASSIFICATION_CODE ||
        EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
      ...(taxProductCode ? { taxProductCode } : {}),
      measureUnit: line.measureUnit || "pcs",
      qty,
      unitPrice: money(totalAmount / qty),
      totalAmount,
      totalVAT,
      totalCityTax: money(line.cityTaxAmount || 0),
    };
    const group = grouped.get(taxType) || {
      taxType,
      totalAmount: 0,
      totalVAT: 0,
      totalCityTax: 0,
      items: [],
    };
    group.items.push(item);
    group.totalAmount = money(group.totalAmount + totalAmount);
    group.totalVAT = money(group.totalVAT + totalVAT);
    group.totalCityTax = money(group.totalCityTax + item.totalCityTax);
    grouped.set(taxType, group);
  }

  const receiptGroups = Array.from(grouped.values());
  const isB2B = buyer.type === "B2B";
  const payload = {
    totalAmount: money(receipt.grandTotal),
    totalVAT: money(receiptGroups.reduce((sum, item) => sum + item.totalVAT, 0)),
    totalCityTax: money(
      receiptGroups.reduce((sum, item) => sum + item.totalCityTax, 0),
    ),
    branchNo: process.env.NEXT_PUBLIC_EBARIMT_BRANCH_NO || DEFAULT_BRANCH_NO,
    districtCode:
      process.env.NEXT_PUBLIC_EBARIMT_DISTRICT_CODE || DEFAULT_DISTRICT_CODE,
    merchantTin,
    posNo,
    type: isB2B ? "B2B_RECEIPT" : "B2C_RECEIPT",
    ...(isB2B ? { customerTin: buyer.tin } : {}),
    billIdSuffix:
      receipt.receiptNo.replace(/[^a-z0-9]/gi, "").slice(-20) ||
      `T${Date.now()}`,
    receipts: receiptGroups.map((group) => ({
      ...group,
      merchantTin,
      ...(isB2B ? { customerTin: buyer.tin } : {}),
    })),
    payments: (payments.length
      ? payments
      : [{ method: receipt.paymentMethod, amount: receipt.grandTotal }]
    ).map((payment) => ({
      code: paymentCode(payment.method),
      status: "PAID",
      paidAmount: money(payment.amount),
    })),
  };

  const raw = await fetchPosApi<
    EbarimtWrapperResponse | EbarimtReceiptContent
  >(
    "/rest/receipt",
    { method: "POST", body: JSON.stringify(payload) },
    register,
  );
  const content = parseReceiptResponse(raw);
  if (String(content.status || "").toUpperCase() !== "SUCCESS") {
    throw new Error(content.message || "eBarimt баримт амжилтгүй буцлаа");
  }
  const firstReceipt = content.receipts?.[0];
  return {
    status: "SUCCESS",
    billId: pickText(content.id, content.billId, content.ddtd),
    receiptId: pickText(firstReceipt?.id, firstReceipt?.receiptId),
    qrData: pickText(
      content.qrData,
      content.qrdata,
      content.qrText,
      content.qrCode,
      content.qr,
      firstReceipt?.qrData,
      firstReceipt?.qrdata,
      firstReceipt?.qrText,
      firstReceipt?.qrCode,
      firstReceipt?.qr,
    ),
    lottery: pickText(
      content.lottery,
      content.lotteryNo,
      firstReceipt?.lottery,
      firstReceipt?.lotteryNo,
    ),
    date: pickText(content.date),
    receiptType: buyer.type,
    customerName: buyer.type === "B2B" ? pickText(buyer.name) : null,
    customerTin: buyer.type === "B2B" ? buyer.tin : null,
    customerRegNo: buyer.type === "B2B" ? pickText(buyer.regNo) : null,
    payload: content,
  };
}

export async function attachEbarimtReceipt(
  saleId: string,
  payload: AttachEbarimtPayload,
): Promise<Pick<PosReceipt, "ebarimt">> {
  const response = await authFetch(
    `${API}/pos/sales/${encodeURIComponent(saleId)}/ebarimt`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Ebarimt мэдээлэл хадгалж чадсангүй");
  }
  return data as Pick<PosReceipt, "ebarimt">;
}

export function mapEbarimtPayload(
  payload: AttachEbarimtPayload,
): NonNullable<PosReceipt["ebarimt"]> {
  return {
    status: payload.status,
    billId: payload.billId ?? null,
    receiptId: payload.receiptId ?? null,
    qrData: payload.qrData ?? null,
    lottery: payload.lottery ?? null,
    date: payload.date ?? null,
    error: payload.error ?? null,
    syncedAt: new Date().toISOString(),
    receiptType: payload.receiptType ?? null,
    customerName: payload.customerName ?? null,
    customerTin: payload.customerTin ?? null,
    customerRegNo: payload.customerRegNo ?? null,
  };
}
