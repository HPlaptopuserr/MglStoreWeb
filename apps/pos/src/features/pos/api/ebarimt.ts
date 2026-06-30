import type { PosReceipt } from "../types/receipt.types";
import type { RegisterConfig, SalePaymentLine } from "../types/pos.types";
import { posRequest } from "./_pos-client";

type EbarimtPayment = {
  code: string;
  status: "PAID";
  paidAmount: number;
};

export type EbarimtInfo = {
  operatorTIN?: string;
  operatorName?: string;
  posNo?: string;
  lastSentDate?: string | null;
  version?: string;
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

export type LocalInvalidReceipt = {
  id: string;
  [key: string]: unknown;
};

export type EbarimtBuyer =
  | { type: "B2C" }
  | { type: "B2B"; tin: string; regNo?: string; name?: string | null };

export type EbarimtTinLookupResult = {
  regNo: string;
  tin: string;
};

export type AttachEbarimtPayload = {
  status: "SUCCESS" | "FAILED";
  billId?: string | null;
  receiptId?: string | null;
  qrData?: string | null;
  lottery?: string | null;
  date?: string | null;
  error?: string | null;
  payload?: unknown;
};

const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const DEFAULT_POS_API_URL = "http://localhost:7080";
const DEFAULT_BRANCH_NO = "001";
const DEFAULT_DISTRICT_CODE = "0101";
const DEFAULT_CLASSIFICATION_CODE = "4711000";
const EBARIMT_CONFIG = {
  BRANCH_NO: process.env.NEXT_PUBLIC_EBARIMT_BRANCH_NO,
  DISTRICT_CODE: process.env.NEXT_PUBLIC_EBARIMT_DISTRICT_CODE,
  CLASSIFICATION_CODE: process.env.NEXT_PUBLIC_EBARIMT_CLASSIFICATION_CODE,
};

function getPosApiUrl() {
  const configured =
    process.env.NEXT_PUBLIC_EBARIMT_POS_API_URL ||
    (typeof window !== "undefined" ? localStorage.getItem("mgl_ebarimt_pos_api_url") : "") ||
    DEFAULT_POS_API_URL;
  return configured.replace(/\/$/, "");
}

function getPosApiFetchUrl(path: string) {
  if (typeof window !== "undefined") {
    return `/api/ebarimt/posapi?path=${encodeURIComponent(path)}`;
  }

  return `${getPosApiUrl()}${path}`;
}

function getEbarimtConfig(key: keyof typeof EBARIMT_CONFIG, fallback: string) {
  const envValue = EBARIMT_CONFIG[key];
  return String(envValue || fallback).trim() || fallback;
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

async function fetchLocalPosApi<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(getPosApiFetchUrl(path), {
      ...init,
      headers,
      signal: init?.signal || controller.signal,
      cache: "no-store",
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(raw || `eBarimt PosAPI алдаа гарлаа (HTTP ${res.status})`);
    }

    if (!raw) return {} as T;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("eBarimt PosAPI timeout боллоо");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function receiptIdFrom(value: Record<string, unknown>) {
  return pickText(value.id, value.receiptId, value.billId, value.ddtd, value.saleId);
}

function normalizeInvalidReceipts(raw: unknown): LocalInvalidReceipt[] {
  const value = parseMaybeJson(raw);

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null))
      .map((item) => {
        if (!item) return null;
        const id = receiptIdFrom(item);
        return id ? ({ ...item, id } as LocalInvalidReceipt) : null;
      })
      .filter((item): item is LocalInvalidReceipt => Boolean(item));
  }

  if (typeof value !== "object" || value === null) return [];

  const objectValue = value as Record<string, unknown>;
  if (typeof objectValue.Content === "string") {
    return normalizeInvalidReceipts(objectValue.Content);
  }

  for (const key of ["data", "receipts", "list", "items"]) {
    if (key in objectValue) {
      const receipts = normalizeInvalidReceipts(objectValue[key]);
      if (receipts.length > 0) return receipts;
    }
  }

  const id = receiptIdFrom(objectValue);
  return id ? [{ ...objectValue, id } as LocalInvalidReceipt] : [];
}

