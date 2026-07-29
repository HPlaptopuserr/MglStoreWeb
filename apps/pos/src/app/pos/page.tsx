"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";

import {
  Barcode,
  Search,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Filter,
  HandCoins,
  Loader2,
  Info,
  MinusCircle,
  PlusCircle,
  Printer,
  RefreshCw,
  Settings,
  Utensils,
  UsersRound,
  X,
} from "lucide-react";
import {
  PosCartPanel,
  PosPaymentPanel,
  PosCheckoutView,
  type CheckoutPaymentEntry,
  type CheckoutLoyaltyState,
  type CheckoutLoyaltyRedeemSession,
  ProductLabelPrintDialog,
  ReceiptPreview,
  usePosCart,
  useCreateSale,
  useOwnProducts,
  usePosProducts,
  useCurrentShift,
  type CartLine,
  type CartTotals,
  type PaymentMethod,
  type PosCreditBorrower,
  type PosReceipt,
  type SaleCreditPaymentMeta,
  type SalePaymentLine,
  formatReceipt,
  createCardAttempt,
  chargeClientBridge,
  submitClientBridgeResult,
  getCardAttemptStatus,
  cancelPushEcr,
  createQPayInvoice,
  getQPayInvoiceStatus,
  confirmQPayInvoice,
  createLoyaltyRedeemSession,
  getLoyaltyRedeemSessionStatus,
  fetchRegisterConfig,
  createCashDrawerEvent,
  getCashDrawerSummary,
  getReceipts,
  getShiftHistory,
  getLocalEbarimtInfo,
  issueLocalEbarimtReceipt,
  attachEbarimtReceipt,
  sendLocalEbarimtData,
  lookupEbarimtTin,
  type AttachEbarimtPayload,
  type EbarimtBuyer,
  type RegisterConfig,
  type CashDenominationCount,
  type CashDrawerEvent,
  type CashDrawerEventType,
  type CashDrawerSummary,
  type PosShiftHistoryItem,
  CUSTOMER_DISPLAY_THEME_OPTIONS,
  CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
  type CustomerDisplayThemeId,
  isCustomerDisplayThemeId,
  MobileBlock,
  PosAccessGate,
  PosRegisterPendingBanner,
  PosRegisterPicker,
  PosRegisterSetupBanner,
  PosRegisterSetupPanel,
  usePosAccess,
  usePosRegisterSetup,
} from "@/features/pos";
import { API, authFetch } from "@/lib/api";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

type PosView = "register" | "checkout" | "history";

const CUSTOMER_DISPLAY_CHANNEL = "mgl-pos-customer-display";

type QPayModalPayload = {
  open: boolean;
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  expiresAt: string;
};

type CustomerDisplaySuccess = {
  text: string;
  amount: number;
  ts: number;
};

type CustomerDisplayPayload = {
  lines: CartLine[];
  totals: CartTotals;
  displayTheme: CustomerDisplayThemeId;
  qpayModal: QPayModalPayload | null;
  loyaltyRedeemSession: CheckoutLoyaltyRedeemSession | null;
  customerSuccess: CustomerDisplaySuccess | null;
  ts: number;
};

type PendingEbarimtSale = {
  receipt: PosReceipt;
  paymentBreakdown: SalePaymentLine[];
  loyaltyMessage: string;
  isCreditSale: boolean;
};

type CardPaymentRun = {
  pendingId: string;
  terminalId?: string;
  provider?: string | null;
  abortController: AbortController;
  cancelled: boolean;
};

type PosListMode = "products" | "credits";

type RestaurantTable = {
  id: string;
  label: string;
  seats: number;
  status: "active" | "empty" | "reserved";
  zone: string;
};

const RESTAURANT_TABLES: RestaurantTable[] = [
  { id: "A1", label: "A1", seats: 4, status: "active", zone: "Гол заал" },
  { id: "A2", label: "A2", seats: 2, status: "empty", zone: "Гол заал" },
  { id: "A3", label: "A3", seats: 6, status: "empty", zone: "Гол заал" },
  { id: "A4", label: "A4", seats: 4, status: "reserved", zone: "Террас" },
  { id: "T1", label: "T1", seats: 4, status: "empty", zone: "Террас" },
  { id: "VIP", label: "VIP", seats: 8, status: "empty", zone: "Өрөө" },
  { id: "B1", label: "B1", seats: 4, status: "empty", zone: "Бар" },
  { id: "B2", label: "B2", seats: 2, status: "empty", zone: "Бар" },
];

type PosCreditListLine = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  lineTotal: number;
};

type PosCreditListItem = {
  id: string;
  customerId: string | null;
  saleId: string;
  receiptNo: string;
  status: string;
  targetType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail: string | null;
  borrowerAddress: string | null;
  employeeId: string | null;
  employeeName: string | null;
  principalAmount: number;
  monthlyInterestRate: number;
  totalInterest: number;
  totalDue: number;
  termMonths: number;
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  createdAt: string;
  lines: PosCreditListLine[];
};

type PosCreditListResponse = {
  credits: PosCreditListItem[];
};

type PosCreditBorrowerListResponse = {
  customers: PosCreditBorrower[];
};

type CreditRepaymentEbarimtReceiptOptions = {
  credit: PosCreditListItem;
  payment: SalePaymentLine;
  branchName: string;
  cashierName: string;
};

type PosCreditCustomerGroup = {
  key: string;
  borrowerName: string;
  borrowerPhone: string | null;
  employeeName: string | null;
  creditCount: number;
  principalAmount: number;
  totalInterest: number;
  totalDue: number;
  rows: Array<{ credit: PosCreditListItem; line: PosCreditListLine }>;
  creditIds: Set<string>;
};

const initialLoyaltyState: CheckoutLoyaltyState = {
  mode: "NONE",
  phone: "",
  lookupLoading: false,
  lookupError: "",
  found: false,
  customerName: null,
  balance: 0,
  earnRate: 0.01,
  membershipBadge: "NONE",
  redeemPoints: 0,
};

function mapEbarimtPayload(payload: AttachEbarimtPayload): NonNullable<PosReceipt["ebarimt"]> {
  return {
    status: payload.status,
    billId: payload.billId ?? null,
    receiptId: payload.receiptId ?? null,
    qrData: payload.qrData ?? null,
    lottery: payload.lottery ?? null,
    date: payload.date ?? null,
    error: payload.error ?? null,
    syncedAt: new Date().toISOString(),
  };
}

const SCAN_GAP_MS = 80;
const EBARIMT_ENABLED = process.env.NEXT_PUBLIC_EBARIMT_ENABLED === "true";
const LONG_RUNNING_CARD_PROVIDERS = new Set(["PUSH_ECR", "MINU_AGENT", "ANDROID_PGW"]);
const terminalNeedsWaitingOverlay = (provider?: string | null) =>
  Boolean(provider && LONG_RUNNING_CARD_PROVIDERS.has(provider));
const getEffectiveCardProvider = (register?: RegisterConfig | null) =>
  register?.cardProviderType || (register?.minuAgentEnabled ? "MINU_AGENT" : null);
const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const formatMoney = (value: number) => `₮${Math.round(Number(value) || 0).toLocaleString("mn-MN")}`;
const padTimePart = (value: number) => String(value).padStart(2, "0");
const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()} оны ${date.getMonth() + 1}-р сарын ${date.getDate()} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};

function buildCreditRepaymentCartLines(credit: PosCreditListItem): CartLine[] {
  const principal = credit.principalAmount || credit.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const multiplier = principal > 0 ? credit.totalDue / principal : 1;
  let allocated = 0;

  return credit.lines.map((line, index) => {
    const isLast = index === credit.lines.length - 1;
    const lineDue = roundMoney(
      isLast ? Math.max(0, credit.totalDue - allocated) : Math.max(0, line.lineTotal * multiplier),
    );
    allocated = roundMoney(allocated + lineDue);

    return {
      productId: `credit:${credit.id}:${line.id}`,
      name: `${line.productName} (${line.qty}ш) - ${credit.employeeName || credit.borrowerName}`,
      imageUrl: null,
      qty: 1,
      stockQty: 1,
      unitPrice: lineDue,
      priceType: "UNIT",
      baseUnitPrice: lineDue,
      taxRate: 0,
      discountAmount: 0,
    };
  });
}

function buildCreditRepaymentEbarimtReceipt({
  credit,
  payment,
  branchName,
  cashierName,
}: CreditRepaymentEbarimtReceiptOptions): PosReceipt {
  const principal = credit.principalAmount || credit.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const multiplier = principal > 0 ? credit.totalDue / principal : 1;
  let allocatedTotal = 0;

  const lines = credit.lines.map((line, index) => {
    const isLast = index === credit.lines.length - 1;
    const lineTotal = roundMoney(
      isLast ? Math.max(0, credit.totalDue - allocatedTotal) : Math.max(0, line.lineTotal * multiplier),
    );
    allocatedTotal = roundMoney(allocatedTotal + lineTotal);

    return {
      productId: line.productId,
      name: line.productName,
      qty: line.qty,
      unitPrice: roundMoney(lineTotal / Math.max(1, line.qty)),
      taxAmount: 0,
      lineTotal,
    };
  });

  return {
    id: credit.saleId,
    receiptNo: credit.receiptNo,
    branchName,
    cashierName,
    paymentMethod: payment.method,
    status: "PAID",
    ebarimt: null,
    paymentBreakdown: [
      {
        method: payment.method,
        amount: roundMoney(payment.amount),
        attemptId: payment.attemptId,
        transactionId: payment.transactionId,
        invoiceId: payment.invoiceId,
      },
    ],
    credit,
    createdAt: new Date().toISOString(),
    lines,
    subTotal: roundMoney(credit.totalDue),
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: roundMoney(credit.totalDue),
    loyalty: null,
  };
}

const SHIFT_HISTORY_RANGE_OPTIONS = [
  { id: "7", label: "7 хоног", description: "Сүүлийн 7 хоногийн", days: 7 },
  { id: "14", label: "14 хоног", description: "Сүүлийн 14 хоногийн", days: 14 },
  { id: "30", label: "30 хоног", description: "Сүүлийн 30 хоногийн", days: 30 },
  { id: "100", label: "100 хаалт", description: "Сүүлийн 100 хаалтын", days: null },
] as const;
type ShiftHistoryRangeId = (typeof SHIFT_HISTORY_RANGE_OPTIONS)[number]["id"];
const CASH_DENOMINATIONS = [
  20000,
  10000,
  5000,
  1000,
  500,
  100,
  50,
  20,
  10,
] as const;

const getShiftHistoryRangeParams = (rangeId: ShiftHistoryRangeId) => {
  const option =
    SHIFT_HISTORY_RANGE_OPTIONS.find((item) => item.id === rangeId) ??
    SHIFT_HISTORY_RANGE_OPTIONS[0];
  if (!option.days) return { limit: 100 };

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - option.days);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    limit: 100,
  };
};

const buildCashCount = (counts: Record<number, number>): CashDenominationCount[] =>
  CASH_DENOMINATIONS.map((denomination) => {
    const count = Math.max(0, Math.floor(Number(counts[denomination]) || 0));
    return {
      denomination,
      count,
      total: denomination * count,
    };
  });

const sumCashCount = (counts: CashDenominationCount[]) =>
  roundMoney(counts.reduce((sum, item) => sum + item.total, 0));

const normalizeProductCode = (value: string) => value.trim().replace(/\s+/g, "").toLowerCase();

const productMatchesCode = (product: { id: string; sku?: string | null; barcode?: string | null }, code: string) => {
  const normalized = normalizeProductCode(code);
  return [product.sku, product.barcode, product.id].some(
    (value) => normalizeProductCode(String(value || "")) === normalized,
  );
};

const validateCardRegisterConfig = (register: RegisterConfig | null) => {
  if (!register) {
    throw new Error("POS register тохиргоо олдсонгүй");
  }

  const provider = getEffectiveCardProvider(register);
  if (!provider) {
    return null;
  }
  if (provider === "ANDROID_PGW" && !register.terminalBridgeUrl) {
    return null;
  }
  if ((provider === "PUSH_ECR" || provider === "MINU_AGENT") && !register.cardTerminalId) {
    return null;
  }
  if (!LONG_RUNNING_CARD_PROVIDERS.has(provider) && !register.terminalBridgeUrl) {
    return null;
  }

  return provider;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderEbarimtQrMarkup = (value?: string | null) => {
  const qrValue = String(value || "").trim();
  if (typeof document === "undefined" || !qrValue) return "";

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(<QRCodeSVG value={qrValue} size={160} level="M" includeMargin />);
    });
    return container.innerHTML;
  } finally {
    root.unmount();
    container.remove();
  }
};

const printReceipt = (receipt: PosReceipt) => {
  if (typeof window === "undefined") return;

  const popup = window.open("", "_blank", "width=420,height=760");
  if (!popup) return;

  const content = escapeHtml(formatReceipt(receipt));
  const ebarimtQrData =
    receipt.ebarimt?.status === "SUCCESS" && receipt.ebarimt.qrData
      ? receipt.ebarimt.qrData
      : "";
  const qrMarkup = renderEbarimtQrMarkup(ebarimtQrData);
  popup.document.write(`
    <html>
      <head>
        <title>Receipt ${receipt.receiptNo}</title>
        <style>
          body { font-family: monospace; margin: 0; padding: 12px; color: #111; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; }
          .ebarimt-qr { margin-top: 10px; text-align: center; }
          .ebarimt-qr svg { width: 160px; height: 160px; }
          .ebarimt-qr-title { margin: 0 0 6px; font-family: sans-serif; font-size: 12px; font-weight: 700; }
          .ebarimt-qr-fallback { white-space: normal; word-break: break-all; font-family: monospace; font-size: 10px; }
        </style>
      </head>
      <body>
        <pre>${content}</pre>
        ${ebarimtQrData ? `<div class="ebarimt-qr"><p class="ebarimt-qr-title">eBarimt QR</p>${qrMarkup || `<p class="ebarimt-qr-fallback">${escapeHtml(ebarimtQrData)}</p>`}</div>` : ""}
        <script>
          window.onload = function () {
            window.print();
            setTimeout(function () { window.close(); }, 350);
          }
        </script>
      </body>
    </html>
  `);
  popup.document.close();
};

