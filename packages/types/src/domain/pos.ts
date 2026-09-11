// ─── Payment method ───────────────────────────────────────────────────────────

export type SalePaymentMethod = "CASH" | "CARD" | "QR" | "CREDIT";

// ─── QPay ────────────────────────────────────────────────────────────────────

export type QPayInvoiceStatus = "PENDING" | "PAID" | "EXPIRED";

export interface QPayInvoice {
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  status: QPayInvoiceStatus;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

// ─── Card / PushECR ──────────────────────────────────────────────────────────

export type CardAttemptStatus = "PENDING" | "APPROVED" | "DECLINED" | "FAILED";

export interface CardAttempt {
  attemptId: string;
  amount: number;
  terminalId: string;
  status: CardAttemptStatus;
  transactionId?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushEcrResult {
  succeed: boolean;
  message?: string;
}

export interface SettlementResult {
  succeed: boolean;
  message?: string;
  count?: number;
  amount?: number;
}

// ─── Register config ──────────────────────────────────────────────────────────

export interface RegisterConfig {
  id: string;
  name: string;
  label: string | null;
  cardEnabled: boolean;
  cardProviderType: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  qpayEnabled: boolean;
  effectiveQpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
  ebarimtEnabled: boolean;
  ebarimtPosApiUrl: string | null;
  ebarimtMerchantTin: string | null;
  ebarimtPosNo: string | null;
  ebarimtMerchantName: string | null;
  minuAgentEnabled?: boolean;
  minuAgentUsername?: string | null;
  minuAgentBranchId?: string | null;
  minuAgentPasswordSet?: boolean;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  branch: { id: string; name: string };
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export type PosPriceType = "UNIT" | "WHOLESALE" | "ORDER";
export type PosMeasureUnit = "pcs" | "kg";

export const POS_PIECE_UNIT: PosMeasureUnit = "pcs";
export const POS_WEIGHT_UNIT: PosMeasureUnit = "kg";
export const POS_WEIGHT_STEP_KG = 0.001;
export const POS_WEIGHT_STOCK_SCALE = 1_000;

export const normalizePosMeasureUnit = (value: unknown): PosMeasureUnit => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["kg", "кг", "kilogram", "kilograms"].includes(normalized)
    ? POS_WEIGHT_UNIT
    : POS_PIECE_UNIT;
};

export const isPosWeightUnit = (value: unknown) =>
  normalizePosMeasureUnit(value) === POS_WEIGHT_UNIT;

export const roundPosQuantity = (value: number, unit: unknown) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 0;
  return isPosWeightUnit(unit)
    ? Math.round(quantity * POS_WEIGHT_STOCK_SCALE) / POS_WEIGHT_STOCK_SCALE
    : Math.floor(quantity);
};

export const toPosStoredStockQuantity = (value: number, unit: unknown) => {
  const quantity = Math.max(0, roundPosQuantity(value, unit));
  return isPosWeightUnit(unit)
    ? Math.round(quantity * POS_WEIGHT_STOCK_SCALE)
    : quantity;
};

export const fromPosStoredStockQuantity = (value: number, unit: unknown) => {
  const quantity = Math.max(0, Number(value) || 0);
  return isPosWeightUnit(unit)
    ? Math.round(quantity) / POS_WEIGHT_STOCK_SCALE
    : Math.floor(quantity);
};

export const formatPosQuantity = (value: number, unit: unknown) => {
  const normalizedUnit = normalizePosMeasureUnit(unit);
  const quantity = roundPosQuantity(value, normalizedUnit);
  return `${quantity.toLocaleString("mn-MN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: normalizedUnit === POS_WEIGHT_UNIT ? 3 : 0,
  })} ${normalizedUnit === POS_WEIGHT_UNIT ? "кг" : "ш"}`;
};

export interface PosProduct {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  imageUrl?: string | null;
  price: number;
  wholesalePrice?: number | null;
  orderPrice?: number | null;
  stockQty: number;
  expiryDate?: string | null;
  taxType?: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  taxRate?: number;
  cityTaxRate?: number;
  classificationCode?: string;
  taxProductCode?: string | null;
  measureUnit?: PosMeasureUnit;
  isActive: boolean;
  categoryName?: string | null;
}

export interface CartLine {
  productId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  priceType: PosPriceType;
  baseUnitPrice: number;
  wholesalePrice?: number | null;
  orderPrice?: number | null;
  qty: number;
  stockQty: number;
  taxType?: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  taxRate: number;
  cityTaxRate?: number;
  classificationCode?: string;
  taxProductCode?: string | null;
  measureUnit?: PosMeasureUnit;
  discountAmount: number;
}

export interface PosCart {
  lines: CartLine[];
  note?: string;
}

export interface CartTotals {
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}

// ─── Sale ────────────────────────────────────────────────────────────────────

export interface SalePaymentLine {
  method: SalePaymentMethod;
  amount: number;
  attemptId?: string;
  transactionId?: string;
  invoiceId?: string;
  credit?: SaleCreditPaymentMeta;
}

export interface SaleCreditPaymentMeta {
  targetType: "COMPANY" | "CUSTOMER";
  borrowerId: string;
  borrowerName: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  borrowerAddress?: string;
  employeeId?: string;
  employeeName?: string;
  termMonths: number;
  monthlyInterestRate: number;
  principal: number;
  totalInterest: number;
  totalDue: number;
  dueDate: string;
  note?: string;
}

export interface PosCreditBorrower {
  id: string;
  targetType: "COMPANY" | "CUSTOMER";
  borrowerId: string;
  borrowerName: string;
  borrowerPhone?: string | null;
  borrowerEmail?: string | null;
  borrowerAddress?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalePayload {
  shiftId: string;
  branchId: string;
  registerId?: string;
  organizationId?: string;
  clientSaleId?: string;
  paymentMethod: string;
  paymentBreakdown?: SalePaymentLine[];
  loyalty?: {
    mode: "EARN" | "REDEEM" | "NONE";
    phone?: string;
    redeemPoints?: number;
    redeemSessionId?: string;
  };
  totalPaid?: number;
  remaining?: number;
  status?: "PARTIAL" | "PAID";
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    priceType: PosPriceType;
    discountAmount: number;
    taxType?: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
    taxRate: number;
    cityTaxRate?: number;
    classificationCode?: string;
    taxProductCode?: string | null;
    measureUnit?: string;
  }>;
  note?: string;
}

// ─── Shift ───────────────────────────────────────────────────────────────────

export type ShiftStatus = "OPEN" | "CLOSED";
export type CashDrawerEventType = "PAID_IN" | "PAID_OUT" | "OPEN_DRAWER";

export interface CashDenominationCount {
  denomination: number;
  count: number;
  total: number;
}

export interface CashDrawerEvent {
  id: string;
  organizationId: string;
  branchId: string;
  registerId: string | null;
  shiftId: string;
  cashierId: string;
  cashierName?: string;
  type: CashDrawerEventType;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CashDrawerSummary {
  shift: PosShift;
  events: CashDrawerEvent[];
  openingCash: number;
  cashSales: number;
  paidIn: number;
  paidOut: number;
  expectedCash: number;
  countedCash: number | null;
  cashDifference: number | null;
  cashCount: CashDenominationCount[];
}

export interface PosShift {
  id: string;
  organizationId?: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  branchName?: string;
  registerId?: string | null;
  registerName?: string | null;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number;
  cashDifference?: number | null;
  cashCount?: CashDenominationCount[];
  cashCountedAt?: string | null;
  note?: string | null;
  status: ShiftStatus;
}

export interface PosShiftHistoryItem extends PosShift {
  organizationId: string;
  branchName: string;
  registerId: string | null;
  registerName: string | null;
  cashDifference: number | null;
  cashCount: CashDenominationCount[];
  cashCountedAt?: string | null;
  note: string | null;
  salesCount: number;
  totalSales: number;
  cashSales: number;
  paidIn: number;
  paidOut: number;
  cardSales: number;
  qpaySales: number;
  creditSales: number;
  mixedSales: number;
}

export interface PosShiftHistoryResponse {
  shifts: PosShiftHistoryItem[];
}

export interface OpenShiftPayload {
  branchId: string;
  registerId?: string;
  openingCash: number;
}

export interface CloseShiftPayload {
  shiftId: string;
  closingCash: number;
  cashCount?: CashDenominationCount[];
  note?: string;
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

export interface ReceiptLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  priceType?: PosPriceType;
  taxAmount: number;
  taxType?: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  taxRate?: number;
  cityTaxRate?: number;
  cityTaxAmount?: number;
  classificationCode?: string;
  taxProductCode?: string | null;
  measureUnit?: string;
  lineTotal: number;
}

export interface PosReceipt {
  id: string;
  receiptNo: string;
  branchName: string;
  cashierName: string;
  paymentMethod: string;
  status?: string;
  voidedAt?: string | null;
  ebarimt?: {
    status?: string | null;
    billId?: string | null;
    receiptId?: string | null;
    qrData?: string | null;
    lottery?: string | null;
    date?: string | null;
    error?: string | null;
    syncedAt?: string | null;
    receiptType?: "B2C" | "B2B" | null;
    customerName?: string | null;
    customerTin?: string | null;
    customerRegNo?: string | null;
  } | null;
  paymentBreakdown?: Array<{
    method: string;
    amount: number;
    transactionId?: string;
    invoiceId?: string;
    attemptId?: string;
    traceno?: string | null;
    terminalId?: string | null;
  }>;
  loyalty?: {
    mode: string;
    phone: string;
    earnedPoints: number;
    redeemedPoints: number;
    balanceAfter: number | null;
    earnRate: number;
    membershipBadge: string;
  } | null;
  credit?: {
    id: string;
    customerId?: string | null;
    status: string;
    targetType: string;
    borrowerId: string;
    borrowerName: string;
    borrowerPhone?: string | null;
    borrowerEmail?: string | null;
    borrowerAddress?: string | null;
    employeeId?: string | null;
    employeeName?: string | null;
    principalAmount: number;
    monthlyInterestRate: number;
    totalInterest: number;
    totalDue: number;
    termMonths: number;
    dueDate?: string | null;
    paidAt?: string | null;
    paidAmount?: number | null;
    paymentMethod?: string | null;
    paymentNote?: string | null;
  } | null;
  createdAt: string;
  lines: ReceiptLine[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}
