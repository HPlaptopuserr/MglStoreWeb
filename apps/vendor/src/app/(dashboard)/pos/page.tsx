"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Search,
  ScanLine,
  ScanBarcode,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Monitor,
  Info,
  Settings,
  X,
} from "lucide-react";
import {
  PosHeader,
  PosProductGrid,
  PosCartPanel,
  PosPaymentPanel,
  PosCheckoutView,
  type CheckoutPaymentEntry,
  ReceiptPreview,
  usePosCart,
  useCreateSale,
  useOwnProducts,
  type CartLine,
  type CartTotals,
  type PaymentMethod,
  type PosReceipt,
  type SalePaymentLine,
  formatReceipt,
  createCardAttempt,
  getCardAttemptStatus,
  cancelPushEcr,
  createQPayInvoice,
  getQPayInvoiceStatus,
  confirmQPayInvoice,
  fetchRegisterConfig,
  type RegisterConfig,
} from "@/features/pos";
import { API, authFetch } from "@/lib/api";

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

const SCAN_GAP_MS = 80;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const printReceipt = (receipt: PosReceipt) => {
  if (typeof window === "undefined") return;

  const popup = window.open("", "_blank", "width=420,height=760");
  if (!popup) return;

  const content = escapeHtml(formatReceipt(receipt));
  popup.document.write(`
    <html>
      <head>
        <title>Receipt ${receipt.receiptNo}</title>
        <style>
          body { font-family: monospace; margin: 0; padding: 12px; color: #111; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; }
        </style>
      </head>
      <body>
        <pre>${content}</pre>
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
  const [organizationId, setOrganizationId] = useState("");
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
  const [demoShiftId] = useState("demo-shift-1");
  const [demoBranchId] = useState("demo-branch-1");
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [isCancellingCard, setIsCancellingCard] = useState(false);
  const [autoCheckoutActive, setAutoCheckoutActive] = useState(false);
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [registerConfig, setRegisterConfig] = useState<RegisterConfig | null>(null);
  const [showSetupPanel, setShowSetupPanel] = useState(false);
  // self-registration form
  const [setupTab, setSetupTab] = useState<"new" | "existing">("new");
  const [setupName, setSetupName] = useState("");
  const [setupBranches, setSetupBranches] = useState<{ id: string; name: string }[]>([]);
  const [setupBranchId, setSetupBranchId] = useState("");
  const [setupRegistering, setSetupRegistering] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupExistingId, setSetupExistingId] = useState("");

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const customerWindowRef = useRef<Window | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const keyBufferRef = useRef("");
  const lastKeyTsRef = useRef(0);
  const clientSaleIdRef = useRef<string | null>(null);
  const progressTickerRef = useRef<number | null>(null);
  const successOverlayTimerRef = useRef<number | null>(null);

  const { products, loading, error } = useOwnProducts(organizationId);
  const { state, totals, addProduct, dispatch } = usePosCart();
  const { loading: saleLoading, submitSale, lastReceipt, error: saleError } = useCreateSale();

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

  const handleCancelPushEcr = async () => {
    const terminalId = registerConfig?.cardTerminalId;
    if (!terminalId) return;
    setIsCancellingCard(true);
    try {
      await cancelPushEcr(terminalId);
    } catch {
      /* ignore — terminal will timeout on its own */
    } finally {
      setIsCancellingCard(false);
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
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.organizationId) {
        setOrganizationId(parsed.organizationId);
      }
    } catch {}
  }, []);

  const [orgRegisters, setOrgRegisters] = useState<RegisterConfig[]>([]);
  const [showRegisterPicker, setShowRegisterPicker] = useState(false);

  useEffect(() => {
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
  }, []);

  // Auto-discover org registers when no register is loaded yet
  useEffect(() => {
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
  }, [organizationId, registerConfig]);


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
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      clearProgressTicker();
      if (successOverlayTimerRef.current !== null) {
        window.clearTimeout(successOverlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    syncChannelRef.current = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    return () => {
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, []);

  const lowerSearch = searchInput.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!lowerSearch) return products;
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch),
    );
  }, [products, lowerSearch]);

  const confirmedPaid = useMemo(
    () =>
      paymentEntries
        .filter((item) => item.status === "confirmed")
        .reduce((sum, item) => sum + item.amount, 0),
    [paymentEntries],
  );

  const remaining = useMemo(
    () => Math.max(0, totals.grandTotal - confirmedPaid),
    [totals.grandTotal, confirmedPaid],
  );

  const hasPendingPayment = useMemo(
    () => paymentEntries.some((item) => item.status === "pending"),
    [paymentEntries],
  );

  const canFinalizeSale =
    state.cart.length > 0 &&
    paymentEntries.length > 0 &&
    remaining === 0 &&
    !hasPendingPayment &&
    !isCardProcessing;

  const selectedByCode = useMemo(() => {
    if (!lastScannedCode) return null;
    const normalized = lastScannedCode.trim().toLowerCase();
    return (
      products.find((item) => item.sku.trim().toLowerCase() === normalized) ||
      products.find((item) => item.id.trim().toLowerCase() === normalized) ||
      null
    );
  }, [products, lastScannedCode]);

  const processScan = (code: string) => {
    const normalized = code.trim();
    if (!normalized) return;

    setLastScannedCode(normalized);
    setSearchInput(normalized);

    const found =
      products.find((item) => item.sku.trim().toLowerCase() === normalized.toLowerCase()) ||
      products.find((item) => item.id.trim().toLowerCase() === normalized.toLowerCase());

    if (!found) {
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

    setScanMessage(`Амжилттай сагсанд нэмэгдлээ: ${found.name}`);
    setScanStatus("success");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [products]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(scanBuffer);
    setScanBuffer("");
  };

  const handleCreateDemoSale = async () => {
    if (state.cart.length === 0) return;
    if (!canFinalizeSale) {
      setScanStatus("not-found");
      setScanMessage("Split payment гүйцээгүй байна. Үлдэгдэл төлбөрөө дуусгана уу.");
      return;
    }

    const confirmedPayments = paymentEntries.filter((item) => item.status === "confirmed");
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
        shiftId: demoShiftId,
        branchId: registerConfig?.branchId ?? demoBranchId,
        registerId: registerConfig?.id,
        organizationId,
        clientSaleId: clientSaleIdRef.current,
        paymentMethod: finalMethod,
        paymentBreakdown,
        totalPaid: confirmedPaid,
        remaining,
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

      setQpayModal(null);
      setPaymentEntries([]);
      clientSaleIdRef.current = null;
      dispatch({ type: "clear-cart" });
      setView("register");
      setScanStatus("success");
      setScanMessage("Split payment амжилттай дууслаа");
      showSuccessOverlay("Төлбөр амжилттай");

      printReceipt(receipt);
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
    const safeAmount = Math.max(0, Math.min(amount, remaining));
    if (safeAmount <= 0) return;

    if (method === "CARD") {
      const pendingId = `CARD-${Date.now()}`;
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

      try {
        const attempt = await createCardAttempt({
          amount: safeAmount,
          terminalId: registerConfig?.cardTerminalId ?? "terminal-1",
          bridgeUrl: registerConfig?.terminalBridgeUrl ?? undefined,
          registerId: registerConfig?.id,
          organizationId,
        });

        const isPushEcr = registerConfig?.cardProviderType === "PUSH_ECR";
        const maxPolls = isPushEcr ? 150 : 8; // 150×800ms=120s for Push ECR
        let approvedAttempt = attempt;
        for (let i = 0; i < maxPolls; i += 1) {
          if (approvedAttempt.status === "APPROVED") break;
          if (approvedAttempt.status === "DECLINED" || approvedAttempt.status === "FAILED") break;
          await new Promise((resolve) => setTimeout(resolve, 800));
          approvedAttempt = await getCardAttemptStatus(attempt.attemptId);
        }

        if (approvedAttempt.status !== "APPROVED") {
          clearProgressTicker();
          setPaymentEntries((prev) => prev.filter((item) => item.id !== pendingId));
          setAutoCheckoutActive(false);
          setScanStatus("not-found");
          setScanMessage(approvedAttempt.message || "Card төлбөр цуцлагдлаа");
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
      } catch {
        clearProgressTicker();
        setPaymentEntries((prev) => prev.filter((item) => item.id !== pendingId));
        setAutoCheckoutActive(false);
        setScanStatus("not-found");
        setScanMessage("Card terminal холболтын алдаа гарлаа");
      } finally {
        setIsCardProcessing(false);
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
    const safeAmount = Math.max(0, Math.min(amount, remaining));
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

    setQpayModal(null);
    setPaymentEntries([]);
    setView("checkout");
    setAutoCheckoutActive(true);

    const total = totals.grandTotal;
    if (total <= 0) {
      setAutoCheckoutActive(false);
      return;
    }

    if (paymentMethod === "QR") {
      setScanStatus("idle");
      setScanMessage("QPay QR үүсгэж байна...");
      await requestQPay(total);
      return;
    }

    if (paymentMethod === "CARD") {
      setScanStatus("idle");
      setScanMessage("Card terminal руу хүсэлт илгээж байна...");
      await addPaymentEntry("CARD", total);
      return;
    }

    await addPaymentEntry("CASH", total);
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

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-slate-50 min-h-screen">
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

      {registerConfig && registerConfig.isActive && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="font-semibold">{registerConfig.name}</span>
            {registerConfig.label && <span className="text-emerald-600">· {registerConfig.label}</span>}
            <span className="text-emerald-500">· {registerConfig.branch.name}</span>
            {registerConfig.cardEnabled && (
              <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-[11px] px-2 py-0.5">Card ✓</span>
            )}
            {registerConfig.qpayEnabled && (
              <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-[11px] px-2 py-0.5">QPay ✓</span>
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-[1px] pointer-events-none">
          <div className="rounded-3xl border border-emerald-300/60 bg-emerald-500/15 px-10 py-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-400" strokeWidth={2.4} />
            <p className="mt-4 text-3xl font-black tracking-tight text-emerald-300">Амжилттай</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">{successOverlay.text}</p>
          </div>
        </div>
      )}

      {isCardProcessing && registerConfig?.cardProviderType === "PUSH_ECR" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="rounded-3xl border border-blue-300/40 bg-white px-10 py-8 text-center shadow-2xl w-80">
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-blue-500" />
            <p className="mt-4 text-lg font-bold text-slate-900">Картаар төлж байна</p>
            <p className="mt-1 text-sm text-slate-500">Терминал дээр карт уншуулна уу</p>
            <button
              type="button"
              onClick={handleCancelPushEcr}
              disabled={isCancellingCard}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {isCancellingCard ? <Loader2 size={14} className="animate-spin" /> : null}
              Цуцлах
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setView("register")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            view === "register"
              ? "bg-violet-600 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          <ScanBarcode size={14} />
          Касс
        </button>
        <button
          type="button"
          onClick={openCustomerDisplay}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            displayOpened
              ? "bg-amber-500 text-black shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"
          }`}
        >
          <Monitor size={14} />
          {displayOpened ? "Customer display нээлттэй" : "Customer display нээх"}
        </button>
      </div>

      <PosHeader
        title="Barcode уншуулах"
        branchName={registerConfig?.branch.name ?? "Салбар"}
        registerName={registerConfig?.name ?? "POS"}
        cashierName="Vendor Cashier"
        shiftStatus="Нээлттэй"
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center gap-2">
            <ScanLine className="text-violet-600" size={18} />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Barcode уншуулах</h1>
              <p className="text-sm text-slate-500">Бараа хайх / уншуулах</p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Barcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" />
              <input
                ref={scannerInputRef}
                value={scanBuffer}
                onChange={(e) => setScanBuffer(e.target.value)}
                placeholder="Barcode уншуул эсвэл код оруул"
                className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white pl-12 pr-4 text-base font-medium outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <button
              type="submit"
              className="h-14 rounded-2xl bg-violet-600 px-6 text-base font-semibold text-white hover:bg-violet-700"
            >
              Унших
            </button>
          </form>

          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Scan result</p>
            {selectedByCode ? (
              <>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedByCode.name}</h2>
                <p className="text-xs text-slate-600 mt-1">Barcode / SKU: {selectedByCode.sku}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Үнэ</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      ₮ {selectedByCode.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Нөөц</p>
                    <p className="mt-1 text-2xl font-black text-slate-800">{selectedByCode.stockQty}</p>
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

          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Barcode эсвэл SKU, нэрээр хайх"
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
              />
            </div>

            {loading ? (
              <div className="h-44 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : (
              <PosProductGrid
                products={filtered}
                cartLines={state.cart}
                onSelect={(product) => {
                  const result = addProduct(product);
                  if (!result.ok) {
                    setScanMessage(`Нөөц хүрэлцэхгүй: ${product.name}`);
                    setScanStatus("not-found");
                  }
                }}
              />
            )}
          </div>
        </section>

        <section className="xl:col-span-2 space-y-4">
          <PosCartPanel
            lines={state.cart}
            onRemove={(productId) => dispatch({ type: "remove-line", payload: productId })}
            onSetQty={(productId, qty) => {
              if (qty <= 0) {
                dispatch({ type: "remove-line", payload: productId });
                return;
              }
              dispatch({ type: "set-qty", payload: { productId, qty } });
            }}
          />

          <PosPaymentPanel
            totals={totals}
            paymentMethod={paymentMethod}
            onChangeMethod={handlePaymentMethodChange}
            onSubmit={() => {
              void startAutoCheckoutFlow();
            }}
            disabled={state.cart.length === 0 || saleLoading || isCardProcessing || autoFinalizing || (registerConfig !== null && !registerConfig.isActive)}
          />

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <ScanBarcode size={16} className="text-slate-400" />
              <span>Сагсны мөр: {state.cart.length}</span>
            </div>
            {saleError && <p className="mt-2 text-xs text-rose-600">{saleError}</p>}
          </div>

          <ReceiptPreview receipt={lastReceipt} />
        </section>
      </div>
    </div>
  );
}
