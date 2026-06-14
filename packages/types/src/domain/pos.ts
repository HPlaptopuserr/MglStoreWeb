// ─── Payment method ───────────────────────────────────────────────────────────

export type SalePaymentMethod = "CASH" | "CARD" | "QR";

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

export interface PosProduct {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  imageUrl?: string | null;
  price: number;
  stockQty: number;
  expiryDate?: string | null;
  taxRate?: number;
  isActive: boolean;
  categoryName?: string | null;
}

export interface CartLine {
  productId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  qty: number;
  stockQty: number;
  taxRate: number;
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
  };
  totalPaid?: number;
  remaining?: number;
  status?: "PARTIAL" | "PAID";
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
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
  taxAmount: number;
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
  createdAt: string;
  lines: ReceiptLine[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}
