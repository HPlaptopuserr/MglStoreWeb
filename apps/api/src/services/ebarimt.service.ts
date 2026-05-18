export type EbarimtReceiptStatus = "DISABLED" | "PENDING" | "SENT" | "FAILED" | "VOID_PENDING" | "VOIDED";

export type EbarimtConfig = {
  enabled: boolean;
  tin?: string | null;
  branchNo?: string | null;
  posNo?: string | null;
  serviceUrl?: string | null;
  districtCode?: string | null;
};

export type EbarimtPaymentLine = {
  method: string;
  amount: number;
};

export type EbarimtSaleLine = {
  productId: string;
  productName: string;
  productSku?: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  lineTotal: number;
};

export type EbarimtIssueInput = {
  saleId: string;
  receiptNo: string;
  createdAt: Date | string;
  grandTotal: number;
  taxTotal: number;
  lines: EbarimtSaleLine[];
  payments: EbarimtPaymentLine[];
};

export type EbarimtIssueResult = {
  status: EbarimtReceiptStatus;
  billId?: string | null;
  qrData?: string | null;
  lottery?: string | null;
  error?: string | null;
  payload?: Record<string, unknown>;
  response?: Record<string, unknown>;
  sentAt?: Date | null;
};

const env = () => ({
  serviceUrl: (process.env.EBARIMT_SERVICE_URL || "").trim(),
  receiptPath: (process.env.EBARIMT_RECEIPT_PATH || "/rest/receipt").trim(),
  healthPath: (process.env.EBARIMT_HEALTH_PATH || "/rest/info").trim(),
  returnPath: (process.env.EBARIMT_RETURN_PATH || "/rest/receipt").trim(),
  timeoutMs: Math.max(1000, Number(process.env.EBARIMT_TIMEOUT_MS || 15_000)),
  districtCode: (process.env.EBARIMT_DEFAULT_DISTRICT_CODE || "0101").trim(),
  classificationCode: (process.env.EBARIMT_DEFAULT_CLASSIFICATION_CODE || "0000000").trim(),
});

const roundMoney = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const clean = (value: unknown) => String(value || "").trim();

const normalizeBaseUrl = (value?: string | null) => clean(value || env().serviceUrl).replace(/\/+$/, "");