export async function getLocalEbarimtInfo(): Promise<EbarimtInfo> {
  return fetchLocalPosApi<EbarimtInfo>("/rest/info");
}

export async function sendLocalEbarimtData(): Promise<EbarimtInfo> {
  await fetchLocalPosApi<unknown>("/rest/sendData", undefined, 600_000);
  return getLocalEbarimtInfo();
}

export async function lookupEbarimtTin(regNo: string): Promise<EbarimtTinLookupResult> {
  const normalized = regNo.replace(/\D/g, "");
  const res = await fetch(`/api/ebarimt/tin?regNo=${encodeURIComponent(normalized)}`, {
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.message || `eBarimt TIN lookup failed (HTTP ${res.status})`);
  }

  return payload as EbarimtTinLookupResult;
}

export async function getLocalEbarimtInvalidReceipts(): Promise<LocalInvalidReceipt[]> {
  const raw = await fetchLocalPosApi<unknown>("/rest/receipt/invalid/list");
  return normalizeInvalidReceipts(raw);
}

export async function sendLocalEbarimtInvalidReceipt(id: string): Promise<unknown> {
  return fetchLocalPosApi<unknown>(`/rest/receipt/invalid/send/${encodeURIComponent(id)}`);
}

export async function sendAllLocalEbarimtInvalidReceipts(): Promise<{
  total: number;
  sent: number;
  failed: Array<{ id: string; error: string }>;
  receipts: LocalInvalidReceipt[];
}> {
  const receipts = await getLocalEbarimtInvalidReceipts();
  const failed: Array<{ id: string; error: string }> = [];
  let sent = 0;

  for (const receipt of receipts) {
    try {
      await sendLocalEbarimtInvalidReceipt(receipt.id);
      sent += 1;
    } catch (error: any) {
      failed.push({
        id: receipt.id,
        error: error?.message || "Invalid receipt send failed",
      });
    }
  }

  return { total: receipts.length, sent, failed, receipts };
}

function parseReceiptResponse(raw: EbarimtWrapperResponse | EbarimtReceiptContent): EbarimtReceiptContent {
  if ("Content" in raw) {
    if (raw.StatusCode && raw.StatusCode >= 400) {
      throw new Error(raw.message || "eBarimt PosAPI баримт үүсгэхэд алдаа гарлаа");
    }
    if (!raw.Content) return {};
    return JSON.parse(raw.Content) as EbarimtReceiptContent;
  }
  return raw;
}

function paymentCode(method: string) {
  const normalized = method.toUpperCase();
  if (normalized === "CARD") return "PAYMENT_CARD";
  if (normalized === "QR" || normalized === "QPAY") return "BANK_TRANSFER_QPAY";
  return "CASH";
}

function buildPayments(receipt: PosReceipt, payments: SalePaymentLine[]): EbarimtPayment[] {
  const source = payments.length > 0 ? payments : [{ method: receipt.paymentMethod, amount: receipt.grandTotal }];
  return source.map((item) => ({
    code: paymentCode(item.method),
    status: "PAID",
    paidAmount: money(item.amount),
  }));
}

function makeBillIdSuffix(receiptNo: string) {
  const suffix = receiptNo.replace(/[^a-z0-9]/gi, "").slice(-20);
  return suffix || `T${Date.now()}`;
}

function numericBarcode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  return digits.padEnd(13, "0") || "0000000000000";
}

function vatAmount(total: number, explicitTax: number, vatPayer: boolean) {
  if (!vatPayer) return 0;
  if (explicitTax > 0) return money(explicitTax);
  return money(total / 11);
}

function lineVatAmount(line: PosReceipt["lines"][number], total: number, vatPayer: boolean) {
  if (line.taxType && line.taxType !== "VAT_ABLE") return 0;
  return vatAmount(total, line.taxAmount, vatPayer);
}

