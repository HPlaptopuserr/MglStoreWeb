import type { PosReceipt } from "../types/receipt.types";
import type { RegisterConfig, SalePaymentLine } from "../types/pos.types";
import { posRequest } from "./_pos-client";

type EbarimtPayment = {
  code: string;
  status: "PAID";
  paidAmount: number;
};

type EbarimtInfo = {
  operatorTIN?: string;
  posNo?: string;
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

async function fetchLocalPosApi<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${getPosApiUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      signal: init?.signal || controller.signal,
      cache: "no-store",
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(raw || `eBarimt PosAPI алдаа гарлаа (HTTP ${res.status})`);
    }

    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("eBarimt PosAPI timeout боллоо");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
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

export async function issueLocalEbarimtReceipt(
  receipt: PosReceipt,
  payments: SalePaymentLine[],
  _register?: RegisterConfig | null,
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
      classificationCode: getEbarimtConfig("CLASSIFICATION_CODE", DEFAULT_CLASSIFICATION_CODE),
      measureUnit: "pcs",
      qty,
      unitPrice: money(totalAmount / qty),
      totalAmount,
      totalVAT: vatAmount(totalAmount, line.taxAmount, vatPayer),
      totalCityTax: 0,
    };
  });
  const totalVAT = money(items.reduce((sum, item) => sum + item.totalVAT, 0));

  const payload = {
    totalAmount: money(receipt.grandTotal),
    totalVAT,
    totalCityTax: 0,
    branchNo: getEbarimtConfig("BRANCH_NO", DEFAULT_BRANCH_NO),
    districtCode: getEbarimtConfig("DISTRICT_CODE", DEFAULT_DISTRICT_CODE),
    merchantTin,
    posNo,
    type: "B2C_RECEIPT",
    billIdSuffix: makeBillIdSuffix(receipt.receiptNo),
    receipts: [
      {
        totalAmount: money(receipt.grandTotal),
        taxType: vatPayer ? "VAT_ABLE" : "VAT_FREE",
        merchantTin,
        totalVAT,
        totalCityTax: 0,
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