const joinUrl = (baseUrl: string, path: string) => `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return null;
};

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { rawText: text };
  }
}

function buildBillIdSuffix(receiptNo: string) {
  const compact = receiptNo.replace(/[^A-Za-z0-9]/g, "");
  return (compact || Date.now().toString()).slice(-20);
}

function mapPaymentCode(method: string) {
  return method.toUpperCase() === "CASH" ? "CASH" : "PAYMENT_CARD";
}

export function buildEbarimtReceiptPayload(config: EbarimtConfig, input: EbarimtIssueInput): Record<string, unknown> {
  const settings = env();
  const merchantTin = clean(config.tin);
  const branchNo = clean(config.branchNo) || "001";
  const posNo = clean(config.posNo) || "001";
  const districtCode = clean(config.districtCode) || settings.districtCode;
  const totalAmount = roundMoney(input.grandTotal);
  const totalVAT = roundMoney(input.taxTotal);

  const items = input.lines.map((line) => {
    const totalItemAmount = roundMoney(line.lineTotal);
    return {
      name: line.productName,
      barCode: line.productSku || line.productId,
      barCodeType: "UNDEFINED",
      classificationCode: settings.classificationCode,
      measureUnit: "ш",
      qty: line.qty,
      unitPrice: roundMoney(line.unitPrice),
      totalAmount: totalItemAmount,
      totalVAT: roundMoney(line.taxAmount),
      totalCityTax: 0,
    };
  });

  const payments = input.payments.map((payment) => ({
    code: mapPaymentCode(payment.method),
    paidAmount: roundMoney(payment.amount),
    status: "PAID",
  }));

  return {
    branchNo,
    totalAmount,
    totalVAT,
    totalCityTax: 0,
    districtCode,
    merchantTin,
    posNo,
    type: "B2C_RECEIPT",
    billIdSuffix: buildBillIdSuffix(input.receiptNo),
    receipts: [
      {
        totalAmount,
        totalVAT,
        totalCityTax: 0,
        taxType: "VAT_ABLE",
        merchantTin,
        items,
      },
    ],
    payments,
  };
}

function parseReceiptResult(data: Record<string, unknown>): Pick<EbarimtIssueResult, "billId" | "qrData" | "lottery" | "error"> {
  const receipts = Array.isArray(data.receipts) ? data.receipts.map(safeObject) : [];
  const firstReceipt = receipts[0] || {};
  const billId = firstString(data.id, data.billId, data.bill_id, firstReceipt.id, firstReceipt.billId);
  const qrData = firstString(data.qrData, data.qr_data, data.qrText, data.qr, firstReceipt.qrData);
  const lottery = firstString(data.lottery, data.lotteryNo, data.lottery_no, firstReceipt.lottery);
  const error = firstString(data.message, data.error, data.errorMessage);
  return { billId, qrData, lottery, error };
}

export function getEbarimtConfigFromOrganization(org: EbarimtConfig | null | undefined): EbarimtConfig {
  return {
    enabled: !!org?.enabled,
    tin: org?.tin || null,
    branchNo: org?.branchNo || null,
    posNo: org?.posNo || null,
    serviceUrl: org?.serviceUrl || null,
    districtCode: org?.districtCode || null,
  };
}

export function validateEbarimtConfig(config: EbarimtConfig): string | null {
  if (!config.enabled) return null;
  if (!clean(config.tin)) return "eBarimt TIN тохируулаагүй байна";
  if (!clean(config.branchNo)) return "eBarimt branchNo тохируулаагүй байна";
  if (!clean(config.posNo)) return "eBarimt posNo тохируулаагүй байна";
  if (!normalizeBaseUrl(config.serviceUrl)) return "eBarimt service URL тохируулаагүй байна";
  return null;
}

export async function checkEbarimtHealth(config: EbarimtConfig): Promise<{ ok: boolean; response?: Record<string, unknown>; error?: string }> {
  const baseUrl = normalizeBaseUrl(config.serviceUrl);
  if (!baseUrl) return { ok: false, error: "eBarimt service URL хоосон байна" };

  try {
    const res = await fetch(joinUrl(baseUrl, env().healthPath), {
      method: "GET",
      signal: AbortSignal.timeout(env().timeoutMs),
    });
    const response = await readJsonResponse(res);
    if (!res.ok) {
      return { ok: false, response, error: firstString(response.message, response.error) || `HTTP ${res.status}` };
    }
    return { ok: true, response };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function issueEbarimtReceipt(config: EbarimtConfig, input: EbarimtIssueInput): Promise<EbarimtIssueResult> {
  if (!config.enabled) return { status: "DISABLED" };

  const configError = validateEbarimtConfig(config);
  const payload = buildEbarimtReceiptPayload(config, input);
  if (configError) {
    return { status: "FAILED", error: configError, payload };
  }

  const baseUrl = normalizeBaseUrl(config.serviceUrl);
  try {
    const res = await fetch(joinUrl(baseUrl, env().receiptPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(env().timeoutMs),
    });
    const response = await readJsonResponse(res);
    const parsed = parseReceiptResult(response);
    const responseStatus = firstString(response.status, response.code)?.toUpperCase() || "";
    const failed = !res.ok || ["ERROR", "FAILED", "FAIL"].includes(responseStatus);
    if (failed) {
      return {
        status: "FAILED",
        error: parsed.error || `eBarimt HTTP ${res.status}`,
        payload,
        response,
      };
    }

    return {
      status: "SENT",
      billId: parsed.billId,
      qrData: parsed.qrData,
      lottery: parsed.lottery,
      payload,
      response,
      sentAt: new Date(),
    };
  } catch (error) {
    return {
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
      payload,
    };
  }
}

export async function returnEbarimtReceipt(config: EbarimtConfig, billId: string, date: Date | string) {
  const baseUrl = normalizeBaseUrl(config.serviceUrl);
  if (!config.enabled || !baseUrl || !billId) {
    return { ok: false, error: "eBarimt буцаалт хийх тохиргоо дутуу байна" };
  }

  try {
    const res = await fetch(joinUrl(baseUrl, env().returnPath), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: billId,
        date: typeof date === "string" ? date : date.toISOString(),
      }),
      signal: AbortSignal.timeout(env().timeoutMs),
    });
    const response = await readJsonResponse(res);
    if (!res.ok) {
      return { ok: false, response, error: firstString(response.message, response.error) || `HTTP ${res.status}` };
    }
    return { ok: true, response };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
