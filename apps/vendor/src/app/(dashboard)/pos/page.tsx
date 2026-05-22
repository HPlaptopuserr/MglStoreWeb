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
  CheckCircle2,
  Filter,
  Loader2,
  Monitor,
  Info,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import {
  PosCartPanel,
  PosPaymentPanel,
  PosCheckoutView,
  type CheckoutPaymentEntry,
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
  getReceipts,
  issueLocalEbarimtReceipt,
  attachEbarimtReceipt,
  type AttachEbarimtPayload,
  type RegisterConfig,
} from "@/features/pos";
import { API, authFetch } from "@/lib/api";
import { isFeatureEnabled, POS_FEATURE_KEY } from "@/lib/vendor-features";

type PosView = "register" | "checkout";

const CUSTOMER_DISPLAY_CHANNEL = "mgl-pos-customer-display";

type QPayModalPayload = {
  open: boolean;
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  expiresAt: string;
};

type CustomerDisplayPayload = {
  lines: CartLine[];
  totals: CartTotals;
  qpayModal: QPayModalPayload | null;
  ts: number;
};

type CardPaymentRun = {
  pendingId: string;
  terminalId?: string;
  provider?: string | null;
  abortController: AbortController;
  cancelled: boolean;
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
  const [view, setView] = useState<PosView>("register");
  const [displayOpened, setDisplayOpened] = useState(false);
  const [qpayModal, setQpayModal] = useState<QPayModalPayload | null>(null);
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [isCancellingCard, setIsCancellingCard] = useState(false);
  const [autoCheckoutActive, setAutoCheckoutActive] = useState(false);
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
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
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
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

  const selectedReceipt = useMemo(
    () => receiptHistory.find((receipt) => receipt.id === selectedReceiptId) || null,
    [receiptHistory, selectedReceiptId],
  );
  const receiptForPreview = selectedReceipt || lastReceipt;
  const reloadReceiptHistory = useCallback(() => {
    setReceiptReloadToken((value) => value + 1);
  }, []);

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
    setSuccessOverlay({ visible: true, text });
    console.info(`[POS] ${text}`);
    successOverlayTimerRef.current = window.setTimeout(() => {
      setSuccessOverlay({ visible: false, text: "" });
      successOverlayTimerRef.current = null;
    }, 1800);
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

  const lowerSearch = searchInput.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!lowerSearch) return products;
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch) ||
        String(item.barcode || "").toLowerCase().includes(lowerSearch),
    );
  }, [products, lowerSearch]);

  const confirmedPaid = useMemo(
    () =>
      roundMoney(
        paymentEntries
          .filter((item) => item.status === "confirmed")
          .reduce((sum, item) => sum + item.amount, 0),
      ),
    [paymentEntries],
  );

  const remaining = useMemo(
    () => Math.max(0, roundMoney(totals.grandTotal - confirmedPaid)),
    [totals.grandTotal, confirmedPaid],
  );

  const hasPendingPayment = useMemo(
    () => paymentEntries.some((item) => item.status === "pending"),
    [paymentEntries],
  );

  const canFinalizeSale =
    state.cart.length > 0 &&
    paymentEntries.length > 0 &&
    remaining <= 0 &&
    !hasPendingPayment &&
    !isCardProcessing;

  const canFinalizeCashSale =
    state.cart.length > 0 &&
    paymentMethod === "CASH" &&
    remaining > 0 &&
    !hasPendingPayment &&
    !isCardProcessing;

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
    if (!registerConfig?.branchId) {
      setScanStatus("not-found");
      setScanMessage("POS кассын салбар сонгогдоогүй байна. POS кассаа сонгоод дахин оролдоно уу.");
      setShowSetupPanel(true);
      return;
    }

    let confirmedPayments = paymentEntries.filter((item) => item.status === "confirmed");
    let canSubmitSale = canFinalizeSale;

    if (!canSubmitSale && paymentMethod === "CASH" && !hasPendingPayment && !isCardProcessing) {
      const confirmedTotal = roundMoney(
        confirmedPayments.reduce((sum, item) => sum + item.amount, 0),
      );
      const cashRemaining = Math.max(0, roundMoney(totals.grandTotal - confirmedTotal));

      if (cashRemaining > 0) {
        const cashEntry: CheckoutPaymentEntry = {
          id: `CASH-${Date.now()}`,
          method: "CASH",
          amount: cashRemaining,
          status: "confirmed",
        };
        confirmedPayments = [...confirmedPayments, cashEntry];
        setPaymentEntries((prev) => [...prev, cashEntry]);
        canSubmitSale = true;
      }
    }

    if (!canSubmitSale) {
      setScanStatus("not-found");
      setScanMessage("Split payment гүйцээгүй байна. Үлдэгдэл төлбөрөө дуусгана уу.");
      return;
    }

    const confirmedTotal = roundMoney(
      confirmedPayments.reduce((sum, item) => sum + item.amount, 0),
    );
    const saleRemaining = Math.max(0, roundMoney(totals.grandTotal - confirmedTotal));

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

    if (!clientSaleIdRef.current) {
      clientSaleIdRef.current = `sale-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }


    try {
      const receipt = await submitSale({
        shiftId: shift?.id ?? "",
        branchId: registerConfig?.branchId ?? "",
        registerId: registerConfig?.id,
        organizationId,
        clientSaleId: clientSaleIdRef.current,
        paymentMethod: finalMethod,
        paymentBreakdown,
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
      clientSaleIdRef.current = null;
      dispatch({ type: "clear-cart" });
      setView("register");
      setScanStatus("success");
      setScanMessage(finalMessage);
      showSuccessOverlay("Төлбөр амжилттай");

      setReceiptHistory((items) => [finalReceipt, ...items.filter((item) => item.id !== finalReceipt.id)]);
      setSelectedReceiptId(finalReceipt.id);
      reloadReceiptHistory();
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
            const message = bridgeError?.message || "Card terminal холболтын алдаа гарлаа";
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
                ? "Terminal төлбөр баталгаажаагүй байна. Дахин оролдоно уу."
                : "Card төлбөр цуцлагдлаа"),
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
        setScanMessage("Card төлбөр амжилттай баталгаажлаа");
        showSuccessOverlay("Карт төлбөр амжилттай");
      } catch (error: any) {
        if (isCardRunCancelled()) return;
        clearProgressTicker();
        setPaymentEntries((prev) => prev.filter((item) => item.id !== pendingId));
        setAutoCheckoutActive(false);
        setScanStatus("not-found");
        setScanMessage(error?.message || "Card terminal холболтын алдаа гарлаа");
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
    } catch {
      clearProgressTicker();
      setAutoCheckoutActive(false);
      setScanStatus("not-found");
      setScanMessage("QPay invoice үүсгэхэд алдаа гарлаа");
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
    clientSaleIdRef.current = null;
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== "QR") {
      setQpayModal(null);
    }
  };

  const startAutoCheckoutFlow = async () => {
    if (state.cart.length === 0) return;
    if (!registerConfig?.branchId) {
      setScanStatus("not-found");
      setScanMessage("POS кассын салбар сонгогдоогүй байна. POS кассаа сонгоод дахин оролдоно уу.");
      setShowSetupPanel(true);
      return;
    }

    setQpayModal(null);
    setPaymentEntries([]);
    setView("checkout");

    const total = totals.grandTotal;
    if (total <= 0) {
      setAutoCheckoutActive(false);
      return;
    }

    if (paymentMethod === "QR") {
      setAutoCheckoutActive(true);
      setScanStatus("idle");
      setScanMessage("QPay QR үүсгэж байна...");
      await requestQPay(total);
      return;
    }

    if (paymentMethod === "CARD") {
      setAutoCheckoutActive(true);
      setScanStatus("idle");
      setScanMessage("Card terminal руу хүсэлт илгээж байна...");
      await addPaymentEntry("CARD", total);
      return;
    }

    setAutoCheckoutActive(false);
    setPaymentEntries([
      {
        id: `CASH-${Date.now()}`,
        method: "CASH",
        amount: roundMoney(total),
        status: "confirmed",
      },
    ]);
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
      qpayModal,
      ts: Date.now(),
    };

    localStorage.setItem("mgl_pos_customer_payload", JSON.stringify(payload));
    syncChannelRef.current?.postMessage(payload);
  }, [state.cart, totals, qpayModal]);

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
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Card</span>
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

      {showPosSettings && registerConfig && registerConfig.isActive && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="font-semibold">{registerConfig.name}</span>
            {registerConfig.label && <span className="text-emerald-600">· {registerConfig.label}</span>}
            <span className="text-emerald-500">· {registerConfig.branch.name}</span>
            {registerConfig.cardEnabled && (
              <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-[11px] px-2 py-0.5">Card ✓</span>
            )}
            {registerConfig.effectiveQpayEnabled && (
              <span className="rounded-full bg-sky-100 border border-sky-300 text-sky-700 text-[11px] px-2 py-0.5">QPay ✓</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSetupPanel((v) => !v)}
            className="text-slate-400 hover:text-slate-600"
          >
            <Settings size={14} />
          </button>
        </div>
      )}

      {/* ── Shift status / open shift banner ───────────────────── */}
      {showPosSettings && registerConfig?.isActive && (
        <div
          className={`rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 ${
            shift
              ? "border-teal-200 bg-teal-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-2 text-sm">
            {shift ? (
              <>
                <CheckCircle2 size={14} className="text-teal-600" />
                <span className="font-semibold text-teal-800">Ээлж нээлттэй</span>
                <span className="text-teal-600 text-xs">
                  · {new Date(shift.openedAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })} нээгдсэн
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="font-semibold text-amber-800">Ээлж нээгдээгүй байна</span>
                <span className="text-amber-600 text-xs">· Борлуулалт хийхийн тулд эхлээд ээлж нээнэ үү</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowShiftPanel((v) => !v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              shift
                ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
          >
            {shift ? "Ээлж хаах" : "Ээлж нээх"}
          </button>
        </div>
      )}

      {/* ── Shift open/close panel ─────────────────────────────── */}
      {showShiftPanel && registerConfig?.isActive && (
        <div className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
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
          <div className="px-5 py-4 space-y-3">
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
                        );
                        setShowShiftPanel(false);
                        setOpeningCashInput("");
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
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    placeholder="Хаах мөнгө ₮"
                    className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <button
                    type="button"
                    disabled={shiftLoading}
                    onClick={async () => {
                      try {
                        const termId = getEffectiveCardProvider(registerConfig) === "PUSH_ECR"
                          ? registerConfig.cardTerminalId
                          : undefined;
                        await closeShiftFn(
                          Number(closingCashInput) || 0,
                          undefined,
                          termId ?? undefined,
                        );
                        setShowShiftPanel(false);
                        setClosingCashInput("");
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
      )}

      {view === "checkout" && registerConfig?.isActive !== false && (
        <PosCheckoutView
          lines={state.cart}
          totals={totals}
          paymentMethod={paymentMethod}
          onChangeMethod={handlePaymentMethodChange}
          paymentEntries={paymentEntries}
          remaining={remaining}
          onAddPayment={addPaymentEntry}
          onRequestQPay={requestQPay}
          onMarkQPayPaid={markQPayPaid}
          onRemovePayment={removePaymentEntry}
          onResetPayments={resetPaymentEntries}
          onFinalize={handleCreateDemoSale}
          canFinalize={canFinalizeSale || canFinalizeCashSale}
          onBack={() => {
            clearProgressTicker();
            setAutoCheckoutActive(false);
            setView("register");
          }}
          disabled={saleLoading || state.cart.length === 0 || isCardProcessing}
        />
      )}

      {successOverlay.visible && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-[1px] pointer-events-none">
          <div className="rounded-3xl border border-emerald-300/60 bg-emerald-500/15 px-10 py-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-400" strokeWidth={2.4} />
            <p className="mt-4 text-3xl font-black tracking-tight text-emerald-300">Амжилттай</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">{successOverlay.text}</p>
          </div>
        </div>
      )}

      {isCardProcessing && terminalNeedsWaitingOverlay(getEffectiveCardProvider(registerConfig)) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
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
          {["Борлуулалт", "Борлуулалтын түүх", "Өдрийн хаалт"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`h-9 rounded-lg px-4 text-sm font-bold transition-colors ${
                index === 0
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {tab}
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
        <div className="grid shrink-0 grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm xl:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Салбар</p>
            <p className="truncate font-black text-slate-900">{registerConfig?.branch.name ?? "Салбар"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Касс</p>
            <p className="truncate font-black text-slate-900">{registerConfig?.name ?? "POS"}</p>
          </div>
          <button
            type="button"
            onClick={openCustomerDisplay}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors ${
              displayOpened ? "bg-amber-100 text-amber-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Customer display</span>
            {displayOpened ? "Нээлттэй" : "Нээх"}
          </button>
          <button
            type="button"
            onClick={() => setShowShiftPanel((value) => !value)}
            className={`rounded-lg px-3 py-2 text-left font-black transition-colors ${
              shift ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Ээлж</span>
            {shift ? "Нээлттэй" : "Нээх хэрэгтэй"}
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_390px] gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
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
            className="grid shrink-0 grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]"
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
            <button
              type="button"
              onClick={() => {
                setScanBuffer("");
                setLastScannedCode("");
                setScanMessage("");
                setScanStatus("idle");
                scannerInputRef.current?.focus();
              }}
              className="h-12 rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
            <button
              type="submit"
              className="h-12 rounded-lg bg-blue-600 px-8 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              Унших
            </button>
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

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Барааны жагсаалт</h2>
                <p className="text-xs text-slate-500">
                  {filtered.length} бараа харагдаж байна
                </p>
              </div>
              <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative w-full max-w-sm">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Barcode, SKU, нэрээр хайх"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <Filter size={15} />
                Шүүлтүүр
              </button>
              <button
                type="button"
                onClick={reloadProducts}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Сэргээх
              </button>
              </div>
            </div>

            <div className="mb-3 flex shrink-0 items-center gap-2 overflow-x-auto">
              {["Бүгд", "Түгээмэл", "Сүү, сүүн бүтээгдэхүүн", "Ундаа", "Хүнс", "Гоо сайхан", "Бусад"].map((category, index) => (
                <button
                  key={category}
                  type="button"
                  className={`h-8 shrink-0 rounded-lg px-3 text-xs font-bold ${
                    index === 0
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
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
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-12 px-3 py-3">№</th>
                      <th className="px-3 py-3">SKU / Barcode</th>
                      <th className="px-3 py-3">Барааны нэр</th>
                      <th className="px-3 py-3 text-right">Үнэ</th>
                      <th className="px-3 py-3 text-right">Нөөц</th>
                      <th className="px-3 py-3 text-center">Нэгж</th>
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
                          <td className="px-3 py-3 font-semibold text-slate-500">{index + 1}</td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">
                            {product.barcode || product.sku}
                            {product.barcode && <p className="mt-0.5 text-[11px] text-slate-400">SKU: {product.sku}</p>}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-900">{product.name}</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-900">
                            {product.price.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-700">
                            {product.stockQty}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600">ш</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section ref={paymentSectionRef} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto_auto] gap-3 pr-1">
            <PosCartPanel
              className="min-h-[300px]"
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

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-10 items-end border-b border-slate-100 px-4">
                <button
                  type="button"
                  className="h-10 border-b-2 border-blue-600 px-3 text-xs font-black text-blue-600"
                >
                  eBarimt
                </button>
                <button
                  type="button"
                  className="h-10 px-3 text-xs font-bold text-slate-500"
                >
                  Төлбөр
                </button>
              </div>
              <div className="p-3">
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
                  <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
                    <div>
                      <p className="text-sm font-black text-slate-700">eBarimt QR</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {EBARIMT_ENABLED
                          ? "Гүйлгээ батлагдсаны дараа баримтын QR энд харагдана."
                          : "eBarimt одоогоор идэвхгүй байна."}
                      </p>
                    </div>
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
                !registerConfig?.branchId ||
                registerConfig.isActive === false
              }
            />

            <div className="hidden min-h-0 overflow-y-auto">
              {receiptForPreview && state.cart.length === 0 && (
                <ReceiptPreview
                  receipt={receiptForPreview}
                  className="min-h-[260px] shrink-0"
                  onVoided={handleReceiptVoided}
                />
              )}
              {state.cart.length === 0 &&
                (receiptHistory.length > 0 || receiptHistoryLoading || receiptHistoryError) &&
                receiptHistoryPanel}
            </div>
        </section>
      </div>
      </div>
    </div>
    </>
  );
}