export default function PosDemoPage() {
  const router = useRouter();
  const {
    organizationId,
    posAccess,
    posAccessMessage,
    posEnabled,
    multiPriceEnabled,
  } = usePosAccess();
  const [scanBuffer, setScanBuffer] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "not-found">("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentEntries, setPaymentEntries] = useState<CheckoutPaymentEntry[]>([]);
  const [listMode, setListMode] = useState<PosListMode>("products");
  const [showProductLabelPrint, setShowProductLabelPrint] = useState(false);
  const [creditSales, setCreditSales] = useState<PosCreditListItem[]>([]);
  const [creditSalesLoading, setCreditSalesLoading] = useState(false);
  const [creditSalesError, setCreditSalesError] = useState("");
  const [creditBorrowers, setCreditBorrowers] = useState<PosCreditBorrower[]>([]);
  const [selectedCreditRepayment, setSelectedCreditRepayment] = useState<PosCreditListItem | null>(null);
  const [expandedCreditCustomerKey, setExpandedCreditCustomerKey] = useState<string | null>(null);
  const [creditRepaymentSubmitting, setCreditRepaymentSubmitting] = useState(false);
  const [loyalty, setLoyalty] = useState<CheckoutLoyaltyState>(initialLoyaltyState);
  const [loyaltyRedeemSession, setLoyaltyRedeemSession] =
    useState<CheckoutLoyaltyRedeemSession | null>(null);
  const [loyaltyRedeemLoading, setLoyaltyRedeemLoading] = useState(false);
  const [view, setView] = useState<PosView>("register");
  const [displayOpened, setDisplayOpened] = useState(false);
  const [customerDisplayTheme, setCustomerDisplayTheme] =
    useState<CustomerDisplayThemeId>("white");
  const [qpayModal, setQpayModal] = useState<QPayModalPayload | null>(null);
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [isCancellingCard, setIsCancellingCard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Бүгд");
  const [autoCheckoutActive, setAutoCheckoutActive] = useState(false);
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  const [checkingEbarimt, setCheckingEbarimt] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [selectedRestaurantTableId, setSelectedRestaurantTableId] = useState(RESTAURANT_TABLES[0]?.id ?? "A1");
  const [customerDisplaySuccess, setCustomerDisplaySuccess] = useState<CustomerDisplaySuccess | null>(null);
  const {
    registerConfig,
    setRegisterConfig,
    orgRegisters,
    showRegisterPicker,
    setShowRegisterPicker,
    showSetupPanel,
    setShowSetupPanel,
    setupTab,
    setSetupTab,
    setupName,
    setSetupName,
    setupBranches,
    setupBranchId,
    setSetupBranchId,
    setupRegistering,
    setupError,
    setSetupError,
    setupExistingId,
    setSetupExistingId,
    handleSelfRegister,
    handleConnectExisting,
    handleDisconnectRegister,
    selectRegister,
  } = usePosRegisterSetup({ organizationId, posEnabled });
  const effectiveEbarimtEnabled = EBARIMT_ENABLED && Boolean(registerConfig?.ebarimtEnabled);
  const ebarimtStatusText = !EBARIMT_ENABLED
    ? "eBarimt систем идэвхгүй байна."
    : registerConfig?.ebarimtEnabled
      ? "eBarimt идэвхтэй. Төлбөрийн дараа QR гарна."
      : "Энэ касс дээр eBarimt унтраалттай.";
  const [showPosSettings, setShowPosSettings] = useState(false);
  // Shift management
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [showShiftHistoryPanel, setShowShiftHistoryPanel] = useState(false);
  const [showCashDrawerPanel, setShowCashDrawerPanel] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [shiftCloseNote, setShiftCloseNote] = useState("");
  const [cashCounts, setCashCounts] = useState<Record<number, number>>({});
  const [drawerSummary, setDrawerSummary] = useState<CashDrawerSummary | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [drawerEventType, setDrawerEventType] = useState<CashDrawerEventType>("PAID_IN");
  const [drawerEventAmount, setDrawerEventAmount] = useState("");
  const [drawerEventNote, setDrawerEventNote] = useState("");
  const [drawerEventSubmitting, setDrawerEventSubmitting] = useState(false);
  const [pendingEbarimtSale, setPendingEbarimtSale] = useState<PendingEbarimtSale | null>(null);
  const [ebarimtBuyerMode, setEbarimtBuyerMode] = useState<"B2C" | "B2B">("B2C");
  const [ebarimtCompanyRegNo, setEbarimtCompanyRegNo] = useState("");
  const [ebarimtCompanyTin, setEbarimtCompanyTin] = useState("");
  const [ebarimtCompanyLookupLoading, setEbarimtCompanyLookupLoading] = useState(false);
  const [ebarimtBuyerSubmitting, setEbarimtBuyerSubmitting] = useState(false);
  const [ebarimtBuyerError, setEbarimtBuyerError] = useState("");

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const paymentSectionRef = useRef<HTMLElement>(null);
  const customerWindowRef = useRef<Window | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const keyBufferRef = useRef("");
  const lastKeyTsRef = useRef(0);
  const clientSaleIdRef = useRef<string | null>(null);
  const progressTickerRef = useRef<number | null>(null);
  const successOverlayTimerRef = useRef<number | null>(null);
  const customerDisplaySuccessTimerRef = useRef<number | null>(null);
  const cardPaymentRunRef = useRef<CardPaymentRun | null>(null);
  const ebarimtSendDataInFlightRef = useRef(false);

  const registerBranchId = posEnabled ? (registerConfig?.branchId ?? "") : "";
  const posProductsState = usePosProducts(registerBranchId);
  const ownProductsState = useOwnProducts(registerBranchId || !posEnabled ? "" : organizationId);
  const { products, loading, error } = registerBranchId ? posProductsState : ownProductsState;
  const reloadProducts = registerBranchId ? posProductsState.reload : ownProductsState.reload;
  const { state, totals, addProduct, dispatch } = usePosCart();
  const { loading: saleLoading, submitSale, lastReceipt, error: saleError } = useCreateSale();
  const { shift, loading: shiftLoading, load: loadShift, open: openShift, close: closeShiftFn } = useCurrentShift();
  const shiftRegisterMismatch = Boolean(
    shift?.registerId &&
      registerConfig?.id &&
      shift.registerId !== registerConfig.id,
  );
  const reloadCreditSales = useCallback(async () => {
    if (!organizationId) {
      setCreditSales([]);
      setExpandedCreditCustomerKey(null);
      return;
    }

    setCreditSalesLoading(true);
    setCreditSalesError("");
    try {
      const params = new URLSearchParams({ organizationId, limit: "100" });
      if (registerBranchId) params.set("branchId", registerBranchId);

      const res = await authFetch(`${API}/pos/credit-sales?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as Partial<PosCreditListResponse> & { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Зээлийн жагсаалт авахад алдаа гарлаа");
      }
      setCreditSales(Array.isArray(data.credits) ? data.credits : []);
      setExpandedCreditCustomerKey(null);
    } catch (error: any) {
      setCreditSalesError(error?.message || "Зээлийн жагсаалт авахад алдаа гарлаа");
    } finally {
      setCreditSalesLoading(false);
    }
  }, [organizationId, registerBranchId]);
  const reloadCreditBorrowers = useCallback(async () => {
    if (!organizationId) {
      setCreditBorrowers([]);
      return;
    }

    try {
      const params = new URLSearchParams({ organizationId, limit: "100" });
      const res = await authFetch(`${API}/pos/credit-customers?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as Partial<PosCreditBorrowerListResponse> & {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Зээлдэгчийн жагсаалт авахад алдаа гарлаа");
      }
      setCreditBorrowers(Array.isArray(data.customers) ? data.customers : []);
    } catch (error) {
      console.warn("Failed to load POS credit borrowers", error);
      setCreditBorrowers([]);
    }
  }, [organizationId]);
  const [receiptHistory, setReceiptHistory] = useState<PosReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState("");
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
  const [receiptHistoryError, setReceiptHistoryError] = useState("");
  const [receiptReloadToken, setReceiptReloadToken] = useState(0);
  const [shiftHistory, setShiftHistory] = useState<PosShiftHistoryItem[]>([]);
  const [shiftHistoryLoading, setShiftHistoryLoading] = useState(false);
  const [shiftHistoryError, setShiftHistoryError] = useState("");
  const [shiftHistoryReloadToken, setShiftHistoryReloadToken] = useState(0);
  const [shiftHistoryRange, setShiftHistoryRange] = useState<ShiftHistoryRangeId>("7");
  const [selectedShiftHistoryId, setSelectedShiftHistoryId] = useState("");
  const [shiftHistoryReceipts, setShiftHistoryReceipts] = useState<PosReceipt[]>([]);
  const [shiftHistoryReceiptsLoading, setShiftHistoryReceiptsLoading] = useState(false);
  const [shiftHistoryReceiptsError, setShiftHistoryReceiptsError] = useState("");
  const overlayOpen =
    view === "checkout" ||
    showShiftPanel ||
    showShiftHistoryPanel ||
    showCashDrawerPanel ||
    successOverlay.visible ||
    isCardProcessing ||
    Boolean(pendingEbarimtSale);

  useLockBodyScroll(overlayOpen);

  const selectedReceipt = useMemo(
    () => receiptHistory.find((receipt) => receipt.id === selectedReceiptId) || null,
    [receiptHistory, selectedReceiptId],
  );
  const selectedShiftHistory = useMemo(
    () => shiftHistory.find((item) => item.id === selectedShiftHistoryId) || null,
    [shiftHistory, selectedShiftHistoryId],
  );
  const selectedShiftHistoryRange = useMemo(
    () =>
      SHIFT_HISTORY_RANGE_OPTIONS.find((item) => item.id === shiftHistoryRange) ??
      SHIFT_HISTORY_RANGE_OPTIONS[0],
    [shiftHistoryRange],
  );
  const receiptForPreview = selectedReceipt || lastReceipt;
  const reloadReceiptHistory = useCallback(() => {
    setReceiptReloadToken((value) => value + 1);
  }, []);
  const reloadShiftHistory = useCallback(() => {
    setShiftHistoryReloadToken((value) => value + 1);
  }, []);
  const countedCashItems = useMemo(() => buildCashCount(cashCounts), [cashCounts]);
  const countedCashTotal = useMemo(() => sumCashCount(countedCashItems), [countedCashItems]);
  const closingCashPreview =
    countedCashItems.some((item) => item.count > 0)
      ? countedCashTotal
      : Number(closingCashInput) || 0;
  const expectedCashPreview = drawerSummary?.expectedCash ?? 0;
  const closingDifferencePreview = roundMoney(closingCashPreview - expectedCashPreview);

  const handleReceiptVoided = useCallback(
    (message: string) => {
      reloadProducts();
      reloadReceiptHistory();
      setScanStatus("success");
      setScanMessage(message);
    },
    [reloadProducts, reloadReceiptHistory],
  );

  useEffect(() => {
    if (!posEnabled) {
      setCreditSales([]);
      setCreditBorrowers([]);
      setExpandedCreditCustomerKey(null);
      return;
    }
    void reloadCreditSales();
    void reloadCreditBorrowers();
  }, [posEnabled, reloadCreditBorrowers, reloadCreditSales]);

  const clearProgressTicker = () => {
    if (progressTickerRef.current !== null) {
      window.clearInterval(progressTickerRef.current);
      progressTickerRef.current = null;
    }
  };

  const startProgressTicker = (baseText: string) => {
    clearProgressTicker();
    let tick = 0;
    setScanStatus("idle");
    setScanMessage(baseText);
    console.info(`[POS] ${baseText}`);

    progressTickerRef.current = window.setInterval(() => {
      tick += 1;
      const dots = ".".repeat((tick % 3) + 1);
      const text = `${baseText}${dots}`;
      setScanMessage(text);
      console.info(`[POS] ${text}`);
    }, 2000);
  };

  const handleCancelCardPayment = async () => {
    const activeRun = cardPaymentRunRef.current;
    if (!activeRun) {
      setIsCardProcessing(false);
      return;
    }

    activeRun.cancelled = true;
    activeRun.abortController.abort();
    setIsCancellingCard(true);
    try {
      if (activeRun.provider === "PUSH_ECR" && activeRun.terminalId) {
        await cancelPushEcr(activeRun.terminalId);
      }
    } catch {
      /* ignore — terminal will timeout on its own */
    } finally {
      setPaymentEntries((prev) => prev.filter((item) => item.id !== activeRun.pendingId));
      clearProgressTicker();
      setAutoCheckoutActive(false);
      setScanStatus("not-found");
      setScanMessage("Картын төлбөр цуцлагдлаа");
      setIsCardProcessing(false);
      setIsCancellingCard(false);
      if (cardPaymentRunRef.current === activeRun) {
        cardPaymentRunRef.current = null;
      }
    }
  };

  const showSuccessOverlay = (text: string) => {
    if (successOverlayTimerRef.current !== null) {
      window.clearTimeout(successOverlayTimerRef.current);
      successOverlayTimerRef.current = null;
    }
    if (customerDisplaySuccessTimerRef.current !== null) {
      window.clearTimeout(customerDisplaySuccessTimerRef.current);
      customerDisplaySuccessTimerRef.current = null;
    }
    setSuccessOverlay({ visible: true, text });
    setCustomerDisplaySuccess({
      text,
      amount: totals.grandTotal,
      ts: Date.now(),
    });
    console.info(`[POS] ${text}`);
    successOverlayTimerRef.current = window.setTimeout(() => {
      setSuccessOverlay({ visible: false, text: "" });
      successOverlayTimerRef.current = null;
    }, 1800);
    customerDisplaySuccessTimerRef.current = window.setTimeout(() => {
      setCustomerDisplaySuccess(null);
      customerDisplaySuccessTimerRef.current = null;
    }, 3500);
  };

  const startEbarimtSendDataSync = (source: string) => {
    if (ebarimtSendDataInFlightRef.current) {
      console.info(`[POS] eBarimt sendData already running; skipped ${source}`);
      return;
    }

    ebarimtSendDataInFlightRef.current = true;
    console.info(`[POS] eBarimt sendData started: ${source}`);

    void sendLocalEbarimtData(registerConfig)
      .then((info) => {
        const lastSentDate = info.lastSentDate || "-";
        console.info(`[POS] eBarimt sendData finished: ${source}; lastSentDate=${lastSentDate}`);
        setScanStatus("success");
        setScanMessage(`eBarimt SendData дууслаа. lastSentDate: ${lastSentDate}`);
      })
      .catch((error: any) => {
        const message = error?.message || "eBarimt SendData failed";
        console.warn(`[POS] eBarimt sendData failed: ${source}`, error);
        setScanStatus("not-found");
        setScanMessage(`eBarimt SendData алдаа: ${message}`);
      })
      .finally(() => {
        ebarimtSendDataInFlightRef.current = false;
      });
  };

  const checkEbarimtConnection = async () => {
    if (!registerConfig?.id) {
      setScanStatus("not-found");
      setScanMessage("Эхлээд POS кассаа register/салбартай холбоно уу.");
      return;
    }
    if (!EBARIMT_ENABLED) {
      setScanStatus("not-found");
      setScanMessage("NEXT_PUBLIC_EBARIMT_ENABLED=false байна. Production дээр true болгоно уу.");
      return;
    }
    if (!registerConfig.ebarimtEnabled) {
      setScanStatus("not-found");
      setScanMessage("Энэ POS register дээр eBarimt унтраалттай байна. Admin дээр асаана уу.");
      return;
    }

    setCheckingEbarimt(true);
    setScanStatus("idle");
    setScanMessage("eBarimt PosAPI /rest/info шалгаж байна...");
    try {
      const info = await getLocalEbarimtInfo(registerConfig);
      const merchants =
        info.merchants
          ?.map((merchant) => [merchant.name, merchant.tin].filter(Boolean).join(" / "))
          .filter(Boolean)
          .join(", ") || "-";
      setScanStatus("success");
      setScanMessage(
        `eBarimt OK. POS: ${info.posNo || registerConfig.ebarimtPosNo || "-"}, operatorTIN: ${info.operatorTIN || "-"}, merchants: ${merchants}`,
      );
    } catch (error: any) {
      setScanStatus("not-found");
      setScanMessage(error?.message || "eBarimt PosAPI шалгахад алдаа гарлаа");
    } finally {
      setCheckingEbarimt(false);
    }
  };

  // Fetch current open shift on load
  useEffect(() => {
    if (!posEnabled) return;
    if (!registerConfig?.id) return;
    const token = localStorage.getItem("vendor_token");
    if (!token) return;
    void loadShift();
  }, [posEnabled, registerConfig?.id, loadShift]);

  useEffect(() => {
    if (!shift?.id) {
      setReceiptHistory([]);
      setSelectedReceiptId("");
      setReceiptHistoryError("");
      setDrawerSummary(null);
      setDrawerError("");
      setCashCounts({});
      return;
    }

    const controller = new AbortController();
    setReceiptHistoryLoading(true);
    setReceiptHistoryError("");

    getReceipts(shift.id, controller.signal)
      .then((items) => {
        setReceiptHistory((previous) => {
          const previousById = new Map(previous.map((receipt) => [receipt.id, receipt]));
          return items.map((receipt) => {
            const previousReceipt = previousById.get(receipt.id);
            if (!receipt.ebarimt && previousReceipt?.ebarimt) {
              return { ...receipt, ebarimt: previousReceipt.ebarimt };
            }
            return receipt;
          });
        });
        setSelectedReceiptId((current) =>
          current && items.some((receipt) => receipt.id === current)
            ? current
            : items[0]?.id || "",
        );
      })
      .catch((error: any) => {
        if (error?.name === "AbortError") return;
        setReceiptHistoryError(error?.message || "Баримтын жагсаалт авахад алдаа гарлаа");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setReceiptHistoryLoading(false);
        }
      });

    return () => controller.abort();
  }, [shift?.id, receiptReloadToken]);

  useEffect(() => {
    if (!shift?.id) return;

    const controller = new AbortController();
    setDrawerLoading(true);
    setDrawerError("");

    getCashDrawerSummary(shift.id, controller.signal)
      .then((summary) => {
        setDrawerSummary(summary);
        if (summary.cashCount.length > 0) {
          setCashCounts(
            summary.cashCount.reduce<Record<number, number>>(
              (counts: Record<number, number>, item: CashDenominationCount) => {
                counts[item.denomination] = item.count;
                return counts;
              },
              {},
            ),
          );
        }
      })
      .catch((error: any) => {
        if (error?.name === "AbortError") return;
        setDrawerError(error?.message || "Кассын шургуулгын мэдээлэл авахад алдаа гарлаа");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDrawerLoading(false);
        }
      });

    return () => controller.abort();
  }, [shift?.id]);

  useEffect(() => {
    if (!registerBranchId) {
      setShiftHistory([]);
      setSelectedShiftHistoryId("");
      setShiftHistoryError("");
      return;
    }

    const controller = new AbortController();
    setShiftHistoryLoading(true);
    setShiftHistoryError("");
    const rangeParams = getShiftHistoryRangeParams(shiftHistoryRange);

    getShiftHistory(
      { branchId: registerBranchId, status: "CLOSED", ...rangeParams },
      controller.signal,
    )
      .then((data) => {
        const shifts: PosShiftHistoryItem[] = data.shifts ?? [];
        setShiftHistory(shifts);
        setSelectedShiftHistoryId((current) =>
          current && shifts.some((item) => item.id === current)
            ? current
            : shifts[0]?.id || "",
        );
      })
      .catch((error: any) => {
        if (error?.name === "AbortError") return;
        setShiftHistoryError(error?.message || "Хаалтын түүх авахад алдаа гарлаа");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setShiftHistoryLoading(false);
        }
      });

    return () => controller.abort();
  }, [registerBranchId, shiftHistoryRange, shiftHistoryReloadToken]);

  useEffect(() => {
    if (!selectedShiftHistoryId) {
      setShiftHistoryReceipts([]);
      setShiftHistoryReceiptsError("");
      return;
    }

    const controller = new AbortController();
    setShiftHistoryReceiptsLoading(true);
    setShiftHistoryReceiptsError("");

    getReceipts(selectedShiftHistoryId, controller.signal)
      .then((items) => setShiftHistoryReceipts(items))
      .catch((error: any) => {
        if (error?.name === "AbortError") return;
        setShiftHistoryReceiptsError(error?.message || "Хаалтын баримтууд авахад алдаа гарлаа");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setShiftHistoryReceiptsLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedShiftHistoryId]);

  const refreshCashDrawerSummary = useCallback(async () => {
    if (!shift?.id) return null;
    setDrawerLoading(true);
    setDrawerError("");
    try {
      const summary = await getCashDrawerSummary(shift.id);
      setDrawerSummary(summary);
      return summary;
    } catch (error: any) {
      setDrawerError(error?.message || "Кассын шургуулгын мэдээлэл авахад алдаа гарлаа");
      return null;
    } finally {
      setDrawerLoading(false);
    }
  }, [shift?.id]);

  const printPlainReport = (title: string, lines: string[]) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 12px; color: #111; }
            pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <pre>${escapeHtml(lines.join("\n"))}</pre>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 350);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const printCashDrawerReport = (summary = drawerSummary) => {
    if (!summary) return;
    const eventLines =
      summary.events.length === 0
        ? ["Шургуулгын хөдөлгөөн алга"]
        : summary.events.map((event: CashDrawerEvent) => {
            const label =
              event.type === "PAID_IN"
                ? "Орлого нэмсэн"
                : event.type === "PAID_OUT"
                  ? "Зарлага гаргасан"
                  : "Шургуулга нээсэн";
            return `${formatDateTime(event.createdAt)}  ${label}  ${formatMoney(event.amount)}${event.note ? `  ${event.note}` : ""}`;
          });
    const countLines =
      summary.cashCount.length === 0
        ? ["Тооллого: -"]
        : summary.cashCount
            .filter((item: CashDenominationCount) => item.count > 0)
            .map((item: CashDenominationCount) => `${formatMoney(item.denomination)} x ${item.count} = ${formatMoney(item.total)}`);

    printPlainReport("Кассын шургуулгын тайлан", [
      "КАССЫН ШУРГУУЛГЫН ТАЙЛАН",
      "--------------------------------",
      `Салбар: ${summary.shift.branchName || registerConfig?.branch.name || "-"}`,
      `Касс: ${summary.shift.registerName || registerConfig?.name || "-"}`,
      `Кассчин: ${summary.shift.cashierName}`,
      `Нээсэн: ${formatDateTime(summary.shift.openedAt)}`,
      `Хаасан: ${formatDateTime(summary.shift.closedAt)}`,
      "--------------------------------",
      `Эхлэх мөнгө: ${formatMoney(summary.openingCash)}`,
      `Бэлэн борлуулалт: ${formatMoney(summary.cashSales)}`,
      `Орлого нэмсэн: ${formatMoney(summary.paidIn)}`,
      `Зарлага гаргасан: ${formatMoney(summary.paidOut)}`,
      `Тооцоолсон бэлэн: ${formatMoney(summary.expectedCash)}`,
      `Тоолсон бэлэн: ${summary.countedCash === null ? "-" : formatMoney(summary.countedCash)}`,
      `Зөрүү: ${summary.cashDifference === null ? "-" : formatMoney(summary.cashDifference)}`,
      "--------------------------------",
      ...countLines,
      "--------------------------------",
      ...eventLines,
    ]);
  };

  const printNoSaleSlip = () => {
    printPlainReport("Кассын шургуулга нээх", [
      "КАССЫН ШУРГУУЛГА НЭЭХ",
      "--------------------------------",
      `Касс: ${registerConfig?.name || "-"}`,
      `Кассчин: ${shift?.cashierName || "-"}`,
      `Цаг: ${formatDateTime(new Date().toISOString())}`,
    ]);
  };

  const triggerCashDrawerKick = async () => {
    const bridgeUrl =
      typeof window !== "undefined"
        ? localStorage.getItem("mgl_cash_drawer_bridge_url")?.replace(/\/$/, "")
        : "";
    if (!bridgeUrl) {
      printNoSaleSlip();
      return;
    }
    try {
      await fetch(`${bridgeUrl}/drawer/open`, { method: "POST" });
    } catch {
      printNoSaleSlip();
    }
  };

  const handleCreateDrawerEvent = async (type: CashDrawerEventType = drawerEventType) => {
    if (!shift?.id) return;
    setDrawerEventSubmitting(true);
    setDrawerError("");
    try {
      const result = await createCashDrawerEvent({
        shiftId: shift.id,
        type,
        amount: type === "OPEN_DRAWER" ? 0 : Number(drawerEventAmount) || 0,
        note: type === "OPEN_DRAWER" ? drawerEventNote || "Борлуулалтгүй шургуулга нээсэн" : drawerEventNote,
      });
      setDrawerSummary(result.summary);
      setDrawerEventAmount("");
      setDrawerEventNote("");
      setScanStatus("success");
      setScanMessage(
        type === "PAID_IN"
          ? "Орлого бүртгэгдлээ"
          : type === "PAID_OUT"
            ? "Зарлага бүртгэгдлээ"
            : "Шургуулга нээсэн бүртгэл үүслээ",
      );
      if (type === "OPEN_DRAWER") {
        await triggerCashDrawerKick();
      }
    } catch (error: any) {
      setDrawerError(error?.message || "Кассын шургуулгын хөдөлгөөн бүртгэхэд алдаа гарлаа");
      setScanStatus("not-found");
      setScanMessage(error?.message || "Кассын шургуулгын хөдөлгөөн бүртгэхэд алдаа гарлаа");
    } finally {
      setDrawerEventSubmitting(false);
    }
  };

  useEffect(() => {
    if (!posEnabled) return;
    scannerInputRef.current?.focus();
  }, [posEnabled]);

  useEffect(() => {
    return () => {
      if (cardPaymentRunRef.current) {
        cardPaymentRunRef.current.cancelled = true;
        cardPaymentRunRef.current.abortController.abort();
        cardPaymentRunRef.current = null;
      }
      clearProgressTicker();
      if (successOverlayTimerRef.current !== null) {
        window.clearTimeout(successOverlayTimerRef.current);
      }
      if (customerDisplaySuccessTimerRef.current !== null) {
        window.clearTimeout(customerDisplaySuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!posEnabled) return;
    syncChannelRef.current = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    return () => {
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, [posEnabled]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(CUSTOMER_DISPLAY_THEME_STORAGE_KEY);
    if (isCustomerDisplayThemeId(savedTheme)) {
      setCustomerDisplayTheme(savedTheme);
    }
  }, []);

  const updateCustomerDisplayTheme = useCallback(
    (theme: CustomerDisplayThemeId) => {
      setCustomerDisplayTheme(theme);
      localStorage.setItem(CUSTOMER_DISPLAY_THEME_STORAGE_KEY, theme);
    },
    [],
  );

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.categoryName || "Бусад"));
    return ["Бүгд", ...Array.from(cats).sort()];
  }, [products]);

  const selectedRestaurantTable =
    RESTAURANT_TABLES.find((table) => table.id === selectedRestaurantTableId) ?? RESTAURANT_TABLES[0];

  const lowerSearch = searchInput.trim().toLowerCase();
  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory !== "Бүгд") {
      result = result.filter((item) => (item.categoryName || "Бусад") === selectedCategory);
    }
    if (!lowerSearch) return result;
    return result.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch) ||
        String(item.barcode || "").toLowerCase().includes(lowerSearch),
    );
  }, [products, lowerSearch, selectedCategory]);

  const filteredCreditGroups = useMemo(() => {
    const groups = new Map<string, PosCreditCustomerGroup>();

    creditSales.forEach((credit) => {
      const creditText = [
        credit.borrowerName,
        credit.borrowerPhone,
        credit.employeeName,
        credit.receiptNo,
        credit.borrowerId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchingLines = credit.lines.filter((line) => {
        if (!lowerSearch) return true;
        const lineText = [
          line.productName,
          line.productSku,
          line.productId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return creditText.includes(lowerSearch) || lineText.includes(lowerSearch);
      });

      if (matchingLines.length === 0) return;

      const groupKey =
        credit.customerId ||
        `${credit.targetType}:${credit.borrowerId}:${credit.employeeId || ""}:${credit.borrowerPhone || ""}`;
      const existing =
        groups.get(groupKey) ||
        {
          key: groupKey,
          borrowerName: credit.borrowerName,
          borrowerPhone: credit.borrowerPhone,
          employeeName: credit.employeeName,
          creditCount: 0,
          principalAmount: 0,
          totalInterest: 0,
          totalDue: 0,
          rows: [],
          creditIds: new Set<string>(),
        };

      if (!existing.creditIds.has(credit.id)) {
        existing.creditIds.add(credit.id);
        existing.creditCount += 1;
        existing.principalAmount = roundMoney(existing.principalAmount + credit.principalAmount);
        existing.totalInterest = roundMoney(existing.totalInterest + credit.totalInterest);
        existing.totalDue = roundMoney(existing.totalDue + credit.totalDue);
      }

      matchingLines.forEach((line) => {
        existing.rows.push({ credit, line });
      });
      groups.set(groupKey, existing);
    });

    return Array.from(groups.values()).sort((left, right) =>
      left.borrowerName.localeCompare(right.borrowerName, "mn"),
    );
  }, [creditSales, lowerSearch]);

  const filteredCreditRowCount = useMemo(
    () => filteredCreditGroups.reduce((sum, group) => sum + group.rows.length, 0),
    [filteredCreditGroups],
  );

  const confirmedPaid = useMemo(
    () =>
      roundMoney(
        paymentEntries
          .filter((item) => item.status === "confirmed")
          .reduce((sum, item) => sum + item.amount, 0),
      ),
    [paymentEntries],
  );

  const appliedLoyaltyRedeem = useMemo(() => {
    if (loyalty.mode !== "REDEEM" || !loyalty.found) return 0;
    if (
      loyaltyRedeemSession?.status !== "CONFIRMED" ||
      loyaltyRedeemSession.requestedPoints !== Math.floor(loyalty.redeemPoints || 0)
    ) {
      return 0;
    }
    return Math.max(0, Math.min(loyalty.balance, totals.grandTotal, Math.floor(loyalty.redeemPoints || 0)));
  }, [
    loyalty.balance,
    loyalty.found,
    loyalty.mode,
    loyalty.redeemPoints,
    loyaltyRedeemSession?.requestedPoints,
    loyaltyRedeemSession?.status,
    totals.grandTotal,
  ]);

  const payableTotal = useMemo(
    () => Math.max(0, roundMoney(totals.grandTotal - appliedLoyaltyRedeem)),
    [totals.grandTotal, appliedLoyaltyRedeem],
  );

  const remaining = useMemo(
    () => Math.max(0, roundMoney(payableTotal - confirmedPaid)),
    [payableTotal, confirmedPaid],
  );

  const hasPendingPayment = useMemo(
    () => paymentEntries.some((item) => item.status === "pending"),
    [paymentEntries],
  );

  const canFinalizeSale =
    state.cart.length > 0 &&
    (paymentEntries.length > 0 || payableTotal <= 0) &&
    remaining <= 0 &&
    !hasPendingPayment &&
    !isCardProcessing &&
    !creditRepaymentSubmitting &&
    (loyalty.mode === "NONE" ||
      (loyalty.found &&
        loyalty.phone.replace(/\D/g, "").length >= 6 &&
        (loyalty.mode !== "REDEEM" ||
          (loyaltyRedeemSession?.status === "CONFIRMED" &&
            loyaltyRedeemSession.requestedPoints === Math.floor(loyalty.redeemPoints || 0)))));

  const selectedByCode = useMemo(() => {
    if (!lastScannedCode) return null;
    const normalized = lastScannedCode.trim().toLowerCase();
    return (
      products.find((item) => productMatchesCode(item, normalized)) || null
    );
  }, [products, lastScannedCode]);

  const resetCreditRepaymentMode = () => {
    if (cardPaymentRunRef.current) {
      cardPaymentRunRef.current.cancelled = true;
      cardPaymentRunRef.current.abortController.abort();
      cardPaymentRunRef.current = null;
    }
    clearProgressTicker();
    setIsCardProcessing(false);
    setAutoCheckoutActive(false);
    setPaymentEntries([]);
    setQpayModal(null);
    setSelectedCreditRepayment(null);
    setPaymentMethod("CASH");
    setLoyalty(initialLoyaltyState);
    setLoyaltyRedeemSession(null);
    clientSaleIdRef.current = null;
  };

  const addRegisterProduct = (product: (typeof products)[number]) => {
    if (selectedCreditRepayment) {
      dispatch({ type: "clear-cart" });
      resetCreditRepaymentMode();
    }
    return addProduct(product);
  };

  const handleSelectCreditRepayment = (credit: PosCreditListItem) => {
    const repaymentLines = buildCreditRepaymentCartLines(credit);
    if (repaymentLines.length === 0) {
      setScanStatus("not-found");
      setScanMessage("Зээлийн барааны мэдээлэл хоосон байна.");
      return;
    }

    resetCreditRepaymentMode();
    dispatch({ type: "clear-cart" });
    repaymentLines.forEach((line) => {
      dispatch({ type: "add-line", payload: line });
    });
    setSelectedCreditRepayment(credit);
    setPaymentMethod("CASH");
    setView("register");
    setScanStatus("success");
    setScanMessage(`${credit.borrowerName} зээлийн төлөлт сонгогдлоо.`);
    paymentSectionRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const finalizeCreditRepayment = async () => {
    const credit = selectedCreditRepayment;
    if (!credit) return;

    const confirmedPayments = paymentEntries.filter((item) => item.status === "confirmed");
    if (confirmedPayments.length !== 1) {
      setScanStatus("not-found");
      setScanMessage("Зээлийн төлөлтийг нэг төлбөрөөр бүтэн баталгаажуулна уу.");
      return;
    }

    const payment = confirmedPayments[0];
    if (payment.method === "CREDIT") {
      setScanStatus("not-found");
      setScanMessage("Зээлийг дахин зээлээр төлөх боломжгүй.");
      return;
    }

    if (payment.method === "CASH" && !shift?.id) {
      setScanStatus("not-found");
      setScanMessage("Бэлэн төлөлт бүртгэхийн өмнө ээлжээ нээнэ үү.");
      setShowShiftPanel(true);
      return;
    }

    const paidAmount = roundMoney(payment.amount);
    const dueAmount = roundMoney(credit.totalDue);
    if (Math.abs(paidAmount - dueAmount) > 0.01) {
      setScanStatus("not-found");
      setScanMessage(`Зээлийн төлөх дүн ${formatMoney(dueAmount)} байна.`);
      return;
    }

    setCreditRepaymentSubmitting(true);
    try {
      const response = await authFetch(`${API}/pos/credit-sales/${encodeURIComponent(credit.id)}/pay`, {
        method: "POST",
        body: JSON.stringify({
          amount: paidAmount,
          paymentMethod: payment.method,
          qpayInvoiceId: payment.invoiceId,
          cardAttemptId: payment.attemptId,
          shiftId: shift?.id,
          note: `POS credit repayment ${credit.receiptNo}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const paymentBreakdown: SalePaymentLine[] = [
        {
          method: payment.method,
          amount: paidAmount,
          attemptId: payment.attemptId,
          transactionId: payment.transactionId,
          invoiceId: payment.invoiceId,
        },
      ];
      let repaymentReceipt = buildCreditRepaymentEbarimtReceipt({
        credit,
        payment: paymentBreakdown[0]!,
        branchName: registerConfig?.branch.name || credit.receiptNo,
        cashierName: shift?.cashierName || "POS",
      });
      let repaymentMessage = `${credit.borrowerName} зээлийн төлөлт амжилттай бүртгэгдлээ.`;

      if (response.ok && effectiveEbarimtEnabled) {
        try {
          setScanStatus("idle");
          setScanMessage("Зээлийн төлөлтийн eBarimt баримт үүсгэж байна...");
          const ebarimtPayload = await issueLocalEbarimtReceipt(
            repaymentReceipt,
            paymentBreakdown,
            registerConfig,
          );
          repaymentReceipt = { ...repaymentReceipt, ebarimt: mapEbarimtPayload(ebarimtPayload) };
          try {
            const saved = await attachEbarimtReceipt(credit.saleId, ebarimtPayload);
            repaymentReceipt = { ...repaymentReceipt, ebarimt: saved.ebarimt || repaymentReceipt.ebarimt };
          } catch (saveError) {
            console.warn("Credit repayment eBarimt created locally but failed to attach to sale", saveError);
          }
          startEbarimtSendDataSync(`credit repayment ${credit.receiptNo}`);
          repaymentMessage = `${credit.borrowerName} зээлийн төлөлт болон eBarimt амжилттай.`;
        } catch (ebarimtError: any) {
          const errorMessage = ebarimtError?.message || "eBarimt баримт үүсгэхэд алдаа гарлаа";
          repaymentReceipt = {
            ...repaymentReceipt,
            ebarimt: {
              status: "FAILED",
              error: errorMessage,
              syncedAt: new Date().toISOString(),
            },
          };
          repaymentMessage = `${credit.borrowerName} зээлийн төлөлт амжилттай. eBarimt: ${errorMessage}`;
          await attachEbarimtReceipt(credit.saleId, {
            status: "FAILED",
            error: errorMessage,
          }).catch(() => {});
        }
      }
      if (!response.ok) {
        throw new Error(data?.message || "Зээлийн төлөлт бүртгэхэд алдаа гарлаа");
      }

      dispatch({ type: "clear-cart" });
      resetCreditRepaymentMode();
      setListMode("credits");
      setScanStatus("success");
      setScanMessage(`${credit.borrowerName} зээлийн төлөлт амжилттай бүртгэгдлээ.`);
      showSuccessOverlay("Зээлийн төлөлт амжилттай");
      setScanMessage(repaymentMessage);
      setReceiptHistory((items) => [repaymentReceipt, ...items.filter((item) => item.id !== repaymentReceipt.id)]);
      setSelectedReceiptId(repaymentReceipt.id);
      void reloadCreditSales();
      void refreshCashDrawerSummary();
      printReceipt(repaymentReceipt);
    } catch (error: any) {
      setScanStatus("not-found");
      setScanMessage(error?.message || "Зээлийн төлөлт бүртгэхэд алдаа гарлаа");
    } finally {
      setCreditRepaymentSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedCreditRepayment) return;
    if (!state.cart.some((line) => line.productId.startsWith("credit:"))) return;
    dispatch({ type: "clear-cart" });
  }, [selectedCreditRepayment, state.cart, dispatch]);

  const processScan = (code: string) => {
    const normalized = code.trim();
    if (!normalized) return;

    setLastScannedCode(normalized);

    const found = products.find((item) => productMatchesCode(item, normalized));

    if (!found) {
      setSearchInput(normalized);
      setScanMessage(`Код олдсонгүй: ${normalized}`);
      setScanStatus("not-found");
      return;
    }

    const result = addRegisterProduct(found);
    if (!result.ok) {
      setScanMessage(`Нөөц хүрэлцэхгүй: ${found.name}`);
      setScanStatus("not-found");
      return;
    }

    setSearchInput("");
    setScanBuffer("");
    setScanMessage(`Амжилттай сагсанд нэмэгдлээ: ${found.name}`);
    setScanStatus("success");
    scannerInputRef.current?.focus();
    paymentSectionRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  useEffect(() => {
    if (!posEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isTypingField) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Shift") return;

      const now = Date.now();
      const diff = now - lastKeyTsRef.current;
      lastKeyTsRef.current = now;

      if (diff > SCAN_GAP_MS) {
        keyBufferRef.current = "";
      }

      if (event.key === "Enter") {
        if (keyBufferRef.current.length > 0) {
          processScan(keyBufferRef.current);
          keyBufferRef.current = "";
          setScanBuffer("");
        }
        return;
      }

      if (event.key.length === 1) {
        keyBufferRef.current += event.key;
        setScanBuffer(keyBufferRef.current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [posEnabled, products]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(scanBuffer);
    setScanBuffer("");
  };

  const completePaidSale = (finalReceipt: PosReceipt, finalMessage: string, isCreditSale: boolean) => {
    setPendingEbarimtSale(null);
    setQpayModal(null);
    setPaymentEntries([]);
    setLoyalty(initialLoyaltyState);
    setLoyaltyRedeemSession(null);
    setAutoCheckoutActive(false);
    clientSaleIdRef.current = null;
    dispatch({ type: "clear-cart" });
    setView("register");
    setScanStatus("success");
    setScanMessage(finalMessage);
    showSuccessOverlay("Төлбөр амжилттай");

    setReceiptHistory((items) => [finalReceipt, ...items.filter((item) => item.id !== finalReceipt.id)]);
    setSelectedReceiptId(finalReceipt.id);
    reloadProducts();
    reloadReceiptHistory();
    void reloadCreditSales();
    if (isCreditSale) {
      void reloadCreditBorrowers();
    }
    void refreshCashDrawerSummary();
    printReceipt(finalReceipt);
  };

  const resetEbarimtBuyerDialog = () => {
    setEbarimtBuyerMode("B2C");
    setEbarimtCompanyRegNo("");
    setEbarimtCompanyTin("");
    setEbarimtBuyerError("");
    setEbarimtCompanyLookupLoading(false);
    setEbarimtBuyerSubmitting(false);
  };

  const normalizeEbarimtTin = (value: string) => value.replace(/\D/g, "").slice(0, 14);
  const isValidEbarimtTin = (value: string) => /^\d{11,14}$/.test(normalizeEbarimtTin(value));

  const lookupCompanyTinForEbarimt = async () => {
    const regNo = ebarimtCompanyRegNo.replace(/\D/g, "");
    if (!/^\d{7}$/.test(regNo)) {
      throw new Error("Байгууллагын регистр 7 оронтой байх ёстой");
    }

    setEbarimtCompanyLookupLoading(true);
    setEbarimtBuyerError("");
    try {
      const result = await lookupEbarimtTin(regNo, registerConfig);
      setEbarimtCompanyRegNo(result.regNo);
      setEbarimtCompanyTin(result.tin);
      return result;
    } finally {
      setEbarimtCompanyLookupLoading(false);
    }
  };

  const submitPendingEbarimtSale = async (mode: "B2C" | "B2B" = ebarimtBuyerMode) => {
    const pending = pendingEbarimtSale;
    if (!pending) return;

    setEbarimtBuyerSubmitting(true);
    setEbarimtBuyerError("");

    let finalReceipt = pending.receipt;
    let ebarimtAttempted = false;
    try {
      let buyer: EbarimtBuyer = { type: "B2C" };
      if (mode === "B2B") {
        const normalizedRegNo = ebarimtCompanyRegNo.replace(/\D/g, "");
        const tin = normalizeEbarimtTin(ebarimtCompanyTin);
        if (!isValidEbarimtTin(tin)) {
          throw new Error("B2B eBarimt үүсгэхийн тулд 11-14 оронтой TIN оруулна уу.");
        }
        buyer = { type: "B2B", tin, regNo: normalizedRegNo || undefined };
      }

      setScanStatus("idle");
      setScanMessage(mode === "B2B" ? "Байгууллагын eBarimt баримт үүсгэж байна..." : "Хувь хүний eBarimt баримт үүсгэж байна...");
      ebarimtAttempted = true;
      const ebarimtPayload = await issueLocalEbarimtReceipt(
        pending.receipt,
        pending.paymentBreakdown,
        registerConfig,
        buyer,
      );
      finalReceipt = { ...pending.receipt, ebarimt: mapEbarimtPayload(ebarimtPayload) };
      try {
        const saved = await attachEbarimtReceipt(pending.receipt.id, ebarimtPayload);
        finalReceipt = { ...pending.receipt, ebarimt: saved.ebarimt || finalReceipt.ebarimt };
      } catch (saveError) {
        console.warn("eBarimt receipt created locally but failed to attach to sale", saveError);
      }
      startEbarimtSendDataSync(`sale ${pending.receipt.receiptNo}`);
      const label = mode === "B2B" ? "байгууллагын eBarimt" : "хувь хүний eBarimt";
      completePaidSale(finalReceipt, `Төлбөр болон ${label} баримт амжилттай.${pending.loyaltyMessage}`, pending.isCreditSale);
      resetEbarimtBuyerDialog();
    } catch (ebarimtError: any) {
      const errorMessage = ebarimtError?.message || "eBarimt баримт үүсгэхэд алдаа гарлаа";
      setEbarimtBuyerError(errorMessage);
      finalReceipt = {
        ...pending.receipt,
        ebarimt: {
          status: "FAILED",
          error: errorMessage,
          syncedAt: new Date().toISOString(),
        },
      };
      if (ebarimtAttempted) {
        await attachEbarimtReceipt(pending.receipt.id, {
          status: "FAILED",
          error: errorMessage,
        }).catch(() => {});
      }
    } finally {
      setEbarimtBuyerSubmitting(false);
    }
  };

  const skipPendingEbarimtSale = () => {
    const pending = pendingEbarimtSale;
    if (!pending) return;
    completePaidSale(pending.receipt, `Төлбөр амжилттай.${pending.loyaltyMessage} eBarimt үүсгээгүй.`, pending.isCreditSale);
    resetEbarimtBuyerDialog();
  };

  const handleCreateDemoSale = async () => {
    if (state.cart.length === 0) return;

    if (selectedCreditRepayment) {
      await finalizeCreditRepayment();
      return;
    }
    if (!shift?.id) {
      setScanStatus("not-found");
      setScanMessage("Борлуулалт бүртгэхийн өмнө кассын ээлжээ нээнэ үү.");
      setShowShiftPanel(true);
      return;
    }
    if (shiftRegisterMismatch) {
      setScanStatus("not-found");
      setScanMessage(
        `Нээлттэй ээлж ${shift.registerName || "өөр касс"} дээр байна. Тэр касс руу шилжинэ үү.`,
      );
      return;
    }

    const confirmedPayments = paymentEntries.filter((item) => item.status === "confirmed");

    if (!canFinalizeSale) {
      setScanStatus("not-found");
      setScanMessage("Split payment гүйцээгүй байна. Үлдэгдэл төлбөрөө дуусгана уу.");
      return;
    }

    const confirmedTotal = roundMoney(
      confirmedPayments.reduce((sum, item) => sum + item.amount, 0),
    );
    const saleRemaining = Math.max(0, roundMoney(payableTotal - confirmedTotal));

    if (saleRemaining > 0) {
      setScanStatus("not-found");
      setScanMessage("Split payment Ð³Ò¯Ð¹Ñ†ÑÑÐ³Ò¯Ð¹ Ð±Ð°Ð¹Ð½Ð°. Ò®Ð»Ð´ÑÐ³Ð´ÑÐ» Ñ‚Ó©Ð»Ð±Ó©Ñ€Ó©Ó© Ð´ÑƒÑƒÑÐ³Ð°Ð½Ð° ÑƒÑƒ.");
      setScanMessage("Төлбөр бүрэн бүртгэгдээгүй байна. Үлдэгдэл төлбөрөө дуусгана уу.");
      return;
    }

    const paymentBreakdown: SalePaymentLine[] = confirmedPayments.map((item) => ({
      method: item.method,
      amount: item.amount,
      attemptId: item.attemptId,
      transactionId: item.transactionId,
      invoiceId: item.invoiceId,
      credit: item.credit,
    }));
    const isCreditSale = paymentBreakdown.some((item) => item.method === "CREDIT");
    const finalMethod = paymentBreakdown.length === 1 ? paymentBreakdown[0].method : "MIXED";
    const branchIdForSale = registerConfig?.branchId || "";

    if (!branchIdForSale) {
      setScanStatus("not-found");
      setScanMessage("POS кассын салбар сонгогдоогүй байна. Бэлэн төлбөр дээр ч register/салбар шаардлагатай.");
      setShowSetupPanel(true);
      return;
    }

    if (!clientSaleIdRef.current) {
      clientSaleIdRef.current = `sale-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }


    try {
      const receipt = await submitSale({
        shiftId: shift?.id ?? "",
        branchId: branchIdForSale,
        registerId: registerConfig?.id,
        organizationId,
        clientSaleId: clientSaleIdRef.current,
        paymentMethod: finalMethod,
        paymentBreakdown,
        loyalty:
          loyalty.mode === "NONE"
            ? { mode: "NONE" }
            : {
                mode: loyalty.mode,
                phone: loyalty.phone,
                redeemPoints: loyalty.mode === "REDEEM" ? appliedLoyaltyRedeem : 0,
                redeemSessionId: loyalty.mode === "REDEEM" ? loyaltyRedeemSession?.id : undefined,
              },
        totalPaid: confirmedTotal,
        remaining: saleRemaining,
        status: "PAID",
        lines: state.cart.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          priceType: line.priceType || "UNIT",
          discountAmount: line.discountAmount,
          taxType: line.taxType,
          taxRate: line.taxRate,
          cityTaxRate: line.cityTaxRate,
          classificationCode: line.classificationCode,
          taxProductCode: line.taxProductCode,
          measureUnit: line.measureUnit,
        })),
        note: "POS checkout",
      });

      let finalReceipt = receipt;
      let finalMessage = "Төлбөр амжилттай";
      const loyaltyMessage =
        receipt.loyalty && (receipt.loyalty.earnedPoints > 0 || receipt.loyalty.redeemedPoints > 0)
          ? receipt.loyalty.redeemedPoints > 0
            ? ` M Point -${receipt.loyalty.redeemedPoints.toLocaleString("mn-MN")} хасагдаж, +${receipt.loyalty.earnedPoints.toLocaleString("mn-MN")} орлоо.`
            : ` M Point +${receipt.loyalty.earnedPoints.toLocaleString("mn-MN")} орлоо.`
          : "";

      if (effectiveEbarimtEnabled && !isCreditSale) {
        setAutoCheckoutActive(false);
        setPendingEbarimtSale({
          receipt,
          paymentBreakdown,
          loyaltyMessage,
          isCreditSale,
        });
        setEbarimtBuyerMode("B2C");
        setEbarimtCompanyRegNo("");
        setEbarimtCompanyTin("");
        setEbarimtBuyerError("");
        setView("register");
        setScanStatus("success");
        setScanMessage(`Төлбөр амжилттай.${loyaltyMessage} eBarimt баримтын төрлөө сонгоно уу.`);
        showSuccessOverlay("Төлбөр амжилттай");
        return;
      }

      if (effectiveEbarimtEnabled && !isCreditSale) {
        try {
          setScanStatus("idle");
          setScanMessage("eBarimt баримт үүсгэж байна...");
          const ebarimtPayload = await issueLocalEbarimtReceipt(receipt, paymentBreakdown, registerConfig);
          finalReceipt = { ...receipt, ebarimt: mapEbarimtPayload(ebarimtPayload) };
          try {
            const saved = await attachEbarimtReceipt(receipt.id, ebarimtPayload);
            finalReceipt = { ...receipt, ebarimt: saved.ebarimt || finalReceipt.ebarimt };
          } catch (saveError) {
            console.warn("eBarimt receipt created locally but failed to attach to sale", saveError);
          }
          startEbarimtSendDataSync(`sale ${receipt.receiptNo}`);
          finalMessage = `Төлбөр болон eBarimt баримт амжилттай.${loyaltyMessage}`;
        } catch (ebarimtError: any) {
          const errorMessage = ebarimtError?.message || "eBarimt баримт үүсгэхэд алдаа гарлаа";
          finalReceipt = {
            ...receipt,
            ebarimt: {
              status: "FAILED",
              error: errorMessage,
              syncedAt: new Date().toISOString(),
            },
          };
          finalMessage = `Төлбөр амжилттай.${loyaltyMessage} eBarimt: ${errorMessage}`;
          await attachEbarimtReceipt(receipt.id, {
            status: "FAILED",
            error: errorMessage,
          }).catch(() => {});
        }
      } else {
        finalMessage = `Төлбөр амжилттай.${loyaltyMessage}`;
      }

      setQpayModal(null);
      setPaymentEntries([]);
      setLoyalty(initialLoyaltyState);
      setLoyaltyRedeemSession(null);
      setAutoCheckoutActive(false);
      clientSaleIdRef.current = null;
      dispatch({ type: "clear-cart" });
      setView("register");
      setScanStatus("success");
      setScanMessage(finalMessage);
      showSuccessOverlay("Төлбөр амжилттай");

      setReceiptHistory((items) => [finalReceipt, ...items.filter((item) => item.id !== finalReceipt.id)]);
      setSelectedReceiptId(finalReceipt.id);
      reloadProducts();
      reloadReceiptHistory();
      void reloadCreditSales();
      if (isCreditSale) {
        void reloadCreditBorrowers();
      }
      void refreshCashDrawerSummary();
      printReceipt(finalReceipt);
    } catch (e: any) {
      const message = e?.message || "Гүйлгээ батлах үед алдаа гарлаа.";
      // Keep cart intact so cashier can adjust qty and retry when stock changed elsewhere.
      setScanStatus("not-found");
      setScanMessage(message.includes("нөөц")
        ? `${message} Тоо ширхэгээ бууруулаад дахин оролдоно уу.`
        : message);
    }
  };

  const addPaymentEntry = async (method: PaymentMethod, amount: number, credit?: SaleCreditPaymentMeta) => {
    if (selectedCreditRepayment && method === "CREDIT") {
      setScanStatus("not-found");
      setScanMessage("Зээлийн төлөлтийг дахин зээлээр хийх боломжгүй.");
      return;
    }

    const safeAmount = roundMoney(Math.max(0, Math.min(amount, remaining)));
    if (safeAmount <= 0) return;

    if (method === "CARD") {
      const pendingId = `CARD-${Date.now()}`;
      const cardRun: CardPaymentRun = {
        pendingId,
        abortController: new AbortController(),
        cancelled: false,
      };
      cardPaymentRunRef.current = cardRun;
      setPaymentEntries((prev) => [
        ...prev,
        {
          id: pendingId,
          method,
          amount: safeAmount,
          status: "pending",
        },
      ]);

      setIsCardProcessing(true);
      startProgressTicker("Карт уншуулна уу");
      const isCardRunCancelled = () => cardRun.cancelled || cardPaymentRunRef.current !== cardRun;

      try {
        const freshRegisterConfig = registerConfig?.id
          ? await fetchRegisterConfig(registerConfig.id)
          : registerConfig;

        if (isCardRunCancelled()) return;

        if (!freshRegisterConfig) {
          throw new Error("POS register тохиргоо олдсонгүй");
        }

        setRegisterConfig(freshRegisterConfig);

        const effectiveCardProvider = validateCardRegisterConfig(freshRegisterConfig);
        const terminalId = freshRegisterConfig.cardTerminalId ?? "terminal-1";
        cardRun.provider = effectiveCardProvider;
        cardRun.terminalId = terminalId;

        const useClientBridge =
          effectiveCardProvider === "ANDROID_PGW" &&
          Boolean(freshRegisterConfig.terminalBridgeUrl);
        const shouldSendBridgeUrl =
          Boolean(freshRegisterConfig.terminalBridgeUrl) &&
          effectiveCardProvider !== "MINU_AGENT" &&
          effectiveCardProvider !== "PUSH_ECR";

        const attempt = await createCardAttempt({
          amount: safeAmount,
          terminalId,
          bridgeUrl: shouldSendBridgeUrl ? freshRegisterConfig.terminalBridgeUrl! : undefined,
          registerId: freshRegisterConfig.id,
          organizationId,
          clientBridge: useClientBridge,
        });

        if (isCardRunCancelled()) return;

        let approvedAttempt = attempt;
        if (useClientBridge) {
          try {
            const bridgeResult = await chargeClientBridge({
              bridgeUrl: freshRegisterConfig.terminalBridgeUrl!,
              attemptId: attempt.attemptId,
              amount: safeAmount,
              terminalId,
              signal: cardRun.abortController.signal,
            });
            if (isCardRunCancelled()) return;
            approvedAttempt = await submitClientBridgeResult({
              attemptId: attempt.attemptId,
              result: bridgeResult,
            });
          } catch (bridgeError: any) {
            if (isCardRunCancelled()) return;
            const message = bridgeError?.message || "Картын терминалын холболтын алдаа гарлаа";
            approvedAttempt = await submitClientBridgeResult({
              attemptId: attempt.attemptId,
              result: { status: "FAILED", message },
            }).catch(() => ({
              ...attempt,
              status: "FAILED" as const,
              message,
            }));
          }
        } else {
          const isLongRunningTerminal = terminalNeedsWaitingOverlay(effectiveCardProvider);
          const maxPolls = isLongRunningTerminal ? 150 : 8; // 150x800ms=120s for terminal-side card flows
          for (let i = 0; i < maxPolls; i += 1) {
            if (isCardRunCancelled()) return;
            if (approvedAttempt.status === "APPROVED") break;
            if (approvedAttempt.status === "DECLINED" || approvedAttempt.status === "FAILED") break;
            await new Promise((resolve) => setTimeout(resolve, 800));
            if (isCardRunCancelled()) return;
            approvedAttempt = await getCardAttemptStatus(attempt.attemptId);
          }
        }

        if (isCardRunCancelled()) return;

        if (approvedAttempt.status !== "APPROVED") {
          clearProgressTicker();
          setPaymentEntries((prev) => prev.filter((item) => item.id !== pendingId));
          setAutoCheckoutActive(false);
          setScanStatus("not-found");
          setScanMessage(
            approvedAttempt.message ||
              (approvedAttempt.status === "PENDING"
                ? "Терминалын төлбөр баталгаажаагүй байна. Дахин оролдоно уу."
                : "Картын төлбөр цуцлагдлаа"),
          );
          return;
        }

        setPaymentEntries((prev) =>
          prev.map((item) =>
            item.id === pendingId
              ? {
                  ...item,
                  status: "confirmed",
                  attemptId: approvedAttempt.attemptId,
                  transactionId: approvedAttempt.transactionId,
                }
              : item,
          ),
        );
        setAutoCheckoutActive(true);
        clearProgressTicker();
        setScanStatus("success");
        setScanMessage("Картын төлбөр амжилттай баталгаажлаа");
        showSuccessOverlay("Карт төлбөр амжилттай");
      } catch (error: any) {
        if (isCardRunCancelled()) return;
        clearProgressTicker();
        setPaymentEntries((prev) => prev.filter((item) => item.id !== pendingId));
        setAutoCheckoutActive(false);
        setScanStatus("not-found");
        setScanMessage(error?.message || "Картын терминалын холболтын алдаа гарлаа");
      } finally {
        if (cardPaymentRunRef.current === cardRun) {
          cardPaymentRunRef.current = null;
          setIsCardProcessing(false);
        }
      }

      return;
    }

    setPaymentEntries((prev) => [
      ...prev,
      {
        id: `${method}-${Date.now()}`,
        method,
        amount: safeAmount,
        status: "confirmed",
        credit,
      },
    ]);
  };

  const requestQPay = async (amount: number) => {
    const safeAmount = roundMoney(Math.max(0, Math.min(amount, remaining)));
    if (safeAmount <= 0) return;

    try {
      startProgressTicker("QPay төлбөр хүлээж байна");
      const invoice = await createQPayInvoice({
        amount: safeAmount,
        registerId: registerConfig?.id,
        organizationId,
      });
      const modalPayload: QPayModalPayload = {
        open: true,
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        qrText: invoice.qrText,
        qrImage: invoice.qrImage,
        expiresAt: invoice.expiresAt,
      };

      setQpayModal(modalPayload);
      setPaymentEntries((prev) => [
        ...prev,
        {
          id: invoice.invoiceId,
          method: "QR",
          amount: invoice.amount,
          status: "pending",
          invoiceId: invoice.invoiceId,
        },
      ]);
      setScanStatus("idle");
      setScanMessage("QPay invoice үүслээ. Баталгаажилт хүлээж байна");
    } catch (error) {
      console.warn("QPay invoice create failed", error);
      clearProgressTicker();
      setAutoCheckoutActive(false);
      setScanStatus("not-found");
      setScanMessage(error instanceof Error ? error.message : "QPay invoice үүсгэхэд алдаа гарлаа");
    }
  };

  const markQPayPaid = (id: string) => {
    void (async () => {
      try {
        const invoice = await confirmQPayInvoice(id);
        if (invoice.status !== "PAID") return;

        setPaymentEntries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "confirmed", invoiceId: invoice.invoiceId } : item,
          ),
        );
        setAutoCheckoutActive(true);

        if (qpayModal?.invoiceId === id) {
          setQpayModal(null);
        }

        clearProgressTicker();
        setScanStatus("success");
        setScanMessage("QPay төлбөр баталгаажлаа");
        showSuccessOverlay("QPay төлбөр амжилттай");
      } catch {
        setScanStatus("not-found");
        setScanMessage("QPay баталгаажуулахад алдаа гарлаа");
      }
    })();
  };

  const removePaymentEntry = (id: string) => {
    const target = paymentEntries.find((item) => item.id === id);
    setPaymentEntries((prev) => prev.filter((item) => item.id !== id));
    if (target?.invoiceId && qpayModal?.invoiceId === target.invoiceId) {
      setQpayModal(null);
    }
  };

  const resetPaymentEntries = () => {
    if (cardPaymentRunRef.current) {
      cardPaymentRunRef.current.cancelled = true;
      cardPaymentRunRef.current.abortController.abort();
      cardPaymentRunRef.current = null;
    }
    setIsCardProcessing(false);
    setAutoCheckoutActive(false);
    setPaymentEntries([]);
    setQpayModal(null);
    setLoyaltyRedeemSession(null);
    setCustomerDisplaySuccess(null);
    clientSaleIdRef.current = null;
  };

  const lookupLoyalty = async () => {
    const phone = loyalty.phone.replace(/\D/g, "");
    if (phone.length < 6) {
      setLoyaltyRedeemSession(null);
      setLoyalty((prev) => ({ ...prev, lookupError: "Утасны дугаар оруулна уу." }));
      return;
    }

    setLoyaltyRedeemSession(null);
    setLoyalty((prev) => ({ ...prev, lookupLoading: true, lookupError: "" }));
    try {
      const response = await authFetch(`${API}/pos/loyalty/lookup?phone=${encodeURIComponent(phone)}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "M Point мэдээлэл авахад алдаа гарлаа");
      }
      setLoyalty((prev) => ({
        ...prev,
        found: Boolean(data.found),
        customerName: data.customerName ?? null,
        balance: Number(data.balance || 0),
        earnRate: Number(data.earnRate || 0.01),
        membershipBadge: data.membershipBadge || "NONE",
        lookupError: data.found ? "" : "Энэ дугаартай M Point хэрэглэгч олдсонгүй.",
        redeemPoints: Math.min(prev.redeemPoints, Number(data.balance || 0), totals.grandTotal),
      }));
    } catch (error: any) {
      setLoyalty((prev) => ({
        ...prev,
        found: false,
        lookupError: error?.message || "M Point мэдээлэл авахад алдаа гарлаа",
      }));
    } finally {
      setLoyalty((prev) => ({ ...prev, lookupLoading: false }));
    }
  };

  const requestLoyaltyRedeemQr = async (redeemPoints: number) => {
    const phone = loyalty.phone.replace(/\D/g, "");
    const safePoints = Math.max(0, Math.min(loyalty.balance, totals.grandTotal, Math.floor(Number(redeemPoints) || 0)));
    const branchId = registerConfig?.branchId || shift?.branchId || "";

    if (!loyalty.found || phone.length < 6) {
      setScanStatus("not-found");
      setScanMessage("Эхлээд M Point хэрэглэгчээ утсаар шалгана уу.");
      return;
    }
    if (!branchId) {
      setScanStatus("not-found");
      setScanMessage("M Point QR үүсгэхийн тулд POS салбар шаардлагатай.");
      return;
    }
    if (safePoints <= 0) {
      setScanStatus("not-found");
      setScanMessage("Хасуулах M Point дүнгээ оруулна уу.");
      return;
    }

    setLoyaltyRedeemLoading(true);
    try {
      const session = await createLoyaltyRedeemSession({
        phone,
        redeemPoints: safePoints,
        saleTotal: totals.grandTotal,
        branchId,
        registerId: registerConfig?.id,
        organizationId,
      });
      setLoyaltyRedeemSession(session);
      setLoyalty((prev) => ({ ...prev, mode: "REDEEM", redeemPoints: safePoints }));
      setScanStatus("idle");
      setScanMessage("M Point QR үүслээ. Хэрэглэгч MGL app-аар баталгаажуулна.");
    } catch (error: any) {
      setLoyaltyRedeemSession(null);
      setScanStatus("not-found");
      setScanMessage(error?.message || "M Point QR үүсгэхэд алдаа гарлаа");
    } finally {
      setLoyaltyRedeemLoading(false);
    }
  };

  const refreshLoyaltyRedeemSession = async () => {
    if (!loyaltyRedeemSession?.id) return;

    setLoyaltyRedeemLoading(true);
    try {
      const session = await getLoyaltyRedeemSessionStatus(loyaltyRedeemSession.id);
      setLoyaltyRedeemSession(session);
      if (session.status === "CONFIRMED") {
        setScanStatus("success");
        setScanMessage(`M Point ${session.requestedPoints.toLocaleString("mn-MN")} баталгаажлаа.`);
      } else if (session.status === "EXPIRED") {
        setScanStatus("not-found");
        setScanMessage("M Point QR хугацаа дууссан. Дахин QR үүсгэнэ үү.");
      }
    } catch (error: any) {
      setScanStatus("not-found");
      setScanMessage(error?.message || "M Point QR төлөв шалгахад алдаа гарлаа");
    } finally {
      setLoyaltyRedeemLoading(false);
    }
  };

  const clearLoyaltyRedeemSession = () => {
    setLoyaltyRedeemSession(null);
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (selectedCreditRepayment && method === "CREDIT") {
      setScanStatus("not-found");
      setScanMessage("Зээлийн төлөлтийг дахин зээлээр хийх боломжгүй.");
      return;
    }
    setPaymentMethod(method);
    if (method !== "QR") {
      setQpayModal(null);
    }
  };

  const startAutoCheckoutFlow = async () => {
    if (state.cart.length === 0) return;
    if (!registerConfig?.branchId) {
      setScanStatus("not-found");
      setScanMessage("Төлбөр авахын тулд POS кассаа эхлээд register/салбартай холбоно уу.");
      return;
    }
    if (!shift?.id) {
      setScanStatus("not-found");
      setScanMessage("Төлбөр авахын өмнө кассын ээлжээ нээнэ үү.");
      setShowShiftPanel(true);
      return;
    }
    if (shiftRegisterMismatch) {
      setScanStatus("not-found");
      setScanMessage(
        `Таны ээлж ${shift.registerName || "өөр POS касс"} дээр нээлттэй байна.`,
      );
      return;
    }

    setQpayModal(null);
    setLoyaltyRedeemSession(null);
    setCustomerDisplaySuccess(null);
    setPaymentEntries([]);
    setLoyalty((prev) => ({
      ...initialLoyaltyState,
      phone: prev.phone,
      mode: prev.mode === "REDEEM" ? "EARN" : prev.mode,
    }));
    setView("checkout");

    setAutoCheckoutActive(false);
    setScanStatus("idle");
    setScanMessage("M Point сонголтоо шалгаад төлбөрөө нэмнэ үү.");
  };

  useEffect(() => {
    if (!autoCheckoutActive) return;
    if (view !== "checkout") return;
    if (!canFinalizeSale || saleLoading || autoFinalizing) return;

    setAutoFinalizing(true);
    void handleCreateDemoSale().finally(() => {
      setAutoFinalizing(false);
      setAutoCheckoutActive(false);
    });
  }, [autoCheckoutActive, view, canFinalizeSale, saleLoading, autoFinalizing, handleCreateDemoSale]);

  useEffect(() => {
    const pendingQpayIds = paymentEntries
      .filter((item) => item.method === "QR" && item.status === "pending" && item.invoiceId)
      .map((item) => item.invoiceId as string);

    if (pendingQpayIds.length === 0) return;

    const timer = window.setInterval(() => {
      pendingQpayIds.forEach((invoiceId) => {
        void (async () => {
          try {
            const status = await getQPayInvoiceStatus(invoiceId);

            if (status.status === "PAID") {
              setPaymentEntries((prev) =>
                prev.map((item) => (item.id === invoiceId ? { ...item, status: "confirmed" } : item)),
              );
              setAutoCheckoutActive(true);

              if (qpayModal?.invoiceId === invoiceId) {
                setQpayModal(null);
              }
              clearProgressTicker();
              setScanStatus("success");
              setScanMessage("QPay төлбөр баталгаажлаа");
              showSuccessOverlay("QPay төлбөр амжилттай");
            }

            if (status.status === "EXPIRED") {
              setPaymentEntries((prev) => prev.filter((item) => item.id !== invoiceId));
              if (qpayModal?.invoiceId === invoiceId) {
                setQpayModal(null);
              }
              clearProgressTicker();
              setScanStatus("not-found");
              setScanMessage("QPay invoice хугацаа дууссан");
            }
          } catch {
            // Keep polling; transient network errors should not break checkout flow.
          }
        })();
      });
    }, 2500);

    return () => window.clearInterval(timer);
  }, [paymentEntries, qpayModal?.invoiceId]);

  useEffect(() => {
    if (!loyaltyRedeemSession?.id || loyaltyRedeemSession.status !== "PENDING") return;

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const session = await getLoyaltyRedeemSessionStatus(loyaltyRedeemSession.id);
          setLoyaltyRedeemSession(session);
          if (session.status === "CONFIRMED") {
            setScanStatus("success");
            setScanMessage(`M Point ${session.requestedPoints.toLocaleString("mn-MN")} баталгаажлаа.`);
          }
          if (session.status === "EXPIRED") {
            setScanStatus("not-found");
            setScanMessage("M Point QR хугацаа дууссан. Дахин QR үүсгэнэ үү.");
          }
        } catch {
          // Keep polling; transient network errors should not block checkout.
        }
      })();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [loyaltyRedeemSession?.id, loyaltyRedeemSession?.status]);

  useEffect(() => {
    const payload: CustomerDisplayPayload = {
      lines: state.cart,
      totals,
      displayTheme: customerDisplayTheme,
      qpayModal,
      loyaltyRedeemSession,
      customerSuccess: customerDisplaySuccess,
      ts: Date.now(),
    };

    localStorage.setItem("mgl_pos_customer_payload", JSON.stringify(payload));
    syncChannelRef.current?.postMessage(payload);
  }, [
    state.cart,
    totals,
    customerDisplayTheme,
    qpayModal,
    loyaltyRedeemSession,
    customerDisplaySuccess,
  ]);

  const openCustomerDisplay = () => {
    const existing = customerWindowRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }

    const popup = window.open(
      "/customer-display",
      "mgl-pos-customer-display",
      "popup=yes,width=1280,height=800,noopener,noreferrer",
    );

    if (!popup) return;

    customerWindowRef.current = popup;
    setDisplayOpened(true);

    const timer = window.setInterval(() => {
      if (popup.closed) {
        setDisplayOpened(false);
        customerWindowRef.current = null;
        window.clearInterval(timer);
      }
    }, 1000);
  };

  const receiptHistoryPanel = (
    <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Сүүлийн баримтууд</h3>
          <p className="text-[11px] text-slate-500">Refresh хийсэн ч current ээлжээс дахин татна</p>
        </div>
        <button
          type="button"
          onClick={reloadReceiptHistory}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Шинэчлэх
        </button>
      </div>

      {receiptHistoryError && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {receiptHistoryError}
        </div>
      )}

      <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
        {receiptHistoryLoading && receiptHistory.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Баримт ачаалж байна...
          </div>
        ) : receiptHistory.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Энэ ээлж дээр борлуулалт алга байна.
          </div>
        ) : (
          receiptHistory.map((receipt) => {
            const isSelected = receipt.id === receiptForPreview?.id;
            const isVoided = receipt.status === "VOIDED";
            return (
              <button
                key={receipt.id}
                type="button"
                onClick={() => setSelectedReceiptId(receipt.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">#{receipt.receiptNo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isVoided ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {isVoided ? "Буцаагдсан" : "Амжилттай"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>{new Date(receipt.createdAt).toLocaleString("mn-MN")}</span>
                  <span className="font-bold text-slate-800">{formatMoney(receipt.grandTotal)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const cashDrawerPanel = (
    <div className="rounded-xl border border-emerald-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Кассын шургуулга</h3>
          <p className="text-[11px] text-slate-500">
            Орлого, зарлага, шургуулга нээх, тооллого болон тайлан
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshCashDrawerSummary}
            disabled={!shift?.id || drawerLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {drawerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Шинэчлэх
          </button>
          <button
            type="button"
            onClick={() => void handleCreateDrawerEvent("OPEN_DRAWER")}
            disabled={!shift?.id || drawerEventSubmitting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Banknote className="h-3.5 w-3.5" />
            Шургуулга нээх
          </button>
          <button
            type="button"
            onClick={() => printCashDrawerReport()}
            disabled={!drawerSummary}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Тайлан
          </button>
        </div>
      </div>

      {drawerError && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {drawerError}
        </div>
      )}

      {!shift ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Эхлээд ээлж нээнэ үү.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {[
                ["Эхлэх мөнгө", drawerSummary?.openingCash ?? shift.openingCash],
                ["Бэлэн борлуулалт", drawerSummary?.cashSales ?? 0],
                ["Орлого", drawerSummary?.paidIn ?? 0],
                ["Зарлага", drawerSummary?.paidOut ?? 0],
                ["Тооцоолсон", drawerSummary?.expectedCash ?? 0],
                ["Тоолсон", countedCashTotal || drawerSummary?.countedCash || 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {formatMoney(Number(value))}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex gap-2">
                {([
                  ["PAID_IN", "Орлого", PlusCircle],
                  ["PAID_OUT", "Зарлага", MinusCircle],
                ] as const).map(([type, label, Icon]) => {
                  const selected = drawerEventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDrawerEventType(type)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2 lg:grid-cols-[160px_1fr_120px]">
                <input
                  type="number"
                  min="0"
                  value={drawerEventAmount}
                  onChange={(event) => setDrawerEventAmount(event.target.value)}
                  placeholder="Дүн ₮"
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  value={drawerEventNote}
                  onChange={(event) => setDrawerEventNote(event.target.value)}
                  placeholder={drawerEventType === "PAID_IN" ? "Жишээ: нэмэлт задгай мөнгө" : "Жишээ: банканд тушаав"}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateDrawerEvent()}
                  disabled={drawerEventSubmitting || !shift?.id}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {drawerEventSubmitting ? "..." : "Бүртгэх"}
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto overscroll-contain rounded-lg bg-slate-50 p-2">
            {drawerSummary?.events.length ? (
              <div className="space-y-1.5">
                {drawerSummary.events.map((event: CashDrawerEvent) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {event.type === "PAID_IN"
                          ? "Орлого"
                          : event.type === "PAID_OUT"
                            ? "Зарлага"
                            : "Шургуулга нээсэн"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(event.createdAt)}
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    </div>
                    <p className="font-black text-slate-900">{formatMoney(event.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-2 py-1.5 text-xs text-slate-500">
                Шургуулгын хөдөлгөөн бүртгэгдээгүй байна.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const shiftHistoryPanel = (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Өдрийн хаалтын түүх</h3>
          <p className="text-[11px] text-slate-500">
            {selectedShiftHistoryRange.description} дүн, зөрүү болон баримтууд
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {SHIFT_HISTORY_RANGE_OPTIONS.map((option) => {
              const selected = shiftHistoryRange === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setShiftHistoryRange(option.id)}
                  className={`h-7 rounded-md px-2.5 text-[11px] font-bold transition-colors ${
                    selected
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={reloadShiftHistory}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Шинэчлэх
          </button>
        </div>
      </div>

      {shiftHistoryError && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {shiftHistoryError}
        </div>
      )}

      <div className="mt-3 grid min-h-0 grid-cols-[minmax(260px,0.85fr)_minmax(360px,1.15fr)] gap-3">
        <div className="max-h-[420px] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {shiftHistoryLoading && shiftHistory.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Хаалтын түүх ачаалж байна...
            </div>
          ) : shiftHistory.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Сонгосон хугацаанд хаалт хийгдээгүй байна.
            </div>
          ) : (
            shiftHistory.map((item) => {
              const selected = item.id === selectedShiftHistoryId;
              const difference = Number(item.cashDifference || 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedShiftHistoryId(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Хаасан: {formatDateTime(item.closedAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Нээсэн: {formatDateTime(item.openedAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.cashierName} · {item.branchName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        difference === 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {difference === 0 ? "Зөрүүгүй" : formatMoney(difference)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-400">Нийт</p>
                      <p className="font-bold text-slate-800">{formatMoney(item.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Бэлэн</p>
                      <p className="font-bold text-slate-800">{formatMoney(item.cashSales)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Баримт</p>
                      <p className="font-bold text-slate-800">{item.salesCount}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-50 p-3">
          {selectedShiftHistory ? (
            <div className="flex h-full flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Нээсэн", formatDateTime(selectedShiftHistory.openedAt)],
                  ["Хаасан", formatDateTime(selectedShiftHistory.closedAt)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-black text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Эхлэх мөнгө", selectedShiftHistory.openingCash],
                  ["Тооцоолсон бэлэн", selectedShiftHistory.expectedCash],
                  ["Хаасан мөнгө", selectedShiftHistory.closingCash || 0],
                  ["Зөрүү", selectedShiftHistory.cashDifference || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatMoney(Number(value))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {[
                  ["Бэлэн", selectedShiftHistory.cashSales],
                  ["Карт", selectedShiftHistory.cardSales],
                  ["QPay", selectedShiftHistory.qpaySales],
                  ["Зээл", selectedShiftHistory.creditSales],
                  ["Холимог баримт", selectedShiftHistory.mixedSales],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{formatMoney(Number(amount))}</p>
                  </div>
                ))}
              </div>

              {selectedShiftHistory.note && (
                <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                  {selectedShiftHistory.note}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">Баримтууд</p>
                  {shiftHistoryReceiptsLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </div>
                {shiftHistoryReceiptsError ? (
                  <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
                    {shiftHistoryReceiptsError}
                  </p>
                ) : shiftHistoryReceipts.length === 0 ? (
                  <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                    Энэ хаалт дээр баримт алга байна.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {shiftHistoryReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">#{receipt.receiptNo}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(receipt.createdAt)} · {receipt.paymentMethod}
                          </p>
                        </div>
                        <p className="font-black text-slate-900">{formatMoney(receipt.grandTotal)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Хаалт сонгоно уу.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (posAccess !== "enabled") {
    return (
      <PosAccessGate
        status={posAccess}
        message={posAccessMessage}
        onLogout={() => {
          localStorage.removeItem("vendor_token");
          localStorage.removeItem("vendor_user");
          router.replace("/login");
        }}
      />
    );
  }

  return (
    <>
      <MobileBlock />
      <ProductLabelPrintDialog
        open={showProductLabelPrint}
        products={products}
        initialSearch={searchInput}
        onClose={() => setShowProductLabelPrint(false)}
      />
      {pendingEbarimtSale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">eBarimt</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Баримтын төрөл сонгоно уу</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Төлбөр амжилттай баталгаажсан. Одоо хувь хүн эсвэл байгууллагын баримт үүсгэнэ.
                </p>
              </div>
              <button
                type="button"
                onClick={skipPendingEbarimtSale}
                disabled={ebarimtBuyerSubmitting}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                title="eBarimt алгасах"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEbarimtBuyerMode("B2C");
                    setEbarimtBuyerError("");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    ebarimtBuyerMode === "B2C"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <p className="text-sm font-black text-slate-950">Хувь хүн</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">B2C_RECEIPT, QR шууд үүснэ.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEbarimtBuyerMode("B2B");
                    setEbarimtBuyerError("");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    ebarimtBuyerMode === "B2B"
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <p className="text-sm font-black text-slate-950">Байгууллага</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">TIN оруулаад B2B_RECEIPT үүснэ. Регистрээр шалгах нь нэмэлт.</p>
                </button>
              </div>

              {ebarimtBuyerMode === "B2B" && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <label className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Байгууллагын регистр
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={ebarimtCompanyRegNo}
                      onChange={(event) => {
                        setEbarimtCompanyRegNo(event.target.value.replace(/\D/g, "").slice(0, 7));
                        setEbarimtCompanyTin("");
                        setEbarimtBuyerError("");
                      }}
                      inputMode="numeric"
                      maxLength={7}
                      placeholder="7 оронтой РД"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-black tracking-wide text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void lookupCompanyTinForEbarimt().catch((error: any) => {
                          setEbarimtBuyerError(error?.message || "TIN шалгахад алдаа гарлаа");
                        });
                      }}
                      disabled={ebarimtCompanyLookupLoading || ebarimtCompanyRegNo.length !== 7}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ebarimtCompanyLookupLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                      TIN шалгах
                    </button>
                  </div>
                  {ebarimtCompanyTin && (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      TIN баталгаажсан: {ebarimtCompanyTin}
                    </p>
                  )}
                  <label className="mt-4 block text-xs font-black uppercase tracking-wide text-emerald-700">
                    Худалдан авагчийн TIN
                  </label>
                  <input
                    value={ebarimtCompanyTin}
                    onChange={(event) => {
                      setEbarimtCompanyTin(normalizeEbarimtTin(event.target.value));
                      setEbarimtBuyerError("");
                    }}
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="11-14 оронтой TIN"
                    className="mt-2 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-black tracking-wide text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                  <p className="mt-2 text-xs font-semibold text-emerald-800">
                    TIN lookup эрх шаардлагагүй. Худалдан авагчийн TIN-г мэдэж байвал шууд оруулаад хэвлэнэ.
                  </p>
                </div>
              )}

              {ebarimtBuyerError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {ebarimtBuyerError}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={skipPendingEbarimtSale}
                disabled={ebarimtBuyerSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              >
                eBarimt алгасах
              </button>
              <button
                type="button"
                onClick={() => void submitPendingEbarimtSale(ebarimtBuyerMode)}
                disabled={
                  ebarimtBuyerSubmitting ||
                  ebarimtCompanyLookupLoading ||
                  (ebarimtBuyerMode === "B2B" && !isValidEbarimtTin(ebarimtCompanyTin))
                }
                className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ebarimtBuyerSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {ebarimtBuyerMode === "B2B" ? "Байгууллагаар хэвлэх" : "Хувь хүнээр хэвлэх"}
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="hidden min-h-screen bg-[#051424] p-3 text-[#d4e4fa] md:block">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1800px] flex-col gap-3 overflow-hidden">
      {/* ── Register setup banner ────────────────────────────────── */}
      {!registerConfig && !showSetupPanel && !showRegisterPicker && (
        <PosRegisterSetupBanner
          onOpen={() => {
            setShowSetupPanel(true);
            setSetupError("");
          }}
        />
      )}

      {/* ── Register picker (multiple approved registers) ──────────── */}
      {showRegisterPicker && !registerConfig && (
        <PosRegisterPicker
          registers={orgRegisters}
          onClose={() => setShowRegisterPicker(false)}
          onSelect={selectRegister}
        />
      )}

      {showSetupPanel && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="POS тохируулах"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSetupPanel(false);
            }
          }}
        >
          <div className="w-full max-w-4xl">
            <PosRegisterSetupPanel
              registerConfig={registerConfig}
              setupTab={setupTab}
              setupName={setupName}
              setupBranches={setupBranches}
              setupBranchId={setupBranchId}
              setupRegistering={setupRegistering}
              setupError={setupError}
              setupExistingId={setupExistingId}
              onClose={() => setShowSetupPanel(false)}
              onChangeTab={setSetupTab}
              onClearError={() => setSetupError("")}
              onChangeName={setSetupName}
              onChangeBranchId={setSetupBranchId}
              onChangeExistingId={setSetupExistingId}
              onCreate={handleSelfRegister}
              onConnect={handleConnectExisting}
              onDisconnect={handleDisconnectRegister}
            />
          </div>
        </div>,
        document.body,
      )}

      {registerConfig && !registerConfig.isActive && !showSetupPanel && (
        <PosRegisterPendingBanner
          registerConfig={registerConfig}
          onOpenSettings={() => setShowSetupPanel(true)}
        />
      )}

      {/* ── Shift open/close panel ─────────────────────────────── */}
      {showShiftPanel && registerConfig?.isActive && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/35 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-bold text-slate-800">
                {shift ? "Ээлж хаах" : "Ээлж нээх"}
              </p>
              <button
                type="button"
                onClick={() => setShowShiftPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
              {!shift ? (
                <>
                  <p className="text-xs text-slate-500">Эхлэх мөнгийг оруулна уу.</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                      placeholder="Эхлэх мөнгө ₮"
                      className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                    <button
                      type="button"
                      disabled={shiftLoading}
                      onClick={async () => {
                        if (!registerConfig?.branchId) return;
                        try {
                          await openShift(
                            registerConfig.branchId,
                            Number(openingCashInput) || 0,
                            registerConfig.id,
                          );
                          setShowShiftPanel(false);
                          setShowShiftHistoryPanel(false);
                          setView("register");
                          setOpeningCashInput("");
                          setScanMessage("Ээлж нээгдлээ. Борлуулалтаа эхлүүлнэ үү.");
                          setScanStatus("success");
                        } catch (e: any) {
                          setScanMessage(e?.message || "Ээлж нээхэд алдаа гарлаа");
                          setScanStatus("not-found");
                        }
                      }}
                      className="h-9 px-4 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                      {shiftLoading ? <Loader2 size={14} className="animate-spin" /> : "Нээх"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Хаах үеийн бэлэн мөнгийг оруулна уу.</p>
                  {shiftRegisterMismatch && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                      Энэ ээлж {shift.registerName || "өөр POS касс"} дээр нээгдсэн байна.
                      Хаалт хийхийн өмнө тухайн касс руу шилжинэ үү.
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-black text-slate-700">Задгай мөнгө тоолох</p>
                      <p className="text-xs font-black text-slate-900">{formatMoney(countedCashTotal)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      {CASH_DENOMINATIONS.map((denomination) => (
                        <label key={denomination} className="rounded-lg bg-white px-2 py-1.5">
                          <span className="block text-[10px] font-bold text-slate-400">
                            {formatMoney(denomination)}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={cashCounts[denomination] ?? ""}
                            onChange={(event) =>
                              setCashCounts((current) => ({
                                ...current,
                                [denomination]: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                              }))
                            }
                            className="mt-1 h-7 w-full rounded-md border border-slate-200 px-2 text-sm font-bold outline-none focus:border-teal-400"
                            placeholder="0"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Тооцоолсон", expectedCashPreview],
                      ["Тоолсон", closingCashPreview],
                      ["Зөрүү", closingDifferencePreview],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                        <p
                          className={`mt-1 text-sm font-black ${
                            label === "Зөрүү" && Number(value) !== 0
                              ? "text-rose-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatMoney(Number(value))}
                        </p>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={shiftCloseNote}
                    onChange={(event) => setShiftCloseNote(event.target.value.slice(0, 500))}
                    placeholder="Хаалтын тайлбар (сонголттой)"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <div className="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-3">
                    <input
                      type="number"
                      min="0"
                      value={countedCashTotal > 0 ? String(countedCashTotal) : closingCashInput}
                      onChange={(e) => setClosingCashInput(e.target.value)}
                      placeholder="Хаах мөнгө ₮"
                      className="h-9 min-w-48 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      type="button"
                      disabled={shiftLoading || drawerLoading || shiftRegisterMismatch}
                      onClick={async () => {
                        try {
                          const activeCashCount = countedCashItems.some((item) => item.count > 0)
                            ? countedCashItems
                            : undefined;
                          const countedClosingCash = activeCashCount
                            ? countedCashTotal
                            : Number(closingCashInput) || 0;
                          const latestSummary = await refreshCashDrawerSummary();
                          if (!latestSummary) {
                            throw new Error("Хаалтын тооцоог шинэчилж чадсангүй");
                          }
                          const latestDifference = roundMoney(
                            countedClosingCash - latestSummary.expectedCash,
                          );
                          const confirmed = window.confirm(
                            [
                              "Ээлжийг хаах уу?",
                              `Тооцоолсон бэлэн: ${formatMoney(latestSummary.expectedCash)}`,
                              `Тоолсон бэлэн: ${formatMoney(countedClosingCash)}`,
                              `Зөрүү: ${formatMoney(latestDifference)}`,
                              getEffectiveCardProvider(registerConfig) === "PUSH_ECR"
                                ? "Картын терминалын өдрийн нэгтгэлийг эхэлж хийнэ."
                                : "",
                            ]
                              .filter(Boolean)
                              .join("\n"),
                          );
                          if (!confirmed) return;
                          const termId = getEffectiveCardProvider(registerConfig) === "PUSH_ECR"
                            ? registerConfig.cardTerminalId
                            : undefined;
                          await closeShiftFn(
                            countedClosingCash,
                            shiftCloseNote || undefined,
                            termId ?? undefined,
                            activeCashCount,
                          );
                          reloadShiftHistory();
                          setShowShiftPanel(false);
                          setShowCashDrawerPanel(false);
                          setShowShiftHistoryPanel(true);
                          setClosingCashInput("");
                          setShiftCloseNote("");
                          setCashCounts({});
                          setScanMessage("Өдрийн хаалт амжилттай хийгдлээ.");
                          setScanStatus("success");
                        } catch (e: any) {
                          setScanMessage(e?.message || "Ээлж хаахад алдаа гарлаа");
                          setScanStatus("not-found");
                        }
                      }}
                      className="h-9 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                    >
                      {shiftLoading || drawerLoading ? <Loader2 size={14} className="animate-spin" /> : "Хаах"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCashDrawerPanel && registerConfig?.isActive && cashDrawerPanel}

      {showShiftHistoryPanel && registerConfig?.isActive && shiftHistoryPanel}

      {view === "checkout" && registerConfig?.isActive !== false && (
        <PosCheckoutView
          lines={state.cart}
          totals={totals}
          paymentMethod={paymentMethod}
          onChangeMethod={handlePaymentMethodChange}
          paymentEntries={paymentEntries}
          qpayModal={qpayModal}
          statusMessage={scanMessage}
          statusTone={scanStatus}
          remaining={remaining}
          loyalty={loyalty}
          onLoyaltyChange={setLoyalty}
          onLookupLoyalty={lookupLoyalty}
          loyaltyRedeemSession={loyaltyRedeemSession}
          loyaltyRedeemLoading={loyaltyRedeemLoading}
          onRequestLoyaltyRedeemQr={requestLoyaltyRedeemQr}
          onRefreshLoyaltyRedeemSession={refreshLoyaltyRedeemSession}
          onClearLoyaltyRedeemSession={clearLoyaltyRedeemSession}
          creditBorrowers={creditBorrowers}
          onAddPayment={addPaymentEntry}
          onRequestQPay={requestQPay}
          onMarkQPayPaid={markQPayPaid}
          onRemovePayment={removePaymentEntry}
          onResetPayments={resetPaymentEntries}
          onFinalize={handleCreateDemoSale}
          canFinalize={canFinalizeSale}
          onBack={() => {
            clearProgressTicker();
            setAutoCheckoutActive(false);
            setView("register");
          }}
          disabled={saleLoading || creditRepaymentSubmitting || state.cart.length === 0 || isCardProcessing}
        />
      )}

      {successOverlay.visible && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overscroll-contain bg-black/45 backdrop-blur-[1px] pointer-events-none">
          <div className="rounded-3xl border border-emerald-300/60 bg-emerald-500/15 px-10 py-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-400" strokeWidth={2.4} />
            <p className="mt-4 text-3xl font-black tracking-tight text-emerald-300">Амжилттай</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">{successOverlay.text}</p>
          </div>
        </div>
      )}

      {isCardProcessing && terminalNeedsWaitingOverlay(getEffectiveCardProvider(registerConfig)) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overscroll-contain bg-black/50 backdrop-blur-[2px]">
          <div className="rounded-3xl border border-blue-300/40 bg-white px-10 py-8 text-center shadow-2xl w-80">
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-blue-500" />
            <p className="mt-4 text-lg font-bold text-slate-900">Картаар төлж байна</p>
            <p className="mt-1 text-sm text-slate-500">Терминал дээр карт уншуулна уу</p>
            <button
              type="button"
              onClick={handleCancelCardPayment}
              disabled={isCancellingCard}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {isCancellingCard ? <Loader2 size={14} className="animate-spin" /> : null}
              Цуцлах
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 rounded-xl border border-[#273647] bg-[#010f1f] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#00c2ff] text-[#003548]">
            <Utensils size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight text-[#d4e4fa]">Ресторан касс</h1>
            <p className="truncate text-xs font-semibold text-[#bcc8d1]">
              {registerConfig?.branch.name ?? "Салбар"} · {shift ? "Ээлж нээлттэй" : "Ээлж хаалттай"} · Ширээ {selectedRestaurantTable?.label ?? "A1"}
            </p>
          </div>
        </div>

        <div className="flex h-full items-center gap-2">
          {(
            [
              { id: "register", label: "Борлуулалт" },
              { id: "history", label: "Борлуулалтын түүх" },
              { id: "shift", label: "Өдрийн хаалт" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === "shift") {
                  setShowShiftPanel(true);
                  setShowShiftHistoryPanel(true);
                  setShowCashDrawerPanel(false);
                  reloadShiftHistory();
                } else {
                  setShowShiftPanel(false);
                  setShowShiftHistoryPanel(false);
                  setShowCashDrawerPanel(false);
                  setView(tab.id as PosView);
                  if (tab.id === "history") {
                    reloadReceiptHistory();
                  }
                }
              }}
              className={`h-9 rounded-lg px-4 text-sm font-bold transition-colors ${
                (tab.id === "shift" ? showShiftHistoryPanel : view === tab.id || (view === "checkout" && tab.id === "register"))
                  ? "bg-[#00c2ff] text-[#003548] shadow-sm"
                  : "bg-[#122131] text-[#bcc8d1] hover:bg-[#1c2b3c] hover:text-[#d4e4fa]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3d484f] bg-[#122131] text-[#92d9ff] hover:bg-[#1c2b3c]"
            aria-label="Нэмэх"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#273647] bg-[#122131] px-3 py-1.5 text-xs font-semibold text-[#bcc8d1]">
            <span className="h-2 w-2 rounded-full bg-[#00c2ff]" />
            Онлайн
          </span>
          <button
            type="button"
            onClick={() => setShowPosSettings((value) => !value)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors ${
              showPosSettings
                ? "bg-[#d4e4fa] text-[#233143]"
                : "border border-[#3d484f] bg-[#122131] text-[#bcc8d1] hover:bg-[#1c2b3c]"
            }`}
          >
            <Settings size={15} />
            Тохиргоо
          </button>
        </div>
      </div>

      {showPosSettings && (
        <div className="grid shrink-0 grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm xl:grid-cols-6">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Салбар</p>
            <p className="truncate font-black text-slate-900">{registerConfig?.branch.name ?? "Салбар"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Касс</p>
            <p className="truncate font-black text-slate-900">{registerConfig?.name ?? "POS"}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {registerConfig?.cardEnabled && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Карт
                </span>
              )}
              {registerConfig?.effectiveQpayEnabled && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  QPay
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={openCustomerDisplay}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors ${
              displayOpened ? "bg-amber-100 text-amber-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Хэрэглэгчийн дэлгэц</span>
            {displayOpened ? "Нээлттэй" : "Нээх"}
          </button>
          <button
            type="button"
            onClick={() => void checkEbarimtConnection()}
            disabled={checkingEbarimt || !registerConfig?.id}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              effectiveEbarimtEnabled ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">eBarimt</span>
            {checkingEbarimt ? "Шалгаж байна..." : effectiveEbarimtEnabled ? "Холболт шалгах" : "Унтраалттай"}
          </button>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Дэлгэцийн өнгө
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {CUSTOMER_DISPLAY_THEME_OPTIONS.map((option) => {
                const selected = customerDisplayTheme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateCustomerDisplayTheme(option.id)}
                    title={option.label}
                    aria-label={`Хэрэглэгчийн дэлгэцийн өнгө: ${option.label}`}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      selected
                        ? "border-slate-950 ring-2 ring-slate-300"
                        : "border-white hover:scale-105"
                    }`}
                    style={{
                      backgroundColor: option.swatch,
                      boxShadow:
                        option.id === "white"
                          ? "inset 0 0 0 1px #cbd5e1"
                          : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCashDrawerPanel((value) => !value);
              setShowShiftHistoryPanel(false);
              if (shift?.id) void refreshCashDrawerSummary();
            }}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors ${
              showCashDrawerPanel ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Шургуулга</span>
            {drawerSummary ? formatMoney(drawerSummary.expectedCash) : shift ? "Нээлттэй" : "Ээлж хэрэгтэй"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCashDrawerPanel(false);
              setShowShiftHistoryPanel(false);
              setShowShiftPanel((value) => !value);
            }}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors ${
              shift ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Ээлж</span>
            {shift ? (
              <>
                <span className="block">Нээлттэй</span>
                <span className="mt-0.5 block text-[11px] font-semibold opacity-80">
                  {formatDateTime(shift.openedAt)} нээгдсэн
                </span>
              </>
            ) : (
              "Нээх хэрэгтэй"
            )}
          </button>
        </div>
      )}

      {showPosSettings && scanMessage && (
        <div
          className={`shrink-0 rounded-xl border px-3 py-2 text-sm shadow-sm ${
            scanStatus === "success"
              ? "border-emerald-200 bg-emerald-50"
              : scanStatus === "not-found"
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">POS status</p>
          <p className="mt-0.5 whitespace-pre-wrap break-words font-semibold text-slate-900">{scanMessage}</p>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-3 2xl:grid-cols-[minmax(0,1fr)_460px]">
        {view === "history" ? (
          <section className="flex min-h-0 flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex-1 min-h-0 flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2">
                  {receiptHistoryPanel}
                </div>
              </div>
              <div className="w-full md:w-2/3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto">
                  {receiptForPreview ? (
                    <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                      <ReceiptPreview
                        receipt={receiptForPreview}
                        register={registerConfig}
                        className="w-full"
                        onVoided={handleReceiptVoided}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 text-sm font-medium">
                      Баримт сонгоно уу
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
        <section className="flex min-h-0 flex-col gap-3">
          <div className="rounded-xl border border-[#273647] bg-[#0d1c2d] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
            <form
              onSubmit={handleManualSubmit}
              className="grid shrink-0 grid-cols-[minmax(0,1fr)_104px_104px] gap-2"
            >
              <div className="relative">
                <Barcode size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75d1ff]" />
                <input
                  ref={scannerInputRef}
                  value={scanBuffer}
                  onChange={(e) => setScanBuffer(e.target.value)}
                  placeholder="Barcode, SKU эсвэл хоолны нэрээр оруулах"
                  className="h-11 w-full rounded-lg border border-[#3d484f] bg-[#051424] pl-11 pr-4 text-sm font-bold tracking-wide text-[#d4e4fa] outline-none transition placeholder:text-[#86929a] focus:border-[#00c2ff] focus:ring-2 focus:ring-[#00c2ff]/25"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setScanBuffer("");
                  setLastScannedCode("");
                  setScanMessage("");
                  setScanStatus("idle");
                  scannerInputRef.current?.focus();
                }}
                className="h-11 rounded-lg border border-[#3d484f] bg-[#122131] px-3 text-xs font-bold text-[#bcc8d1] transition hover:bg-[#1c2b3c]"
              >
                Цэвэрлэх
              </button>
              <button
                type="submit"
                className="h-11 rounded-lg bg-[#00c2ff] px-3 text-sm font-black text-[#003548] shadow-sm transition hover:bg-[#75d1ff]"
              >
                Унших
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-[#273647] bg-[#0d1c2d] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#122131] text-[#92d9ff]">
                  <UsersRound size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-black text-[#d4e4fa]">Ширээний зураглал</h2>
                  <p className="text-[11px] font-semibold text-[#86929a]">Жижиг горим · хурдан сонголт</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-[#bcc8d1]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#00c2ff]" />
                  Завгүй
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#3d484f]" />
                  Сул
                </span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {RESTAURANT_TABLES.map((table) => {
                const selected = selectedRestaurantTable?.id === table.id;
                const occupied = table.status === "active";
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedRestaurantTableId(table.id)}
                    className={`h-[70px] w-[88px] shrink-0 rounded-lg border px-2.5 py-2 text-left transition ${
                      selected
                        ? "border-[#00c2ff] bg-[#00c2ff] text-[#003548] ring-2 ring-[#00c2ff]/25"
                        : occupied
                          ? "border-[#00c2ff]/45 bg-[#00c2ff]/15 text-[#d4e4fa]"
                          : "border-[#3d484f] bg-[#122131] text-[#d4e4fa] hover:border-[#75d1ff]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xl font-black leading-none">{table.label}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black">
                        <UsersRound size={11} />
                        {table.seats}
                      </span>
                    </div>
                    <p className={`mt-1 truncate text-[10px] font-black ${selected ? "text-[#004c66]" : "text-[#92d9ff]"}`}>
                      {selected ? "Идэвхтэй" : table.status === "reserved" ? "Захиалгатай" : "Сул"}
                    </p>
                    <p className={`truncate text-[10px] font-semibold ${selected ? "text-[#004c66]/80" : "text-[#86929a]"}`}>
                      {table.zone}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`hidden rounded-xl border px-4 py-2.5 items-center justify-between ${
              scanStatus === "success"
                ? "border-emerald-200 bg-emerald-50"
                : scanStatus === "not-found"
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500">Scanner feedback</p>
              <p className="text-sm text-slate-800">Сүүлд уншсан: {lastScannedCode || "-"}</p>
              <p className="text-sm font-medium text-slate-900">{scanMessage || "Scanner бэлэн"}</p>
            </div>
            {scanStatus === "success" ? (
              <CheckCircle2 className="text-emerald-600" size={18} />
            ) : scanStatus === "not-found" ? (
              <AlertTriangle className="text-amber-600" size={18} />
            ) : (
              <Info className="text-slate-500" size={18} />
            )}
          </div>

          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Scan result</p>
            {selectedByCode ? (
              <>
                <h2 className="mt-1 text-base font-bold text-slate-900">{selectedByCode.name}</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Barcode / SKU: {selectedByCode.barcode || selectedByCode.sku}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Үнэ</p>
                    <p className="mt-1 text-xl font-black text-emerald-700">
                      ₮ {selectedByCode.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Нөөц</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{selectedByCode.stockQty}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const result = addRegisterProduct(selectedByCode);
                    if (!result.ok) {
                      setScanMessage(`Нөөц хүрэлцэхгүй: ${selectedByCode.name}`);
                      setScanStatus("not-found");
                    }
                  }}
                  disabled={
                    selectedByCode.stockQty <= 0 ||
                    (state.cart.find((line) => line.productId === selectedByCode.id)?.qty ?? 0) >=
                      selectedByCode.stockQty
                  }
                  className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedByCode.stockQty <= 0
                    ? "Нөөц дууссан"
                    : (state.cart.find((line) => line.productId === selectedByCode.id)?.qty ?? 0) >=
                          selectedByCode.stockQty
                      ? "Нөөц хүрсэн"
                      : "Сагсанд нэмэх"}
                </button>
              </>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                Barcode эсвэл SKU
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#273647] bg-[#0d1c2d] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
            <div className="mb-2 flex shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                <h2 className="text-lg font-black tracking-tight text-[#d4e4fa]">
                  {listMode === "products" ? "Меню сонгох" : "Зээлийн жагсаалт"}
                </h2>
                <p className="text-[11px] font-semibold text-[#86929a]">
                  {listMode === "products"
                    ? `${filtered.length} хоол, бараа харагдаж байна`
                    : `${filteredCreditGroups.length} зээлдэгч, ${filteredCreditRowCount} бараа байна`}
                </p>
                </div>
                <span className="rounded-full border border-[#273647] bg-[#122131] px-3 py-1 text-[11px] font-black text-[#92d9ff]">
                  Ширээ {selectedRestaurantTable?.label ?? "A1"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#273647] bg-[#051424] p-1">
                <button
                  type="button"
                  onClick={() => setListMode("products")}
                  className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-black transition ${
                    listMode === "products"
                      ? "bg-[#00c2ff] text-[#003548] shadow-sm"
                      : "text-[#86929a] hover:text-[#d4e4fa]"
                  }`}
                >
                  <Barcode size={14} />
                  <span className="truncate">Меню</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListMode("credits");
                    void reloadCreditSales();
                  }}
                  className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-black transition ${
                    listMode === "credits"
                      ? "bg-[#d8e3fb] text-[#111c2d] shadow-sm"
                      : "text-[#86929a] hover:text-[#d4e4fa]"
                  }`}
                >
                  <HandCoins size={14} />
                  <span className="truncate">Зээлийн жагсаалт</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75d1ff]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={listMode === "products" ? "Barcode, SKU, нэрээр хайх" : "Зээлдэгч, утас, бараагаар хайх"}
                  className="h-9 w-full rounded-lg border border-[#3d484f] bg-[#051424] pl-9 pr-3 text-xs font-semibold text-[#d4e4fa] outline-none transition placeholder:text-[#86929a] focus:border-[#00c2ff] focus:ring-2 focus:ring-[#00c2ff]/20"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#3d484f] bg-[#122131] px-2.5 text-xs font-bold text-[#bcc8d1] hover:bg-[#1c2b3c]"
              >
                <Filter size={15} />
                Шүүлтүүр
              </button>
              {listMode === "products" && (
                <button
                  type="button"
                  onClick={() => setShowProductLabelPrint(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#3d484f] bg-[#122131] px-2.5 text-xs font-bold text-[#bcc8d1] hover:bg-[#1c2b3c]"
                >
                  <Printer size={15} />
                  Шошго
                </button>
              )}
              <button
                type="button"
                onClick={listMode === "products" ? reloadProducts : () => void reloadCreditSales()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#3d484f] bg-[#122131] px-2.5 text-xs font-bold text-[#bcc8d1] hover:bg-[#1c2b3c]"
              >
                <RefreshCw size={15} />
                Сэргээх
              </button>
              </div>
            </div>

            {listMode === "products" && (
            <div className="mb-2 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1.5">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${
                    selectedCategory === category
                      ? "bg-[#92d9ff] text-[#003548]"
                      : "border border-[#3d484f] bg-[#122131] text-[#bcc8d1] hover:bg-[#1c2b3c]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            )}

            {listMode === "credits" ? (
              creditSalesLoading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                </div>
              ) : creditSalesError ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {creditSalesError}
                </div>
              ) : filteredCreditGroups.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Зээл олдсонгүй</p>
                    <p className="mt-1 text-xs text-slate-500">Зээлдэгчийн нэр, утас эсвэл бараагаар хайгаарай</p>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-amber-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-amber-50 text-[10px] font-black uppercase tracking-wide text-amber-700">
                      <tr>
                        <th className="w-12 px-2 py-2">№</th>
                        <th className="px-2 py-2">Зээлдэгч</th>
                        <th className="px-2 py-2">Зээлсэн бараа</th>
                        <th className="px-2 py-2 text-right">Тоо</th>
                        <th className="px-2 py-2 text-right">Төлөх дүн</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {filteredCreditGroups.map((group, groupIndex) => {
                        const isExpanded =
                          expandedCreditCustomerKey === group.key ||
                          group.rows.some(({ credit }) => selectedCreditRepayment?.id === credit.id);
                        const totalQty = group.rows.reduce((sum, row) => sum + row.line.qty, 0);

                        return (
                          <Fragment key={group.key}>
                            <tr
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                setExpandedCreditCustomerKey(isExpanded ? null : group.key)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setExpandedCreditCustomerKey(isExpanded ? null : group.key);
                                }
                              }}
                              className="cursor-pointer bg-amber-50/50 transition hover:bg-amber-100/70"
                            >
                              <td className="px-2 py-3 font-black text-amber-700">
                                <span className="inline-flex items-center gap-1">
                                  {isExpanded ? <MinusCircle size={14} /> : <PlusCircle size={14} />}
                                  {groupIndex + 1}
                                </span>
                              </td>
                              <td className="px-2 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-950">{group.borrowerName}</span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                                    {group.creditCount} зээл
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                  {group.borrowerPhone || group.employeeName || "-"}
                                </p>
                              </td>
                              <td className="px-2 py-3 font-semibold text-slate-600">
                                {group.rows.length} мөр
                              </td>
                              <td className="px-2 py-3 text-right font-black tabular-nums text-slate-900">
                                {totalQty}
                              </td>
                              <td className="px-2 py-3 text-right">
                                <p className="font-black tabular-nums text-amber-700">
                                  {formatMoney(group.totalDue)}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                  Хүү: {formatMoney(group.totalInterest)}
                                </p>
                              </td>
                            </tr>
                            {isExpanded &&
                              group.rows.map(({ credit, line }, rowIndex) => (
                                <tr
                                  key={`${credit.id}:${line.id}`}
                                  onClick={() => handleSelectCreditRepayment(credit)}
                                  className={`cursor-pointer transition ${
                                    selectedCreditRepayment?.id === credit.id
                                      ? "bg-blue-50"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="px-2 py-2.5 font-semibold text-slate-400">
                                    {groupIndex + 1}.{rowIndex + 1}
                                  </td>
                                  <td className="px-2 py-2.5 font-mono text-[11px] text-slate-500">
                                    <p>{credit.receiptNo}</p>
                                    <p className="mt-0.5">{formatDateTime(credit.createdAt)}</p>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <p className="font-black text-slate-900">{line.productName}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                      {line.productSku || line.productId}
                                    </p>
                                  </td>
                                  <td className="px-2 py-2.5 text-right font-black tabular-nums text-slate-900">
                                    {line.qty}
                                  </td>
                                  <td className="px-2 py-2.5 text-right">
                                    <p className="font-black tabular-nums text-slate-950">
                                      {formatMoney(credit.totalDue)}
                                    </p>
                                    <p className="text-[10px] font-semibold text-slate-400">
                                      Дараад төлөх
                                    </p>
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : loading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-[#273647] bg-[#051424]">
                <Loader2 className="animate-spin text-[#75d1ff]" size={20} />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/25 px-4 py-3 text-sm font-medium text-[#ffdad6]">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[#3d484f] bg-[#051424] text-center">
                <div>
                  <Utensils className="mx-auto mb-3 h-9 w-9 text-[#3d484f]" />
                  <p className="text-sm font-bold text-[#d4e4fa]">Меню олдсонгүй</p>
                  <p className="mt-1 text-xs text-[#86929a]">Нэр, SKU эсвэл barcode-оо шалгаарай</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <div className="grid auto-rows-[178px] grid-cols-3 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filtered.map((product) => {
                    const inCartQty = state.cart.find((line) => line.productId === product.id)?.qty ?? 0;
                    const isOutOfStock = product.stockQty <= 0 || inCartQty >= product.stockQty;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          if (isOutOfStock) return;
                          const result = addRegisterProduct(product);
                          if (!result.ok) {
                            setScanMessage(`Нөөц хүрэлцэхгүй: ${product.name}`);
                            setScanStatus("not-found");
                          }
                        }}
                        disabled={isOutOfStock}
                        className={`group relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-[#122131] text-left transition hover:-translate-y-0.5 hover:border-[#75d1ff]/70 disabled:cursor-not-allowed disabled:opacity-45 ${
                          inCartQty > 0
                            ? "border-[#00c2ff] ring-2 ring-[#00c2ff]/20"
                            : "border-[#273647]"
                        }`}
                      >
                        {inCartQty > 0 ? (
                          <span className="absolute right-2 top-2 z-10 rounded-full bg-[#00c2ff] px-2 py-0.5 text-[10px] font-black text-[#003548]">
                            {inCartQty}x
                          </span>
                        ) : null}
                        <div className="relative h-[82px] shrink-0 bg-[#1c2b3c]">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#273647] text-[#bcc8d1]">
                                <Utensils size={26} />
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#122131] to-transparent" />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
                          <p className="line-clamp-2 text-sm font-black leading-tight text-[#d4e4fa]">
                            {product.name}
                          </p>
                          <p className="mt-1 truncate text-[10px] font-semibold text-[#86929a]">
                            {product.categoryName || "Бусад"} · SKU {product.sku}
                          </p>
                          <div className="mt-auto flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[#86929a]">Үнэ</p>
                              <p className="text-lg font-black leading-none tabular-nums text-[#92d9ff]">
                                ₮{product.price.toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                product.stockQty <= 0
                                  ? "bg-[#93000a]/35 text-[#ffdad6]"
                                  : product.stockQty < 5
                                    ? "bg-[#f59e0b]/20 text-[#fbbf24]"
                                    : "bg-[#10b981]/15 text-[#6ee7b7]"
                              }`}
                            >
                              {product.stockQty}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        <section ref={paymentSectionRef} className="flex min-h-0 flex-col gap-3">
            <div className="shrink-0 rounded-xl border border-[#273647] bg-[#0d1c2d] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#bcc8d1]">Идэвхтэй захиалга</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-black tracking-tight text-[#d4e4fa]">
                    Ширээ {selectedRestaurantTable?.label ?? "A1"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#bcc8d1]">
                    {selectedRestaurantTable?.zone ?? "Гол заал"} · {selectedRestaurantTable?.seats ?? 4} суудал
                  </p>
                </div>
                <span className="rounded-full border border-[#00c2ff]/35 bg-[#00c2ff]/15 px-3 py-1 text-[11px] font-black text-[#92d9ff]">
                  {state.cart.length} мөр
                </span>
              </div>
            </div>
            <PosCartPanel
              className="min-h-[360px] flex-[1_1_360px]"
              lines={state.cart}
              totals={totals}
              onSetPrice={
                multiPriceEnabled
                  ? (productId, priceType, unitPrice) =>
                      dispatch({
                        type: "set-price",
                        payload: { productId, priceType, unitPrice },
                      })
                  : undefined
              }
              onClear={() => {
                dispatch({ type: "clear-cart" });
                resetCreditRepaymentMode();
              }}
              onRemove={(productId) => {
                if (selectedCreditRepayment) {
                  dispatch({ type: "clear-cart" });
                  resetCreditRepaymentMode();
                  return;
                }
                dispatch({ type: "remove-line", payload: productId });
              }}
              onSetQty={(productId, qty) => {
                if (selectedCreditRepayment) return;
                if (qty <= 0) {
                  dispatch({ type: "remove-line", payload: productId });
                  return;
                }
                dispatch({ type: "set-qty", payload: { productId, qty } });
              }}
            />

            {saleError && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">
                {saleError}
              </div>
            )}

            <div className="shrink-0 overflow-hidden rounded-xl border border-[#273647] bg-[#0d1c2d] shadow-sm">
              <div className="flex h-9 items-end border-b border-[#273647] px-4">
                <button
                  type="button"
                  className="h-9 border-b-2 border-[#00c2ff] px-3 text-xs font-black text-[#92d9ff]"
                >
                  eBarimt
                </button>
                <button
                  type="button"
                  className="h-9 px-3 text-xs font-bold text-[#86929a]"
                >
                  Төлбөр
                </button>
              </div>
              <div className="p-2.5">
                {receiptForPreview?.ebarimt?.status === "SUCCESS" && receiptForPreview.ebarimt.qrData ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#86929a]">Баримтын дугаар:</span>
                      <span className="font-black text-[#6ee7b7]">
                        {receiptForPreview.ebarimt.lottery || receiptForPreview.ebarimt.billId || receiptForPreview.receiptNo}
                      </span>
                      <span className="rounded-full bg-[#10b981]/15 px-2 py-1 text-[11px] font-black text-[#6ee7b7]">
                        Амжилттай
                      </span>
                    </div>
                    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
                      <div className="rounded-lg border border-[#273647] bg-[#051424] p-2 text-center">
                        <p className="mb-1 text-[11px] font-bold text-[#bcc8d1]">E-barimt QR</p>
                        <div className="inline-flex rounded bg-white p-1">
                          <QRCodeSVG value={receiptForPreview.ebarimt.qrData} size={104} level="M" includeMargin />
                        </div>
                        <p className="mt-1 text-[10px] leading-tight text-[#86929a]">
                          Энэ баримтыг ebarimt апп-аар уншуулна уу.
                        </p>
                      </div>
                      <div className="space-y-1.5 text-xs text-[#bcc8d1]">
                        <div className="flex justify-between gap-2">
                          <span>ДДТД:</span>
                          <span className="text-right font-semibold text-[#d4e4fa]">
                            {receiptForPreview.ebarimt.billId || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Касс:</span>
                          <span className="text-right font-semibold text-[#d4e4fa]">{registerConfig?.name ?? "POS"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Кассчин:</span>
                          <span className="text-right font-semibold text-[#d4e4fa]">{receiptForPreview.cashierName}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Салбар:</span>
                          <span className="text-right font-semibold text-[#d4e4fa]">{receiptForPreview.branchName}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Огноо:</span>
                          <span className="text-right font-semibold text-[#d4e4fa]">
                            {new Date(receiptForPreview.createdAt).toLocaleString("mn-MN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-dashed border-[#3d484f] bg-[#051424] px-4">
                    <p className="text-sm font-black text-[#d4e4fa]">eBarimt QR</p>
                    <p className="truncate text-right text-xs font-semibold text-[#86929a]">
                      {ebarimtStatusText}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <PosPaymentPanel
              totals={totals}
              paymentMethod={paymentMethod}
              onChangeMethod={handlePaymentMethodChange}
              onSubmit={() => {
                void startAutoCheckoutFlow();
              }}
              disabled={
                state.cart.length === 0 ||
                saleLoading ||
                creditRepaymentSubmitting ||
                isCardProcessing ||
                autoFinalizing ||
                registerConfig?.isActive === false
              }
            />
        </section>
      </div>
      </div>
    </div>
    </>
  );
}
