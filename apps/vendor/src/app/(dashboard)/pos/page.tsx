"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
function MobileBlock() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Monitor className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">POS касс утсан дээр ажиллахгүй</h2>
      <p className="text-sm text-slate-500 max-w-xs">
        POS систем нь зөвхөн компьютер болон таблет дээр ажилладаг. Томоохон дэлгэц ашиглана уу.
      </p>
    </div>
  );
}

import {
  Barcode,
  Search,
  ScanLine,
  ScanBarcode,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Filter,
  Loader2,
  Monitor,
  Info,
  MinusCircle,
  PlusCircle,
  Printer,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import {
  PosCartPanel,
  PosPaymentPanel,
  PosCheckoutView,
  type CheckoutPaymentEntry,
  type CheckoutLoyaltyState,
  ReceiptPreview,
  usePosCart,
  useCreateSale,
  useOwnProducts,
  usePosProducts,
  useCurrentShift,
  type CartLine,
  type CartTotals,
  type PaymentMethod,
  type PosReceipt,
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
  fetchRegisterConfig,
  createCashDrawerEvent,
  getCashDrawerSummary,
  getReceipts,
  getShiftHistory,
  issueLocalEbarimtReceipt,
  attachEbarimtReceipt,
  type AttachEbarimtPayload,
  type RegisterConfig,
  type CashDenominationCount,
  type CashDrawerEventType,
  type CashDrawerSummary,
  type PosShiftHistoryItem,
  CUSTOMER_DISPLAY_THEME_OPTIONS,
  CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
  type CustomerDisplayThemeId,
  isCustomerDisplayThemeId,
} from "@/features/pos";
import { API, authFetch } from "@/lib/api";
import { isFeatureEnabled, POS_FEATURE_KEY } from "@/lib/vendor-features";
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
  customerSuccess: CustomerDisplaySuccess | null;
  ts: number;
};

type CardPaymentRun = {
  pendingId: string;
  terminalId?: string;
  provider?: string | null;
  abortController: AbortController;
  cancelled: boolean;
};