export async function issueLocalEbarimtReceipt(
  receipt: PosReceipt,
  payments: SalePaymentLine[],
  _register?: RegisterConfig | null,
  buyer: EbarimtBuyer = { type: "B2C" },
): Promise<AttachEbarimtPayload> {
  const info = await fetchLocalPosApi<EbarimtInfo>("/rest/info");
  const merchant = info.merchants?.[0];
  const merchantTin = merchant?.tin || info.operatorTIN;
  const posNo = info.posNo;

  if (!merchantTin || !posNo) {
    throw new Error("eBarimt PosAPI дээр merchant эсвэл posNo олдсонгүй");
  }

  const vatPayer = merchant?.vatPayer !== false;
  const items = receipt.lines.map((line) => {
    const totalAmount = money(line.lineTotal);
    const qty = Math.max(1, Number(line.qty) || 1);
    return {
      name: line.name,
      barCode: numericBarcode(line.productId),
      barCodeType: "UNDEFINED",
      classificationCode: line.classificationCode || getEbarimtConfig("CLASSIFICATION_CODE", DEFAULT_CLASSIFICATION_CODE),
      measureUnit: line.measureUnit || "pcs",
      qty,
      unitPrice: money(totalAmount / qty),
      totalAmount,
      totalVAT: lineVatAmount(line, totalAmount, vatPayer),
      totalCityTax: money(line.cityTaxAmount || 0),
    };
  });
  const totalVAT = money(items.reduce((sum, item) => sum + item.totalVAT, 0));
  const totalCityTax = money(items.reduce((sum, item) => sum + item.totalCityTax, 0));
  const receiptTaxType =
    vatPayer
      ? receipt.lines.find((line) => line.taxType)?.taxType || "VAT_ABLE"
      : "VAT_FREE";
  const isB2B = buyer.type === "B2B";

  const payload = {
    totalAmount: money(receipt.grandTotal),
    totalVAT,
    totalCityTax,
    branchNo: getEbarimtConfig("BRANCH_NO", DEFAULT_BRANCH_NO),
    districtCode: getEbarimtConfig("DISTRICT_CODE", DEFAULT_DISTRICT_CODE),
    merchantTin,
    posNo,
    type: isB2B ? "B2B_RECEIPT" : "B2C_RECEIPT",
    ...(isB2B ? { customerTin: buyer.tin } : {}),
    billIdSuffix: makeBillIdSuffix(receipt.receiptNo),
    receipts: [
      {
        totalAmount: money(receipt.grandTotal),
        taxType: receiptTaxType,
        merchantTin,
        ...(isB2B ? { customerTin: buyer.tin } : {}),
        totalVAT,
        totalCityTax,
        items,
      },
    ],
    payments: buildPayments(receipt, payments),
  };

  const raw = await fetchLocalPosApi<EbarimtWrapperResponse | EbarimtReceiptContent>("/rest/receipt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const content = parseReceiptResponse(raw);

  if (String(content.status || "").toUpperCase() !== "SUCCESS") {
    throw new Error(content.message || "eBarimt баримт SUCCESS төлөвтэй ирсэнгүй");
  }

  const firstReceipt = Array.isArray(content.receipts) ? content.receipts[0] : undefined;
  const billId = pickText(content.id, content.billId, content.ddtd);
  const receiptId = pickText(firstReceipt?.id, firstReceipt?.receiptId);
  const qrData = pickText(
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
  );
  const lottery = pickText(content.lottery, content.lotteryNo, firstReceipt?.lottery, firstReceipt?.lotteryNo);

  return {
    status: "SUCCESS",
    billId,
    receiptId,
    qrData,
    lottery,
    date: pickText(content.date),
    payload: content,
  };
}

export async function attachEbarimtReceipt(
  saleId: string,
  payload: AttachEbarimtPayload,
): Promise<Pick<PosReceipt, "ebarimt">> {
  return posRequest<Pick<PosReceipt, "ebarimt">>(`/pos/sales/${encodeURIComponent(saleId)}/ebarimt`, {
    method: "POST",
    body: payload,
  });
}