const initialLoyaltyState: CheckoutLoyaltyState = {
  mode: "NONE",
  phone: "",
  lookupLoading: false,
  lookupError: "",
  found: false,
  customerName: null,
  balance: 0,
  earnRate: 0.02,
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
  if (!register.cardEnabled) {
    throw new Error("Энэ касс дээр картын төлбөр идэвхгүй байна");
  }

  const provider = getEffectiveCardProvider(register);
  if (!provider) {
    throw new Error("Картын terminal provider тохируулаагүй байна");
  }
  if (provider === "ANDROID_PGW" && !register.terminalBridgeUrl) {
    throw new Error("ANDROID_PGW Bridge URL тохируулаагүй байна. POS Register дээр http://127.0.0.1:7420 оруулна уу.");
  }
  if ((provider === "PUSH_ECR" || provider === "MINU_AGENT") && !register.cardTerminalId) {
    throw new Error(`${provider} terminalId тохируулаагүй байна`);
  }
  if (!LONG_RUNNING_CARD_PROVIDERS.has(provider) && !register.terminalBridgeUrl) {
    throw new Error(`${provider} Bridge URL тохируулаагүй байна`);
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
  const [organizationId, setOrganizationId] = useState("");
  const [posAccess, setPosAccess] = useState<"checking" | "enabled" | "disabled">("checking");
  const [scanBuffer, setScanBuffer] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "not-found">("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentEntries, setPaymentEntries] = useState<CheckoutPaymentEntry[]>([]);
  const [loyalty, setLoyalty] = useState<CheckoutLoyaltyState>(initialLoyaltyState);
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
  const [successOverlay, setSuccessOverlay] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [customerDisplaySuccess, setCustomerDisplaySuccess] = useState<CustomerDisplaySuccess | null>(null);
  const [registerConfig, setRegisterConfig] = useState<RegisterConfig | null>(null);
  const [showPosSettings, setShowPosSettings] = useState(false);
  const [showSetupPanel, setShowSetupPanel] = useState(false);
  // self-registration form
  const [setupTab, setSetupTab] = useState<"new" | "existing">("new");
  const [setupName, setSetupName] = useState("");
  const [setupBranches, setSetupBranches] = useState<{ id: string; name: string }[]>([]);
  const [setupBranchId, setSetupBranchId] = useState("");
  const [setupRegistering, setSetupRegistering] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupExistingId, setSetupExistingId] = useState("");
  // Shift management
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [showShiftHistoryPanel, setShowShiftHistoryPanel] = useState(false);
  const [showCashDrawerPanel, setShowCashDrawerPanel] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [cashCounts, setCashCounts] = useState<Record<number, number>>({});
  const [drawerSummary, setDrawerSummary] = useState<CashDrawerSummary | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [drawerEventType, setDrawerEventType] = useState<CashDrawerEventType>("PAID_IN");
  const [drawerEventAmount, setDrawerEventAmount] = useState("");
  const [drawerEventNote, setDrawerEventNote] = useState("");
  const [drawerEventSubmitting, setDrawerEventSubmitting] = useState(false);
  const [shiftFetched, setShiftFetched] = useState(false);

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

  const posEnabled = posAccess === "enabled";
  const registerBranchId = posEnabled ? (registerConfig?.branchId ?? "") : "";
  const posProductsState = usePosProducts(registerBranchId);
  const ownProductsState = useOwnProducts(registerBranchId || !posEnabled ? "" : organizationId);
  const { products, loading, error } = registerBranchId ? posProductsState : ownProductsState;
  const reloadProducts = registerBranchId ? posProductsState.reload : ownProductsState.reload;
  const { state, totals, addProduct, dispatch } = usePosCart();
  const { loading: saleLoading, submitSale, lastReceipt, error: saleError } = useCreateSale();
  const { shift, loading: shiftLoading, load: loadShift, open: openShift, close: closeShiftFn } = useCurrentShift();
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
    isCardProcessing;

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

  const handleReceiptVoided = useCallback(
    (message: string) => {
      reloadProducts();
      reloadReceiptHistory();
      setScanStatus("success");
      setScanMessage(message);
    },
    [reloadProducts, reloadReceiptHistory],
  );

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vendor_user");
      if (!raw) {
        setPosAccess("disabled");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed.organizationId) {
        setOrganizationId(parsed.organizationId);
      } else {
        setPosAccess("disabled");
      }
    } catch {
      setPosAccess("disabled");
    }
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    setPosAccess("checking");

    fetch(`${API}/site-settings`, { cache: "no-store" })
      .then(async (r) => {
        const settings = r.ok
          ? ((await r.json()) as Record<string, unknown>)
          : {};
        if (cancelled) return;
        setPosAccess(
          isFeatureEnabled(settings, POS_FEATURE_KEY, organizationId)
            ? "enabled"
            : "disabled",
        );
      })
      .catch(() => {
        if (!cancelled) setPosAccess("disabled");
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (posAccess === "disabled") {
      router.replace("/dashboard");
    }
  }, [posAccess, router]);

  // Fetch current open shift on load
  useEffect(() => {
    if (!posEnabled) return;
    if (shiftFetched) return;
    const token = localStorage.getItem("vendor_token");
    if (!token) return;
    setShiftFetched(true);
    void loadShift();
  }, [posEnabled, shiftFetched, loadShift]);

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
            Object.fromEntries(
              summary.cashCount.map((item) => [item.denomination, item.count]),
            ) as Record<number, number>,
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
        const shifts = Array.isArray(data.shifts) ? data.shifts : [];
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
        : summary.events.map((event) => {
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
            .filter((item) => item.count > 0)
            .map((item) => `${formatMoney(item.denomination)} x ${item.count} = ${formatMoney(item.total)}`);

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

  const [orgRegisters, setOrgRegisters] = useState<RegisterConfig[]>([]);
  const [showRegisterPicker, setShowRegisterPicker] = useState(false);

  useEffect(() => {
    if (!posEnabled) return;
    const registerId = localStorage.getItem("pos_register_id");
    if (registerId) {
      fetchRegisterConfig(registerId)
        .then(setRegisterConfig)
        .catch(() => {
          // Saved ID is stale/invalid — clear it and try org registers
          localStorage.removeItem("pos_register_id");
          setRegisterConfig(null);
        });
    }
  }, [posEnabled]);

  // Auto-discover org registers when no register is loaded yet
  useEffect(() => {
    if (!posEnabled) return;
    if (registerConfig) return; // already connected
    if (!organizationId) return;
    const token = localStorage.getItem("vendor_token");
    if (!token) return;

    fetch(`${API}/pos/registers/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: RegisterConfig[]) => {
        if (!Array.isArray(list) || list.length === 0) return;
        if (list.length === 1) {
          // Only one register — auto-connect
          localStorage.setItem("pos_register_id", list[0].id);
          setRegisterConfig(list[0]);
        } else {
          // Multiple registers — let vendor choose
          setOrgRegisters(list);
          setShowRegisterPicker(true);
        }
      })
      .catch(() => {});
  }, [organizationId, posEnabled, registerConfig]);


  // Load branches whenever setup panel opens
  useEffect(() => {
    if (!showSetupPanel || !organizationId) return;
    authFetch(`${API}/admin/branches?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string }[]) => {
        setSetupBranches(Array.isArray(data) ? data : []);
        if (data.length > 0 && !setupBranchId) setSetupBranchId(data[0].id);
      })
      .catch(() => {});
  }, [showSetupPanel, organizationId]);

  const handleSelfRegister = async () => {
    if (!setupName.trim() || !setupBranchId) {
      setSetupError("Нэр болон салбараа сонгоно уу.");
      return;
    }
    const token = localStorage.getItem("vendor_token");
    if (!token) {
      setSetupError("Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.");
      return;
    }

    setSetupRegistering(true);
    setSetupError("");
    try {
      const res = await fetch(`${API}/pos/registers/self-claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          branchId: setupBranchId,
          name: setupName.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSetupError(err.message || "Бүртгэхэд алдаа гарлаа.");
        return;
      }
      const created = await res.json();
      localStorage.setItem("pos_register_id", created.id);
      setRegisterConfig(created);
      setShowSetupPanel(false);
      setSetupName("");
    } catch {
      setSetupError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setSetupRegistering(false);
    }
  };

  const handleConnectExisting = () => {
    const id = setupExistingId.trim();
    if (!id) return;
    setSetupRegistering(true);
    setSetupError("");
    localStorage.setItem("pos_register_id", id);
    fetchRegisterConfig(id)
      .then((cfg) => {
        setRegisterConfig(cfg);
        setShowSetupPanel(false);
        setSetupExistingId("");
      })
      .catch(() => setSetupError("Register ID олдсонгүй эсвэл идэвхгүй байна."))
      .finally(() => setSetupRegistering(false));
  };

  const handleDisconnectRegister = () => {
    localStorage.removeItem("pos_register_id");
    setRegisterConfig(null);
    setShowSetupPanel(false);
    setSetupError("");
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
    return Math.max(0, Math.min(loyalty.balance, totals.grandTotal, Math.floor(loyalty.redeemPoints || 0)));
  }, [loyalty.balance, loyalty.found, loyalty.mode, loyalty.redeemPoints, totals.grandTotal]);

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
    (loyalty.mode === "NONE" || (loyalty.found && loyalty.phone.replace(/\D/g, "").length >= 6));

  const selectedByCode = useMemo(() => {
    if (!lastScannedCode) return null;
    const normalized = lastScannedCode.trim().toLowerCase();
    return (
      products.find((item) => productMatchesCode(item, normalized)) || null
    );
  }, [products, lastScannedCode]);

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

    const result = addProduct(found);
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

  const handleCreateDemoSale = async () => {
    if (state.cart.length === 0) return;

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
    }));
    const finalMethod = paymentBreakdown.length === 1 ? paymentBreakdown[0].method : "MIXED";
    const branchIdForSale =
      registerConfig?.branchId || (finalMethod === "CASH" ? `local-cash-${organizationId || "branch"}` : "");

    if (!branchIdForSale) {
      setScanStatus("not-found");
      setScanMessage("POS кассын салбар сонгогдоогүй байна. POS кассаа сонгоод дахин оролдоно уу.");
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
              },
        totalPaid: confirmedTotal,
        remaining: saleRemaining,
        status: "PAID",
        lines: state.cart.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
        })),
        note: "POS checkout",
      });

      let finalReceipt = receipt;
      let finalMessage = "Төлбөр амжилттай";

      if (EBARIMT_ENABLED) {
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
          finalMessage = "Төлбөр болон eBarimt баримт амжилттай";
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
          finalMessage = `Төлбөр амжилттай. eBarimt: ${errorMessage}`;
          await attachEbarimtReceipt(receipt.id, {
            status: "FAILED",
            error: errorMessage,
          }).catch(() => {});
        }
      }

      setQpayModal(null);
      setPaymentEntries([]);
      setLoyalty(initialLoyaltyState);
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

  const addPaymentEntry = async (method: PaymentMethod, amount: number) => {
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

        if (effectiveCardProvider === "ANDROID_PGW" && !freshRegisterConfig.terminalBridgeUrl) {
          throw new Error(
            "ANDROID_PGW Bridge URL тохируулаагүй байна. POS Register дээр http://127.0.0.1:7420 оруулна уу."
          );
        }

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
    setCustomerDisplaySuccess(null);
    clientSaleIdRef.current = null;
  };

  const lookupLoyalty = async () => {
    const phone = loyalty.phone.replace(/\D/g, "");
    if (phone.length < 6) {
      setLoyalty((prev) => ({ ...prev, lookupError: "Утасны дугаар оруулна уу." }));
      return;
    }

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
        earnRate: Number(data.earnRate || 0.02),
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

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== "QR") {
      setQpayModal(null);
    }
  };

  const startAutoCheckoutFlow = async () => {
    if (state.cart.length === 0) return;
    if (paymentMethod !== "CASH" && !registerConfig?.branchId) {
      setScanStatus("not-found");
      setScanMessage("Карт болон QR төлбөр авахын тулд POS кассаа эхлээд бүртгэнэ үү. Бэлэн төлбөрийг кассгүй авч болно.");
      setShowSetupPanel(true);
      return;
    }

    setQpayModal(null);
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
    const payload: CustomerDisplayPayload = {
      lines: state.cart,
      totals,
      displayTheme: customerDisplayTheme,
      qpayModal,
      customerSuccess: customerDisplaySuccess,
      ts: Date.now(),
    };

    localStorage.setItem("mgl_pos_customer_payload", JSON.stringify(payload));
    syncChannelRef.current?.postMessage(payload);
  }, [state.cart, totals, customerDisplayTheme, qpayModal, customerDisplaySuccess]);

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
                {drawerSummary.events.map((event) => (
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

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Карт</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatMoney(selectedShiftHistory.cardSales)}</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">QPay</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatMoney(selectedShiftHistory.qpaySales)}</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Холимог</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatMoney(selectedShiftHistory.mixedSales)}</p>
                </div>
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

  if (!posEnabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm font-medium text-slate-500">
            POS кассын эрх шалгаж байна...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileBlock />
    <div className="hidden min-h-screen bg-slate-50 p-4 md:block">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-[1800px] flex-col gap-3 overflow-hidden">
      {/* ── Register setup banner ────────────────────────────────── */}
      {!registerConfig && !showSetupPanel && !showRegisterPicker && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="flex-1 text-sm text-amber-800 font-medium">
            POS бүртгэгдээгүй байна.
          </p>
          <button
            type="button"
            onClick={() => { setShowSetupPanel(true); setSetupError(""); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
          >
            <Settings size={13} />
            Бүртгэх
          </button>
        </div>
      )}

      {/* ── Register picker (multiple approved registers) ──────────── */}
      {showRegisterPicker && !registerConfig && (
        <div className="rounded-2xl border border-violet-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Monitor size={15} className="text-violet-600" />
              POS кассаа сонгох
            </p>
            <button
              type="button"
              onClick={() => setShowRegisterPicker(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-slate-500 mb-3">
              Таны байгууллагад бүртгэгдсэн {orgRegisters.length} POS касс байна. Нэгийг сонгоно уу.
            </p>
            {orgRegisters.map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => {
                  localStorage.setItem("pos_register_id", reg.id);
                  setRegisterConfig(reg);
                  setShowRegisterPicker(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-colors text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Monitor size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{reg.name}</p>
                  <p className="text-xs text-slate-500">{reg.branch?.name}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {reg.cardEnabled && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Карт</span>
                  )}
                  {reg.qpayEnabled && (
                    <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">QPay</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSetupPanel && (
        <div className="rounded-2xl border border-violet-200 bg-white shadow-sm overflow-hidden">
          {/* panel header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Monitor size={15} className="text-violet-600" />
              POS тохируулах
            </p>
            <button
              type="button"
              onClick={() => setShowSetupPanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* tabs */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => { setSetupTab("new"); setSetupError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${setupTab === "new" ? "bg-violet-50 text-violet-700 border-b-2 border-violet-500" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Шинэ register үүсгэх
            </button>
            <button
              type="button"
              onClick={() => { setSetupTab("existing"); setSetupError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${setupTab === "existing" ? "bg-violet-50 text-violet-700 border-b-2 border-violet-500" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Байгаа ID оруулах
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {setupError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {setupError}
              </div>
            )}

            {setupTab === "new" ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Энэ кассын нэрийг оруулна уу. Шинэ register үүсгэгдэн Admin батлалт хүлээнэ.
                </p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Нэр</label>
                  <input
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelfRegister()}
                    placeholder="Касс 1"
                    className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Салбар</label>
                  {setupBranches.length === 0 ? (
                    <p className="text-xs text-amber-600">Салбар олдсонгүй. Эхлээд салбар бүртгэнэ үү.</p>
                  ) : (
                    <select
                      value={setupBranchId}
                      onChange={(e) => setSetupBranchId(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white"
                    >
                      {setupBranches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSelfRegister}
                  disabled={setupRegistering || !setupName.trim() || !setupBranchId}
                  className="flex items-center gap-2 h-9 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {setupRegistering ? <Loader2 size={14} className="animate-spin" /> : <Monitor size={14} />}
                  Register үүсгэх
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Өмнө нь Admin-аас авсан Register UUID-г оруулна уу.
                </p>
                <div className="flex gap-2">
                  <input
                    value={setupExistingId}
                    onChange={(e) => setSetupExistingId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnectExisting()}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm font-mono outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    type="button"
                    onClick={handleConnectExisting}
                    disabled={setupRegistering || !setupExistingId.trim()}
                    className="h-9 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
                  >
                    {setupRegistering ? <Loader2 size={14} className="animate-spin" /> : "Холбох"}
                  </button>
                </div>
              </div>
            )}

            {/* QPay status info */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Info size={13} className="text-slate-400 shrink-0" />
                <span>QPay төлбөр:</span>
                {registerConfig?.effectiveQpayEnabled ? (
                  <span className="font-semibold text-emerald-600">Идэвхтэй</span>
                ) : (
                  <span className="font-semibold text-amber-600">Тохируулаагүй</span>
                )}
              </div>
              <a
                href="/dashboard/profile?tab=qpay"
                className="text-xs font-semibold text-violet-600 hover:underline shrink-0"
              >
                QPay тохиргоо →
              </a>
            </div>

            {registerConfig && (
              <button
                type="button"
                onClick={handleDisconnectRegister}
                className="text-xs text-rose-500 hover:underline"
              >
                Одоогийн холболтыг салгах ({registerConfig.name})
              </button>
            )}
          </div>
        </div>
      )}

      {registerConfig && !registerConfig.isActive && !showSetupPanel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-800 min-w-0">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">
                {registerConfig.name}
                <span className="font-normal text-amber-600"> · {registerConfig.branch.name}</span>
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Admin батлахыг хүлээж байна. ID-г Admin-д дамжуулна уу:
              </p>
              <p className="text-xs font-mono text-amber-900 bg-amber-100 rounded px-1.5 py-0.5 mt-1 break-all select-all">
                {registerConfig.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSetupPanel(true)}
            className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
          >
            <Settings size={14} />
          </button>
        </div>
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
                  <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-slate-100 bg-white px-5 py-3">
                    <input
                      type="number"
                      min="0"
                      value={countedCashTotal > 0 ? String(countedCashTotal) : closingCashInput}
                      onChange={(e) => setClosingCashInput(e.target.value)}
                      placeholder="Хаах мөнгө ₮"
                      className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      type="button"
                      disabled={shiftLoading}
                      onClick={async () => {
                        try {
                          const activeCashCount = countedCashItems.some((item) => item.count > 0)
                            ? countedCashItems
                            : undefined;
                          const countedClosingCash = activeCashCount
                            ? countedCashTotal
                            : Number(closingCashInput) || 0;
                          const termId = getEffectiveCardProvider(registerConfig) === "PUSH_ECR"
                            ? registerConfig.cardTerminalId
                            : undefined;
                          await closeShiftFn(
                            countedClosingCash,
                            undefined,
                            termId ?? undefined,
                            activeCashCount,
                          );
                          reloadShiftHistory();
                          setShowShiftPanel(false);
                          setShowCashDrawerPanel(false);
                          setShowShiftHistoryPanel(true);
                          setClosingCashInput("");
                          setCashCounts({});
                        } catch (e: any) {
                          setScanMessage(e?.message || "Ээлж хаахад алдаа гарлаа");
                          setScanStatus("not-found");
                        }
                      }}
                      className="h-9 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                    >
                      {shiftLoading ? <Loader2 size={14} className="animate-spin" /> : "Хаах"}
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
          disabled={saleLoading || state.cart.length === 0 || isCardProcessing}
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

      <div className="flex h-11 shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-2 shadow-sm">
        <div className="flex h-full items-center gap-1">
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
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Нэмэх"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Онлайн
          </span>
          <button
            type="button"
            onClick={() => setShowPosSettings((value) => !value)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors ${
              showPosSettings
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,0.58fr)_minmax(720px,1.42fr)] gap-3 2xl:grid-cols-[minmax(430px,0.54fr)_minmax(860px,1.46fr)]">
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
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="hidden mb-3 flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ScanLine size={20} />
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-950">Barcode уншуулах</h1>
                  <p className="text-xs font-medium text-slate-500">Уншуулсан бараа сагсанд шууд нэмэгдэнэ</p>
                </div>
              </div>
              <div
                className={`min-w-56 rounded-xl border px-3 py-2 ${
                  scanStatus === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : scanStatus === "not-found"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Scanner</p>
                <p className="truncate text-sm font-bold text-slate-900">{scanMessage || "Бэлэн"}</p>
              </div>
            </div>

          <form
            onSubmit={handleManualSubmit}
            className="flex shrink-0 flex-col gap-2"
          >
            <div className="relative">
              <Barcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={scannerInputRef}
                value={scanBuffer}
                onChange={(e) => setScanBuffer(e.target.value)}
                placeholder="Barcode уншуулах эсвэл гараар оруулах"
                className="h-12 w-full rounded-lg border-2 border-blue-500 bg-white pl-12 pr-4 text-base font-bold tracking-wide text-slate-950 outline-none transition focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanBuffer("");
                  setLastScannedCode("");
                  setScanMessage("");
                  setScanStatus("idle");
                  scannerInputRef.current?.focus();
                }}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Цэвэрлэх
              </button>
              <button
                type="submit"
                className="h-11 rounded-lg bg-blue-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                Унших
              </button>
            </div>
          </form>
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
                    const result = addProduct(selectedByCode);
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

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div className="mb-2 flex shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">Барааны жагсаалт</h2>
                <p className="text-[11px] text-slate-500">
                  {filtered.length} бараа харагдаж байна
                </p>
              </div>
              <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative w-full max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Barcode, SKU, нэрээр хайх"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Filter size={15} />
                Шүүлтүүр
              </button>
              <button
                type="button"
                onClick={reloadProducts}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Сэргээх
              </button>
              </div>
            </div>

            <div className="mb-2 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1.5">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <p className="text-sm font-bold text-slate-700">Бараа олдсонгүй</p>
                  <p className="mt-1 text-xs text-slate-500">Нэр, SKU эсвэл barcode-оо шалгаарай</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-9 px-2 py-2">№</th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Барааны нэр</th>
                      <th className="px-2 py-2 text-right">Үнэ</th>
                      <th className="px-2 py-2 text-right">Нөөц</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((product, index) => {
                      const inCartQty = state.cart.find((line) => line.productId === product.id)?.qty ?? 0;
                      const isOutOfStock = product.stockQty <= 0 || inCartQty >= product.stockQty;
                      return (
                        <tr
                          key={product.id}
                          onClick={() => {
                            if (isOutOfStock) return;
                            const result = addProduct(product);
                            if (!result.ok) {
                              setScanMessage(`Нөөц хүрэлцэхгүй: ${product.name}`);
                              setScanStatus("not-found");
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            inCartQty > 0 ? "bg-blue-50" : "hover:bg-slate-50"
                          } ${isOutOfStock ? "opacity-50" : ""}`}
                        >
                          <td className="px-2 py-2.5 font-semibold text-slate-500">{index + 1}</td>
                          <td className="max-w-28 px-2 py-2.5 font-mono text-[11px] text-slate-600">
                            {product.barcode || product.sku}
                            {product.barcode && <p className="mt-0.5 text-[11px] text-slate-400">SKU: {product.sku}</p>}
                          </td>
                          <td className="px-2 py-2.5 font-bold text-slate-900">{product.name}</td>
                          <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">
                            {product.price.toLocaleString()}
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-700">
                            {product.stockQty}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        )}

        <section ref={paymentSectionRef} className="flex min-h-0 flex-col gap-3 pr-1">
            <PosCartPanel
              className="min-h-[360px] flex-[1_1_360px]"
              lines={state.cart}
              totals={totals}
              onClear={() => dispatch({ type: "clear-cart" })}
              onRemove={(productId) => dispatch({ type: "remove-line", payload: productId })}
              onSetQty={(productId, qty) => {
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

            <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-9 items-end border-b border-slate-100 px-4">
                <button
                  type="button"
                  className="h-9 border-b-2 border-blue-600 px-3 text-xs font-black text-blue-600"
                >
                  eBarimt
                </button>
                <button
                  type="button"
                  className="h-9 px-3 text-xs font-bold text-slate-500"
                >
                  Төлбөр
                </button>
              </div>
              <div className="p-2.5">
                {receiptForPreview?.ebarimt?.status === "SUCCESS" && receiptForPreview.ebarimt.qrData ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500">Баримтын дугаар:</span>
                      <span className="font-black text-emerald-600">
                        {receiptForPreview.ebarimt.lottery || receiptForPreview.ebarimt.billId || receiptForPreview.receiptNo}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                        Амжилттай
                      </span>
                    </div>
                    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                        <p className="mb-1 text-[11px] font-bold text-slate-600">E-barimt QR</p>
                        <div className="inline-flex rounded bg-white p-1">
                          <QRCodeSVG value={receiptForPreview.ebarimt.qrData} size={104} level="M" includeMargin />
                        </div>
                        <p className="mt-1 text-[10px] leading-tight text-slate-500">
                          Энэ баримтыг ebarimt апп-аар уншуулна уу.
                        </p>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between gap-2">
                          <span>ДДТД:</span>
                          <span className="text-right font-semibold text-slate-900">
                            {receiptForPreview.ebarimt.billId || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Касс:</span>
                          <span className="text-right font-semibold text-slate-900">{registerConfig?.name ?? "POS"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Кассчин:</span>
                          <span className="text-right font-semibold text-slate-900">{receiptForPreview.cashierName}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Салбар:</span>
                          <span className="text-right font-semibold text-slate-900">{receiptForPreview.branchName}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Огноо:</span>
                          <span className="text-right font-semibold text-slate-900">
                            {new Date(receiptForPreview.createdAt).toLocaleString("mn-MN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4">
                    <p className="text-sm font-black text-slate-700">eBarimt QR</p>
                    <p className="truncate text-right text-xs font-semibold text-slate-500">
                      {EBARIMT_ENABLED
                        ? "Гүйлгээ батлагдсаны дараа QR харагдана."
                        : "eBarimt одоогоор идэвхгүй байна."}
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
                isCardProcessing ||
                autoFinalizing ||
                (paymentMethod !== "CASH" && !registerConfig?.branchId) ||
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
