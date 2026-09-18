"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Expand,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Utensils,
  UserRound,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import type {
  CardAttempt,
  PosReceipt,
  PosShift,
  SalePaymentLine,
} from "@mgl/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrg } from "@/components/org/OrgContext";
import {
  cancelRestaurantQPayInvoice,
  chargeRestaurantClientBridge,
  createRestaurantCardAttempt,
  createRestaurantCardSale,
  createRestaurantCashSale,
  createRestaurantQPayInvoice,
  createRestaurantQPaySale,
  getCurrentRestaurantPosShift,
  getRestaurantCardAttemptStatus,
  getRestaurantPosProducts,
  getRestaurantPosRegisters,
  getRestaurantQPayInvoiceStatus,
  openRestaurantPosShift,
  saveRestaurantTicket,
  submitRestaurantClientBridgeResult,
  type RestaurantPosProduct,
  type RestaurantPosQPayInvoice,
  type RestaurantPosRegister,
  type RestaurantTicket,
} from "@/lib/restaurant-pos-api";
import {
  attachEbarimtReceipt,
  issueLocalEbarimtReceipt,
  lookupEbarimtTin,
  mapEbarimtPayload,
  sendLocalEbarimtData,
  type AttachEbarimtPayload,
  type EbarimtBuyer,
  type EbarimtTinLookupResult,
} from "@/lib/ebarimt";
import { formatRestaurantOrderNumber } from "@/lib/restaurant-order-number";

type Screen =
  | "welcome"
  | "menu"
  | "checkout"
  | "payment"
  | "card"
  | "success";
type OrderMode = "DINE_IN" | "TO_GO";
type PaymentMethod = "QPAY" | "CARD" | "CASH";
type Category =
  | "ALL"
  | "HOT"
  | "COLD"
  | "SOUP"
  | "GRILL"
  | "APPETIZER"
  | "DESSERT"
  | "DRINK"
  | "OTHER";

type CartLine = {
  product: RestaurantPosProduct;
  qty: number;
};

type PendingCheckout = {
  ticket: RestaurantTicket;
  invoice: RestaurantPosQPayInvoice;
  clientSaleId: string;
  shiftId: string;
  total: number;
  lines: CartLine[];
  ebarimtBuyer: EbarimtBuyer;
};

type PendingCardCheckout = Omit<PendingCheckout, "invoice"> & {
  cardAttempt: CardAttempt;
};

const REGISTER_STORAGE_KEY = "org_restaurant_pos_register_id";
const MENU_REFRESH_INTERVAL_MS = 15_000;
const EBARIMT_ENABLED = process.env.NEXT_PUBLIC_EBARIMT_ENABLED === "true";
const DEMO_CASH_PAYMENT_ENABLED = process.env.NODE_ENV !== "production";
const LONG_RUNNING_CARD_PROVIDERS = new Set([
  "PUSH_ECR",
  "MINU_AGENT",
  "ANDROID_PGW",
]);

function reconcileCartWithProducts(
  current: CartLine[],
  products: RestaurantPosProduct[],
) {
  if (current.length === 0) {
    return { cart: current, changed: false, notice: "" };
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  let removedCount = 0;
  let cappedCount = 0;
  let priceChanged = false;
  let changed = false;

  const cart = current.flatMap<CartLine>((line) => {
    const product = productsById.get(line.product.id);
    const availableQty = Math.max(0, Math.floor(Number(product?.stockQty) || 0));

    if (
      !product ||
      !product.isActive ||
      Number(product.price) <= 0 ||
      availableQty <= 0
    ) {
      removedCount += 1;
      changed = true;
      return [];
    }

    const qty = Math.min(line.qty, availableQty);
    if (qty !== line.qty) {
      cappedCount += 1;
      changed = true;
    }
    if (Number(product.price) !== Number(line.product.price)) {
      priceChanged = true;
      changed = true;
    }
    if (product !== line.product) changed = true;

    return [{ product, qty }];
  });

  const notices = [
    removedCount > 0
      ? `${removedCount} бүтээгдэхүүн дууссан тул сагснаас хасагдлаа.`
      : "",
    cappedCount > 0
      ? `${cappedCount} бүтээгдэхүүний тоог шинэ үлдэгдэлд таарууллаа.`
      : "",
    priceChanged ? "Бүтээгдэхүүний шинэ үнэ сагсанд туслаа." : "",
  ].filter(Boolean);

  return { cart, changed, notice: notices.join(" ") };
}

async function loadSelfServiceProducts(branchId: string) {
  const products = await getRestaurantPosProducts(branchId, {
    restaurantMenuOnly: false,
  });
  return products.filter(
    (product) => product.isActive && Number(product.price) > 0,
  );
}

const getEffectiveCardProvider = (register?: RestaurantPosRegister | null) =>
  register?.cardProviderType ||
  (register?.minuAgentEnabled ? "MINU_AGENT" : null);

const categoryCopy: Record<Category, string> = {
  ALL: "Бүгд",
  HOT: "Халуун хоол",
  COLD: "Хүйтэн хоол",
  SOUP: "Шөл",
  GRILL: "Грилл",
  APPETIZER: "Зууш",
  DESSERT: "Амттан",
  DRINK: "Ундаа",
  OTHER: "Бусад",
};

const categoryOrder: Category[] = [
  "ALL",
  "HOT",
  "SOUP",
  "GRILL",
  "APPETIZER",
  "COLD",
  "DESSERT",
  "DRINK",
  "OTHER",
];

const moneyFormatter = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});

const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;

const escapePrintHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatPrintDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function printSelfServiceReceipt(
  receipt: PosReceipt,
  context: {
    organizationName: string;
    registerName: string;
    orderLabel: string;
    ticketNo: string;
    qrMarkup: string;
  },
) {
  if (typeof document === "undefined") return false;

  const ebarimt =
    receipt.ebarimt?.status === "SUCCESS" ? receipt.ebarimt : null;
  const isDemo = ebarimt?.billId?.startsWith("TEST-") === true;
  const paymentLabel =
    String(receipt.paymentMethod).toUpperCase() === "CARD"
      ? "Карт"
      : String(receipt.paymentMethod).toUpperCase() === "CASH"
        ? "Тест төлбөр"
        : "QR";
  const lineRows = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapePrintHtml(line.name)}</strong>
            <div class="muted">${line.qty} × ${escapePrintHtml(formatMoney(line.unitPrice))}</div>
          </td>
          <td class="amount">${escapePrintHtml(formatMoney(line.lineTotal))}</td>
        </tr>`,
    )
    .join("");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  const cleanup = () => window.setTimeout(() => iframe.remove(), 1_500);
  iframe.onload = () => {
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      cleanup();
      return;
    }
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      cleanup();
    }, 100);
  };

  iframe.srcdoc = `<!doctype html>
    <html lang="mn">
      <head>
        <meta charset="utf-8" />
        <title>${escapePrintHtml(receipt.receiptNo)}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          * { box-sizing: border-box; }
          body { width: 74mm; margin: 0 auto; color: #000; background: #fff; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.35; }
          h1 { margin: 0; text-align: center; font-size: 17px; }
          .center { text-align: center; }
          .muted { color: #333; font-size: 10px; }
          .demo { margin: 6px 0; padding: 5px; border: 2px solid #000; text-align: center; font-size: 13px; font-weight: 800; }
          .order-number { margin-top: 8px; padding: 8px 4px; border: 2px solid #000; text-align: center; }
          .order-number strong { display: block; font-size: 23px; line-height: 1.1; letter-spacing: .5px; }
          .meta, .ebarimt { margin-top: 8px; padding: 7px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
          .row, .total { display: flex; justify-content: space-between; gap: 8px; }
          table { width: 100%; margin-top: 5px; border-collapse: collapse; }
          td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #777; }
          .amount { width: 32%; text-align: right; white-space: nowrap; font-weight: 700; }
          .totals { margin-top: 7px; }
          .total { margin-top: 3px; }
          .grand { margin-top: 6px; padding-top: 6px; border-top: 2px solid #000; font-size: 15px; font-weight: 800; }
          .qr { margin-top: 8px; text-align: center; }
          .qr svg { width: 38mm; height: 38mm; }
          .qr-fallback { overflow-wrap: anywhere; font-family: monospace; font-size: 8px; }
          .footer { margin-top: 10px; text-align: center; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${escapePrintHtml(context.organizationName)}</h1>
        <div class="center muted">${escapePrintHtml(receipt.branchName)} · ${escapePrintHtml(context.registerName)}</div>
        ${isDemo ? '<div class="demo">ТЕСТИЙН БАРИМТ</div>' : ""}
        <div class="order-number">
          <strong>Захиалга №${escapePrintHtml(context.ticketNo)}</strong>
        </div>
        <div class="meta">
          <div class="row"><span>Баримт:</span><span>${escapePrintHtml(receipt.receiptNo)}</span></div>
          <div class="row"><span>Огноо:</span><span>${escapePrintHtml(formatPrintDate(receipt.createdAt))}</span></div>
          <div class="row"><span>Төрөл:</span><span>${escapePrintHtml(context.orderLabel)}</span></div>
          <div class="row"><span>Төлбөр:</span><span>${paymentLabel}</span></div>
        </div>
        <table><tbody>${lineRows}</tbody></table>
        <div class="totals">
          <div class="total"><span>Дүн:</span><span>${escapePrintHtml(formatMoney(receipt.subTotal))}</span></div>
          ${receipt.discountTotal > 0 ? `<div class="total"><span>Хөнгөлөлт:</span><span>-${escapePrintHtml(formatMoney(receipt.discountTotal))}</span></div>` : ""}
          ${receipt.taxTotal > 0 ? `<div class="total"><span>Үүнд НӨАТ:</span><span>${escapePrintHtml(formatMoney(receipt.taxTotal))}</span></div>` : ""}
          <div class="total grand"><span>НИЙТ:</span><span>${escapePrintHtml(formatMoney(receipt.grandTotal))}</span></div>
        </div>
        ${
          ebarimt
            ? `<div class="ebarimt">
                <div class="center"><strong>${ebarimt.receiptType === "B2B" ? "БАЙГУУЛЛАГЫН EBARIMT" : "ХУВЬ ХҮНИЙ EBARIMT"}</strong></div>
                ${ebarimt.customerRegNo ? `<div class="row"><span>Регистр:</span><span>${escapePrintHtml(ebarimt.customerRegNo)}</span></div>` : ""}
                ${ebarimt.billId ? `<div class="row"><span>ДДТД:</span><span>${escapePrintHtml(ebarimt.billId)}</span></div>` : ""}
                ${ebarimt.lottery ? `<div class="row"><span>Сугалаа:</span><span>${escapePrintHtml(ebarimt.lottery)}</span></div>` : ""}
                <div class="qr">${context.qrMarkup || `<div class="qr-fallback">${escapePrintHtml(ebarimt.qrData)}</div>`}</div>
              </div>`
            : `<div class="ebarimt center">
                <strong>ЗАХИАЛГЫН БАРИМТ</strong>
                <div class="muted">Ebarimt биш</div>
              </div>`
        }
        <div class="footer">Үйлчлүүлсэнд баярлалаа</div>
      </body>
    </html>`;

  document.body.appendChild(iframe);
  return true;
}

const productCategory = (product: RestaurantPosProduct): Category =>
  product.menuCategory || (product.kitchenStation === "BAR" ? "DRINK" : "OTHER");

const createClientSaleId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `self-service-${crypto.randomUUID()}`;
  }
  return `self-service-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function SetupState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f3f5f2] px-6 text-[#11231d]">
      <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,35,29,0.10)]">
        {loading ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#13795b]" />
            <h1 className="mt-5 text-xl font-black">Кассыг бэлдэж байна</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Бүтээгдэхүүн болон төлбөрийн тохиргоог ачаалж байна.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Store className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-xl font-black">Касс ажиллахад бэлэн биш байна</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              {error}
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#11231d] px-5 text-sm font-black text-white transition hover:bg-[#1b382f]"
              >
                <RefreshCw className="h-4 w-4" />
                Дахин шалгах
              </button>
              <Link
                href="/dashboard/settings"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Кассын тохиргоо
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export function SelfServiceCheckoutScreen() {
  const { user } = useOrg();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [orderMode, setOrderMode] = useState<OrderMode | null>(null);
  const [register, setRegister] = useState<RestaurantPosRegister | null>(null);
  const [shift, setShift] = useState<PosShift | null>(null);
  const [products, setProducts] = useState<RestaurantPosProduct[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("QPAY");
  const [ebarimtBuyerMode, setEbarimtBuyerMode] =
    useState<"B2C" | "B2B">("B2C");
  const [companyRegNo, setCompanyRegNo] = useState("");
  const [companyLookup, setCompanyLookup] =
    useState<EbarimtTinLookupResult | null>(null);
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [companyLookupError, setCompanyLookupError] = useState("");
  const [ebarimtSubmitting, setEbarimtSubmitting] = useState(false);
  const [completedEbarimtBuyer, setCompletedEbarimtBuyer] =
    useState<EbarimtBuyer>({ type: "B2C" });
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [actionError, setActionError] = useState("");
  const [catalogNotice, setCatalogNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pendingCheckout, setPendingCheckout] =
    useState<PendingCheckout | null>(null);
  const [pendingCardCheckout, setPendingCardCheckout] =
    useState<PendingCardCheckout | null>(null);
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [completedTicketNo, setCompletedTicketNo] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [secondsToReset, setSecondsToReset] = useState(30);
  const [silentPrintEnabled, setSilentPrintEnabled] = useState(false);
  const finalizedInvoiceRef = useRef<string | null>(null);
  const cancellingInvoiceRef = useRef<string | null>(null);
  const finalizedCardAttemptRef = useRef<string | null>(null);
  const ebarimtQrRef = useRef<HTMLDivElement | null>(null);
  const autoPrintedReceiptRef = useRef<string | null>(null);
  const menuRefreshInFlightRef = useRef(false);

  const loadSetup = useCallback(async () => {
    setSetupLoading(true);
    setSetupError("");
    try {
      const [registers, currentShift] = await Promise.all([
        getRestaurantPosRegisters(),
        getCurrentRestaurantPosShift(),
      ]);

      if (registers.length === 0) {
        throw new Error("Энэ байгууллагад идэвхтэй POS register алга байна.");
      }
      const savedRegisterId = window.localStorage.getItem(REGISTER_STORAGE_KEY);
      const nextRegister =
        registers.find((item) => item.id === currentShift?.registerId) ||
        registers.find(
          (item) => item.id === savedRegisterId && item.qpayEnabled,
        ) ||
        registers.find((item) => item.qpayEnabled) ||
        registers[0];

      window.localStorage.setItem(REGISTER_STORAGE_KEY, nextRegister.id);

      const nextProducts = await loadSelfServiceProducts(
        nextRegister.branchId,
      );

      setRegister(nextRegister);
      setShift(currentShift?.status === "OPEN" ? currentShift : null);
      setProducts(nextProducts);
    } catch (error) {
      setRegister(null);
      setShift(null);
      setProducts([]);
      setSetupError(
        error instanceof Error
          ? error.message
          : "Кассын тохиргоог ачаалж чадсангүй.",
      );
    } finally {
      setSetupLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSilentPrintEnabled(params.get("silentPrint") === "1");
  }, []);

  const refreshMenuProducts = useCallback(async () => {
    if (!register?.branchId || menuRefreshInFlightRef.current) return;

    menuRefreshInFlightRef.current = true;
    try {
      const nextProducts = await loadSelfServiceProducts(register.branchId);
      setProducts(nextProducts);
      setCatalogNotice((current) =>
        current.startsWith("Менюг шинэчилж чадсангүй") ? "" : current,
      );
    } catch {
      setCatalogNotice(
        "Менюг шинэчилж чадсангүй. Сүлжээний холболтыг шалгана уу.",
      );
    } finally {
      menuRefreshInFlightRef.current = false;
    }
  }, [register?.branchId]);

  useEffect(() => {
    if (
      !register?.branchId ||
      !["welcome", "menu", "checkout"].includes(screen)
    ) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshMenuProducts();
      }
    };
    const refreshTimer = window.setInterval(
      refreshWhenVisible,
      MENU_REFRESH_INTERVAL_MS,
    );

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [refreshMenuProducts, register?.branchId, screen]);

  useEffect(() => {
    if (setupLoading || (screen !== "menu" && screen !== "checkout")) return;

    const reconciled = reconcileCartWithProducts(cart, products);
    if (!reconciled.changed) return;

    setCart(reconciled.cart);
    if (reconciled.notice) setCatalogNotice(reconciled.notice);
  }, [cart, products, screen, setupLoading]);

  useEffect(() => {
    if (!catalogNotice) return;
    const timer = window.setTimeout(() => setCatalogNotice(""), 8_000);
    return () => window.clearTimeout(timer);
  }, [catalogNotice]);

  const visibleCategories = useMemo(() => {
    const present = new Set(products.map(productCategory));
    return categoryOrder.filter(
      (category) => category === "ALL" || present.has(category),
    );
  }, [products]);

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory("ALL");
    }
  }, [activeCategory, visibleCategories]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("mn");
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "ALL" || productCategory(product) === activeCategory;
      const matchesSearch =
        !normalizedQuery ||
        product.name.toLocaleLowerCase("mn").includes(normalizedQuery) ||
        product.sku.toLocaleLowerCase("mn").includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, query]);

  const cartQty = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce(
    (sum, line) => sum + Number(line.product.price) * line.qty,
    0,
  );
  const cardProvider = getEffectiveCardProvider(register);
  const cardTerminalReady = Boolean(
    register?.cardEnabled &&
      cardProvider &&
      (cardProvider === "ANDROID_PGW"
        ? register.terminalBridgeUrl
        : register.cardTerminalId),
  );
  const ebarimtReady = Boolean(
    DEMO_CASH_PAYMENT_ENABLED ||
      (EBARIMT_ENABLED && register?.ebarimtEnabled),
  );

  const lookupCompanyBuyer = async (): Promise<EbarimtTinLookupResult> => {
    const normalizedRegNo = companyRegNo.replace(/\D/g, "");
    if (!/^\d{7}$/.test(normalizedRegNo)) {
      throw new Error("Байгууллагын регистр 7 оронтой байна");
    }
    if (companyLookup?.regNo === normalizedRegNo) return companyLookup;

    setCompanyLookupLoading(true);
    setCompanyLookupError("");
    try {
      const result = await lookupEbarimtTin(normalizedRegNo, register);
      setCompanyLookup(result);
      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Байгууллагын мэдээлэл шалгаж чадсангүй";
      setCompanyLookup(null);
      setCompanyLookupError(message);
      throw new Error(message);
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  const resolveEbarimtBuyer = async (): Promise<EbarimtBuyer> => {
    if (!ebarimtReady || ebarimtBuyerMode === "B2C") {
      return { type: "B2C" };
    }
    const company = await lookupCompanyBuyer();
    return {
      type: "B2B",
      regNo: company.regNo,
      tin: company.tin,
      name: company.name,
    };
  };

  const issueEbarimtForReceipt = useCallback(async (
    saleReceipt: PosReceipt,
    buyer: EbarimtBuyer,
    fallbackPayment: SalePaymentLine,
  ): Promise<PosReceipt> => {
    if (!ebarimtReady) return saleReceipt;

    setEbarimtSubmitting(true);
    try {
      const ebarimtPayload = await issueLocalEbarimtReceipt(
        saleReceipt,
        saleReceipt.paymentBreakdown?.length
          ? saleReceipt.paymentBreakdown
          : [fallbackPayment],
        register,
        buyer,
      );
      let finalReceipt: PosReceipt = {
        ...saleReceipt,
        ebarimt: mapEbarimtPayload(ebarimtPayload),
      };
      try {
        const saved = await attachEbarimtReceipt(
          saleReceipt.id,
          ebarimtPayload,
        );
        finalReceipt = {
          ...finalReceipt,
          ebarimt: saved.ebarimt || finalReceipt.ebarimt,
        };
      } catch (error) {
        console.warn(
          "Self-service eBarimt was issued but could not be attached to the sale",
          error,
        );
      }
      void sendLocalEbarimtData(register).catch((error) => {
        console.warn("Self-service eBarimt sendData failed", error);
      });
      return finalReceipt;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "eBarimt баримт үүсгэж чадсангүй";

      if (
        DEMO_CASH_PAYMENT_ENABLED &&
        String(fallbackPayment.method).toUpperCase() === "CASH"
      ) {
        const testId = `TEST-${
          saleReceipt.receiptNo.replace(/[^a-z0-9]/gi, "").slice(-20) ||
          Date.now()
        }`;
        const testPayload: AttachEbarimtPayload = {
          status: "SUCCESS",
          billId: testId,
          receiptId: testId,
          qrData: [
            "MGLSTORE",
            "TEST_EBARIMT",
            testId,
            saleReceipt.grandTotal,
            buyer.type,
          ].join("|"),
          lottery: "TEST",
          date: new Date().toISOString(),
          receiptType: buyer.type,
          customerName: buyer.type === "B2B" ? buyer.name : null,
          customerTin: buyer.type === "B2B" ? buyer.tin : null,
          customerRegNo: buyer.type === "B2B" ? buyer.regNo : null,
          payload: { demo: true, posApiError: errorMessage },
        };
        console.warn(
          "Using a development-only test Ebarimt because PosAPI rejected the demo cash sale",
          error,
        );
        return {
          ...saleReceipt,
          ebarimt: mapEbarimtPayload(testPayload),
        };
      }

      const failedPayload: AttachEbarimtPayload = {
        status: "FAILED",
        error: errorMessage,
        receiptType: buyer.type,
        customerName: buyer.type === "B2B" ? buyer.name : null,
        customerTin: buyer.type === "B2B" ? buyer.tin : null,
        customerRegNo: buyer.type === "B2B" ? buyer.regNo : null,
      };
      await attachEbarimtReceipt(saleReceipt.id, failedPayload).catch(() => null);
      return {
        ...saleReceipt,
        ebarimt: mapEbarimtPayload(failedPayload),
      };
    } finally {
      setEbarimtSubmitting(false);
    }
  }, [ebarimtReady, register]);

  const retryEbarimt = async () => {
    if (!receipt || !ebarimtReady || ebarimtSubmitting) return;
    setSecondsToReset(30);
    const receiptPaymentMethod = String(receipt.paymentMethod).toUpperCase();
    const fallbackMethod =
      receiptPaymentMethod === "CASH"
        ? "CASH"
        : receiptPaymentMethod === "CARD"
          ? "CARD"
          : "QR";
    const nextReceipt = await issueEbarimtForReceipt(
      receipt,
      completedEbarimtBuyer,
      {
        method: fallbackMethod,
        amount: receipt.grandTotal,
      },
    );
    setReceipt(nextReceipt);
  };

  const resetOrder = useCallback(
    (options?: { reload?: boolean }) => {
      setScreen("welcome");
      setOrderMode(null);
      setActiveCategory("ALL");
      setQuery("");
      setCart([]);
      setPaymentMethod("QPAY");
      setEbarimtBuyerMode("B2C");
      setCompanyRegNo("");
      setCompanyLookup(null);
      setCompanyLookupError("");
      setCompanyLookupLoading(false);
      setEbarimtSubmitting(false);
      setCompletedEbarimtBuyer({ type: "B2C" });
      setActionError("");
      setCatalogNotice("");
      setPendingCheckout(null);
      setPendingCardCheckout(null);
      setReceipt(null);
      setCompletedTicketNo("");
      setCardMessage("");
      setSecondsToReset(30);
      finalizedInvoiceRef.current = null;
      cancellingInvoiceRef.current = null;
      finalizedCardAttemptRef.current = null;
      autoPrintedReceiptRef.current = null;
      if (options?.reload) void loadSetup();
    },
    [loadSetup],
  );

  const printCompletedReceipt = useCallback(
    (targetReceipt: PosReceipt) =>
      printSelfServiceReceipt(targetReceipt, {
        organizationName: user.organizationName || "MGL Store",
        registerName: register?.label || register?.name || "Self service",
        orderLabel: orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах",
        ticketNo: formatRestaurantOrderNumber(
          completedTicketNo || targetReceipt.receiptNo,
          targetReceipt.id,
        ),
        qrMarkup:
          ebarimtQrRef.current?.querySelector("svg")?.outerHTML || "",
      }),
    [completedTicketNo, orderMode, register, user.organizationName],
  );

  useEffect(() => {
    if (!silentPrintEnabled || screen !== "success" || !receipt) {
      return;
    }
    const successfulEbarimt =
      receipt.ebarimt?.status === "SUCCESS" ? receipt.ebarimt : null;
    const printKey = successfulEbarimt
      ? successfulEbarimt.billId ||
        successfulEbarimt.receiptId ||
        `ebarimt-${receipt.id}`
      : `order-${receipt.id}-${receipt.receiptNo}`;
    if (autoPrintedReceiptRef.current === printKey) return;

    const timer = window.setTimeout(() => {
      autoPrintedReceiptRef.current = printKey;
      printCompletedReceipt(receipt);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [printCompletedReceipt, receipt, screen, silentPrintEnabled]);

  useEffect(() => {
    if (screen !== "success") return;
    setSecondsToReset(30);
    const timer = window.setInterval(() => {
      setSecondsToReset((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          resetOrder({ reload: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetOrder, screen]);

  const chooseMode = (mode: OrderMode) => {
    setActionError("");
    setOrderMode(mode);
    setScreen("menu");
  };

  const addProduct = (product: RestaurantPosProduct) => {
    setActionError("");
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQty) return current;
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line,
        );
      }
      if (product.stockQty <= 0) return current;
      return [...current, { product, qty: 1 }];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? {
                ...line,
                qty: Math.max(
                  0,
                  Math.min(line.product.stockQty, line.qty + delta),
                ),
              }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setActionError("");
    setScreen("checkout");
  };

  const cleanupDraftTicket = useCallback(
    async (checkout: PendingCheckout) => {
      if (!register || checkout.ticket.status !== "OPEN") return;
      try {
        await saveRestaurantTicket({
          branchId: register.branchId,
          shiftId: checkout.shiftId,
          ticketId: checkout.ticket.id,
          source: "SELF_SERVICE",
          orderMode: orderMode || "TO_GO",
          lines: [],
        });
      } catch {
        // Draft cleanup is best-effort. The POS can clear it if it was changed elsewhere.
      }
    },
    [orderMode, register],
  );

  const authorizeCardPayment = async (amount: number): Promise<CardAttempt> => {
    if (!register || !user.organizationId || !cardTerminalReady || !cardProvider) {
      throw new Error(
        "Картын терминал тохируулагдаагүй байна. Ресторан кассын тохиргооноос терминалаа холбоно уу.",
      );
    }

    const terminalId = register.cardTerminalId || "terminal-1";
    const useClientBridge =
      cardProvider === "ANDROID_PGW" && Boolean(register.terminalBridgeUrl);
    const shouldSendBridgeUrl =
      Boolean(register.terminalBridgeUrl) &&
      cardProvider !== "MINU_AGENT" &&
      cardProvider !== "PUSH_ECR";

    setCardMessage(
      cardProvider === "ANDROID_PGW"
        ? "Картын терминал руу төлбөр илгээж байна..."
        : "Терминал дээр картаа уншуулна уу...",
    );

    const attempt = await createRestaurantCardAttempt({
      amount,
      terminalId,
      bridgeUrl: shouldSendBridgeUrl ? register.terminalBridgeUrl : null,
      registerId: register.id,
      organizationId: user.organizationId,
      clientBridge: useClientBridge,
    });

    let approvedAttempt = attempt;
    if (useClientBridge) {
      try {
        const bridgeResult = await chargeRestaurantClientBridge({
          bridgeUrl: register.terminalBridgeUrl!,
          attemptId: attempt.attemptId,
          amount,
          terminalId,
        });
        approvedAttempt = await submitRestaurantClientBridgeResult({
          attemptId: attempt.attemptId,
          result: bridgeResult,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Картын терминалтай холбогдож чадсангүй.";
        await submitRestaurantClientBridgeResult({
          attemptId: attempt.attemptId,
          result: { status: "FAILED", message },
        }).catch(() => null);
        throw new Error(message);
      }
    } else {
      const maxPolls = LONG_RUNNING_CARD_PROVIDERS.has(cardProvider) ? 150 : 8;
      for (let index = 0; index < maxPolls; index += 1) {
        if (approvedAttempt.status === "APPROVED") break;
        if (
          approvedAttempt.status === "DECLINED" ||
          approvedAttempt.status === "FAILED"
        ) {
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 800));
        approvedAttempt = await getRestaurantCardAttemptStatus(
          attempt.attemptId,
        );
      }
    }

    if (approvedAttempt.status !== "APPROVED") {
      throw new Error(
        approvedAttempt.message ||
          (approvedAttempt.status === "PENDING"
            ? "Терминалын төлбөр баталгаажаагүй байна."
            : "Картын төлбөр амжилтгүй боллоо."),
      );
    }

    setCardMessage("Картын төлбөр баталгаажлаа. Захиалгыг бүртгэж байна...");
    return approvedAttempt;
  };

  const finalizeCardPayment = async (checkout: PendingCardCheckout) => {
    if (
      finalizedCardAttemptRef.current === checkout.cardAttempt.attemptId ||
      !register ||
      !user.organizationId ||
      !orderMode
    ) {
      return;
    }

    finalizedCardAttemptRef.current = checkout.cardAttempt.attemptId;
    setSubmitting(true);
    setActionError("");
    setCardMessage("Картын төлбөр баталгаажлаа. Захиалгыг бүртгэж байна...");
    try {
      const saleReceipt = await createRestaurantCardSale({
        shiftId: checkout.shiftId,
        branchId: register.branchId,
        registerId: register.id,
        organizationId: user.organizationId,
        restaurantTicketId: checkout.ticket.id,
        clientSaleId: checkout.clientSaleId,
        total: checkout.total,
        note: `Өөртөө үйлчлэх касс · ${orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}`,
        lines: checkout.lines.map((line) => ({
          productId: line.product.id,
          qty: line.qty,
          unitPrice: Number(line.product.price),
          discountAmount: 0,
          taxRate: Number(line.product.taxRate) || 0,
        })),
        cardAttemptId: checkout.cardAttempt.attemptId,
        cardTransactionId: checkout.cardAttempt.transactionId,
      });

      setCompletedEbarimtBuyer(checkout.ebarimtBuyer);
      setCardMessage(
        ebarimtReady
          ? "Төлбөр баталгаажлаа. Ebarimt үүсгэж байна..."
          : "Төлбөр баталгаажлаа.",
      );
      const finalReceipt = await issueEbarimtForReceipt(
        saleReceipt,
        checkout.ebarimtBuyer,
        {
          method: "CARD",
          amount: checkout.total,
          attemptId: checkout.cardAttempt.attemptId,
          transactionId: checkout.cardAttempt.transactionId,
        },
      );

      setCompletedTicketNo(checkout.ticket.ticketNo);
      setReceipt(finalReceipt);
      setScreen("success");
    } catch (error) {
      finalizedCardAttemptRef.current = null;
      setActionError(
        error instanceof Error
          ? error.message
          : "Карт төлөгдсөн боловч захиалгыг бүртгэж чадсангүй.",
      );
      setCardMessage("Картын төлбөр баталгаажсан.");
      setScreen("card");
    } finally {
      setSubmitting(false);
    }
  };

  const startPayment = async () => {
    if (
      !register ||
      !user.organizationId ||
      !orderMode ||
      cart.length === 0 ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    let activeShift = shift;
    let savedTicket: RestaurantTicket | null = null;
    try {
      const ebarimtBuyer = await resolveEbarimtBuyer();
      setCompletedEbarimtBuyer(ebarimtBuyer);

      // Sales remain traceable in the POS data model, but kiosk users never
      // need to see or manually manage this internal session.
      if (!activeShift || activeShift.status !== "OPEN") {
        activeShift = await openRestaurantPosShift({
          branchId: register.branchId,
          registerId: register.id,
          openingCash: 0,
        });
        setShift(activeShift);
      }

      savedTicket = await saveRestaurantTicket({
        branchId: register.branchId,
        shiftId: activeShift.id,
        source: "SELF_SERVICE",
        orderMode,
        note: `Өөртөө үйлчлэх касс · ${orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}`,
        lines: cart.map((line) => ({
          productId: line.product.id,
          qty: line.qty,
        })),
      });
      if (!savedTicket) throw new Error("Захиалгын ticket үүссэнгүй.");

      const clientSaleId = createClientSaleId();

      if (paymentMethod === "CASH" && DEMO_CASH_PAYMENT_ENABLED) {
        const saleReceipt = await createRestaurantCashSale({
          shiftId: activeShift.id,
          branchId: register.branchId,
          registerId: register.id,
          organizationId: user.organizationId,
          restaurantTicketId: savedTicket.id,
          clientSaleId,
          total: cartTotal,
          note: `Өөртөө үйлчлэх касс · Тест борлуулалт · ${
            orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"
          }`,
          lines: cart.map((line) => ({
            productId: line.product.id,
            qty: line.qty,
            unitPrice: Number(line.product.price),
            discountAmount: 0,
            taxRate: Number(line.product.taxRate) || 0,
          })),
        });
        setCompletedEbarimtBuyer(ebarimtBuyer);
        const finalReceipt = await issueEbarimtForReceipt(
          saleReceipt,
          ebarimtBuyer,
          { method: "CASH", amount: cartTotal },
        );
        setCompletedTicketNo(savedTicket.ticketNo);
        setReceipt(finalReceipt);
        setScreen("success");
        return;
      }

      if (paymentMethod === "CARD") {
        setScreen("card");
        const cardAttempt = await authorizeCardPayment(cartTotal);
        const cardCheckout: PendingCardCheckout = {
          ticket: savedTicket,
          clientSaleId,
          shiftId: activeShift.id,
          total: cartTotal,
          lines: cart.map((line) => ({ ...line })),
          cardAttempt,
          ebarimtBuyer,
        };
        setPendingCardCheckout(cardCheckout);
        await finalizeCardPayment(cardCheckout);
        return;
      }

      const invoice = await createRestaurantQPayInvoice({
        amount: cartTotal,
        registerId: register.id,
        organizationId: user.organizationId,
      });
      const checkout: PendingCheckout = {
        ticket: savedTicket,
        invoice,
        clientSaleId,
        shiftId: activeShift.id,
        total: cartTotal,
        lines: cart.map((line) => ({ ...line })),
        ebarimtBuyer,
      };
      setPendingCheckout(checkout);
      setScreen("payment");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : paymentMethod === "CARD"
            ? "Картын төлбөр хийж чадсангүй."
            : paymentMethod === "CASH"
              ? "Тест борлуулалт үүсгэж чадсангүй."
              : "QPay төлбөр үүсгэж чадсангүй.",
      );
      if (paymentMethod === "CARD") setScreen("checkout");
      if (savedTicket && activeShift) {
        await cleanupDraftTicket({
          ticket: savedTicket,
          invoice: {
            invoiceId: "",
            amount: cartTotal,
            qrText: "",
            status: "EXPIRED",
            expiresAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          clientSaleId: createClientSaleId(),
          shiftId: activeShift.id,
          total: cartTotal,
          lines: cart,
          ebarimtBuyer: { type: "B2C" },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finalizePayment = useCallback(
    async (
      checkout: PendingCheckout,
      paidInvoice: RestaurantPosQPayInvoice,
    ) => {
      if (
        finalizedInvoiceRef.current === paidInvoice.invoiceId ||
        !register ||
        !user.organizationId ||
        !orderMode
      ) {
        return;
      }

      finalizedInvoiceRef.current = paidInvoice.invoiceId;
      setSubmitting(true);
      setActionError("");
      try {
        const saleReceipt = await createRestaurantQPaySale({
          shiftId: checkout.shiftId,
          branchId: register.branchId,
          registerId: register.id,
          organizationId: user.organizationId,
          restaurantTicketId: checkout.ticket.id,
          clientSaleId: checkout.clientSaleId,
          total: checkout.total,
          qpayInvoiceId: paidInvoice.invoiceId,
          note: `Өөртөө үйлчлэх касс · ${orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}`,
          lines: checkout.lines.map((line) => ({
            productId: line.product.id,
            qty: line.qty,
            unitPrice: Number(line.product.price),
            discountAmount: 0,
            taxRate: Number(line.product.taxRate) || 0,
          })),
        });

        setCompletedEbarimtBuyer(checkout.ebarimtBuyer);
        const finalReceipt = await issueEbarimtForReceipt(
          saleReceipt,
          checkout.ebarimtBuyer,
          {
            method: "QR",
            amount: checkout.total,
            invoiceId: paidInvoice.invoiceId,
          },
        );

        setReceipt(finalReceipt);
        setCompletedTicketNo(checkout.ticket.ticketNo);
        setPendingCheckout((current) =>
          current
            ? { ...current, invoice: { ...current.invoice, ...paidInvoice } }
            : current,
        );
        setScreen("success");
      } catch (error) {
        finalizedInvoiceRef.current = null;
        setActionError(
          error instanceof Error
            ? error.message
            : "Төлбөрийг борлуулалт болгон бүртгэж чадсангүй.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [issueEbarimtForReceipt, orderMode, register, user.organizationId],
  );

  const checkPayment = useCallback(
    async (silent = false) => {
      if (!pendingCheckout || pendingCheckout.invoice.status !== "PENDING") {
        return;
      }
      const invoiceId = pendingCheckout.invoice.invoiceId;
      if (cancellingInvoiceRef.current === invoiceId) return;
      if (!silent) setCheckingPayment(true);
      try {
        const status = await getRestaurantQPayInvoiceStatus(
          invoiceId,
          { refreshProvider: !silent },
        );
        if (cancellingInvoiceRef.current === invoiceId) return;
        const nextInvoice = { ...pendingCheckout.invoice, ...status };
        const nextCheckout = { ...pendingCheckout, invoice: nextInvoice };
        if (nextInvoice.status === "PAID") {
          setPendingCheckout(nextCheckout);
          await finalizePayment(nextCheckout, nextInvoice);
        } else if (nextInvoice.status === "EXPIRED") {
          setPendingCheckout(nextCheckout);
          setActionError(
            "QR төлбөрийн хугацаа дууслаа. Доорх товчоор шинэ QR үүсгэнэ үү.",
          );
        }
      } catch (error) {
        if (!silent) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Төлбөрийн төлөв шалгаж чадсангүй.",
          );
        }
      } finally {
        if (!silent) setCheckingPayment(false);
      }
    },
    [finalizePayment, pendingCheckout],
  );

  useEffect(() => {
    if (!pendingCheckout || pendingCheckout.invoice.status !== "PENDING") return;
    void checkPayment(true);
    const timer = window.setInterval(() => void checkPayment(true), 3000);
    return () => window.clearInterval(timer);
  }, [checkPayment, pendingCheckout]);

  const retryPayment = async () => {
    if (!pendingCheckout || !register || !user.organizationId || submitting) return;
    setSubmitting(true);
    setActionError("");
    try {
      const invoice = await createRestaurantQPayInvoice({
        amount: pendingCheckout.total,
        registerId: register.id,
        organizationId: user.organizationId,
      });
      finalizedInvoiceRef.current = null;
      setPendingCheckout({ ...pendingCheckout, invoice });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Шинэ QR үүсгэж чадсангүй.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const leaveExpiredPayment = async () => {
    if (!pendingCheckout || pendingCheckout.invoice.status === "PENDING") return;
    setSubmitting(true);
    await cleanupDraftTicket(pendingCheckout);
    setPendingCheckout(null);
    setActionError("");
    setScreen("menu");
    setSubmitting(false);
  };

  const returnToMenuFromPayment = async () => {
    if (!pendingCheckout || submitting || checkingPayment) return;
    if (pendingCheckout.invoice.status !== "PENDING") {
      await leaveExpiredPayment();
      return;
    }

    setSubmitting(true);
    setActionError("");
    const invoiceId = pendingCheckout.invoice.invoiceId;
    cancellingInvoiceRef.current = invoiceId;
    try {
      await cancelRestaurantQPayInvoice(invoiceId);
      await cleanupDraftTicket(pendingCheckout);
      finalizedInvoiceRef.current = null;
      setPendingCheckout(null);
      setScreen("menu");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "QR төлбөрийг цуцалж чадсангүй.",
      );
    } finally {
      if (cancellingInvoiceRef.current === invoiceId) {
        cancellingInvoiceRef.current = null;
      }
      setSubmitting(false);
    }
  };

  const requestFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  if (setupLoading || setupError || !register) {
    return (
      <SetupState
        loading={setupLoading}
        error={setupError}
        onRetry={() => void loadSetup()}
      />
    );
  }

  if (screen === "welcome") {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#f4f5f1] text-[#10221c]">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#dcece3] blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-[#f7e7ba] blur-3xl" />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#11231d] text-white shadow-lg shadow-emerald-950/15">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black tracking-tight">
                {user.organizationName || "MGL Store"}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                self service
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestFullscreen}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white/80 text-slate-500 transition hover:text-slate-950"
              aria-label="Бүтэн дэлгэц"
            >
              <Expand className="h-5 w-5" />
            </button>
            <Link
              href="/dashboard"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white/80 text-slate-500 transition hover:text-slate-950"
              aria-label="Удирдлага руу буцах"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-4 sm:px-10">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#13795b]/10 bg-white/80 px-4 py-2 text-xs font-black text-[#13795b] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {register.branch.name} · Касс бэлэн
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
              Тавтай морилно уу
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-slate-500 sm:text-lg">
              Захиалгын төрлөө сонгоод бүтээгдэхүүнээ өөрөө захиалаарай.
            </p>
          </div>

          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseMode("DINE_IN")}
              className="group relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-[#11231d] p-8 text-white shadow-[0_28px_60px_rgba(16,34,28,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#173229] active:scale-[0.99]"
            >
              <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/10" />
              <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-white/10 transition group-hover:scale-105">
                <Utensils className="h-9 w-9" />
              </span>
              <span className="mt-6 text-2xl font-black">Энд идэх</span>
              <span className="mt-2 text-sm font-semibold text-white/55">
                Эндээ тухтай иднэ
              </span>
              <ChevronRight className="absolute bottom-7 right-7 h-6 w-6 text-white/35" />
            </button>

            <button
              type="button"
              onClick={() => chooseMode("TO_GO")}
              className="group relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-[#d9a62e] p-8 text-[#172219] shadow-[0_28px_60px_rgba(217,166,46,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#e2b440] active:scale-[0.99]"
            >
              <span className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/15" />
              <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-white/25 transition group-hover:scale-105">
                <ShoppingBag className="h-9 w-9" />
              </span>
              <span className="mt-6 text-2xl font-black">Авч явах</span>
              <span className="mt-2 text-sm font-semibold text-black/50">
                Бэлэн болмогц авч явна
              </span>
              <ChevronRight className="absolute bottom-7 right-7 h-6 w-6 text-black/30" />
            </button>
          </div>

          {actionError ? (
            <div className="mt-6 max-w-xl rounded-2xl border border-rose-200 bg-white px-5 py-3 text-center text-sm font-bold text-rose-700 shadow-sm">
              {actionError}
            </div>
          ) : null}
        </section>

      </main>
    );
  }

  if (screen === "card") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#11231d] px-5 py-10 text-white">
        <section className="w-full max-w-xl text-center">
          <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-[32px] bg-white/10 text-[#f4c34f]">
            {submitting ? (
              <span className="absolute inset-0 animate-ping rounded-[32px] border border-[#f4c34f]/30" />
            ) : null}
            <CreditCard className="h-14 w-14" strokeWidth={1.7} />
          </div>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#f4c34f]">
            Картын төлбөр
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            {submitting ? "Картаа уншуулна уу" : "Төлбөр баталгаажсан"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-white/55">
            {cardMessage || "Терминалын дэлгэц дээрх зааврыг дагана уу."}
          </p>
          <p className="mt-8 text-4xl font-black text-[#f4c34f]">
            {formatMoney(pendingCardCheckout?.total || cartTotal)}
          </p>

          {actionError ? (
            <div className="mx-auto mt-7 max-w-md rounded-2xl border border-rose-300/20 bg-rose-300/10 px-5 py-4 text-sm font-bold leading-6 text-rose-100">
              {actionError}
            </div>
          ) : null}

          {submitting ? (
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-[#f4c34f]" />
              Терминалын хариуг хүлээж байна
            </div>
          ) : pendingCardCheckout ? (
            <button
              type="button"
              onClick={() => void finalizeCardPayment(pendingCardCheckout)}
              className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f4c34f] px-8 text-sm font-black text-[#172219]"
            >
              <RefreshCw className="h-5 w-5" />
              Захиалгыг дахин бүртгэх
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  if (screen === "payment" && pendingCheckout) {
    const expired = pendingCheckout.invoice.status === "EXPIRED";
    const paid = pendingCheckout.invoice.status === "PAID";
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#eef1ed] px-5 py-8 text-[#10221c]">
        <section className="w-full max-w-4xl overflow-hidden rounded-[36px] bg-white shadow-[0_32px_100px_rgba(16,34,28,0.13)]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col items-center justify-center bg-[#11231d] p-8 text-center text-white sm:p-12">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                <QrCode className="h-7 w-7" />
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight">
                QR код уншуулна уу
              </h1>
              <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/55">
                Банкны апп-аараа QR кодыг уншуулж төлбөрөө баталгаажуулна уу.
              </p>

              <div className="mt-7 rounded-[28px] bg-white p-4 shadow-2xl">
                <QrGenerator
                  value={pendingCheckout.invoice.qrText}
                  size={260}
                  level="M"
                  className="h-auto w-[min(60vw,260px)]"
                />
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/70">
                {expired ? (
                  <Clock3 className="h-4 w-4 text-amber-300" />
                ) : paid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                )}
                {expired
                  ? "Хугацаа дууссан"
                  : paid
                    ? "Төлбөр баталгаажсан"
                    : "Төлбөр хүлээж байна"}
              </div>
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#13795b]">
                Төлөх дүн
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {formatMoney(pendingCheckout.total)}
              </p>
              <div className="mt-7 space-y-3 border-y border-slate-100 py-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Захиалга</span>
                  <span className="font-black">
                    {formatRestaurantOrderNumber(
                      pendingCheckout.ticket.ticketNo,
                      pendingCheckout.ticket.id,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Төрөл</span>
                  <span className="font-black">
                    {orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Барааны тоо</span>
                  <span className="font-black">{cartQty}</span>
                </div>
              </div>

              {actionError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  paid
                    ? void finalizePayment(
                        pendingCheckout,
                        pendingCheckout.invoice,
                      )
                    : void checkPayment(false)
                }
                disabled={checkingPayment || submitting || expired}
                className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9a62e] px-5 text-sm font-black text-[#172219] transition hover:bg-[#e2b440] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkingPayment || submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {paid ? "Захиалга бүртгэх" : "Төлбөр шалгах"}
              </button>

              {!paid && !expired ? (
                <button
                  type="button"
                  onClick={() => void returnToMenuFromPayment()}
                  disabled={checkingPayment || submitting}
                  className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Буцах · Захиалгаа өөрчлөх
                </button>
              ) : null}

              {expired ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void leaveExpiredPayment()}
                    disabled={submitting}
                    className="h-12 rounded-2xl border border-slate-200 text-sm font-black text-slate-600"
                  >
                    Буцах
                  </button>
                  <button
                    type="button"
                    onClick={() => void retryPayment()}
                    disabled={submitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#11231d] text-sm font-black text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Шинэ QR авах
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "success" && receipt) {
    const ebarimt = receipt.ebarimt;
    const ebarimtSucceeded = ebarimt?.status === "SUCCESS";
    const isDemoEbarimt = ebarimt?.billId?.startsWith("TEST-") === true;
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#11231d] px-5 py-10 text-white">
        <section className="w-full max-w-4xl text-center">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-emerald-400 text-[#10221c] shadow-[0_0_0_16px_rgba(52,211,153,0.08)]">
            <CheckCircle2 className="h-14 w-14" strokeWidth={2.5} />
          </div>
          <h1 className="mt-9 text-4xl font-black tracking-tight sm:text-5xl">
            Төлбөр амжилттай
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-white/55">
            Таны захиалга бэлтгэгдэхээр илгээгдлээ. Доорх дугаарыг санаарай.
          </p>

          <div
            className={`mx-auto mt-8 grid max-w-3xl gap-4 ${
              ebarimt ? "sm:grid-cols-2" : "max-w-sm"
            }`}
          >
            <div className="rounded-[32px] bg-white p-7 text-[#10221c] shadow-2xl">
              <ReceiptText className="mx-auto h-7 w-7 text-[#13795b]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Захиалгын дугаар
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {formatRestaurantOrderNumber(
                  completedTicketNo ||
                    pendingCheckout?.ticket.ticketNo ||
                    receipt.receiptNo,
                  receipt.id,
                )}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-5 text-sm">
                <span className="font-semibold text-slate-500">Нийт төлсөн</span>
                <span className="text-lg font-black">
                  {formatMoney(receipt.grandTotal)}
                </span>
              </div>
            </div>

            {ebarimt ? (
              <div className="rounded-[32px] bg-white p-6 text-[#10221c] shadow-2xl">
                {ebarimtSucceeded ? (
                  <>
                    <div
                      ref={ebarimtQrRef}
                      className="mx-auto w-fit rounded-2xl border border-slate-100 bg-white p-2 shadow-sm"
                    >
                      {ebarimt.qrData ? (
                        <QrGenerator
                          value={ebarimt.qrData}
                          size={170}
                          level="M"
                          className="h-[170px] w-[170px]"
                        />
                      ) : (
                        <div className="grid h-[170px] w-[170px] place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-black">
                      {isDemoEbarimt
                        ? "Тестийн Ebarimt"
                        : ebarimt.receiptType === "B2B"
                        ? "Байгууллагын Ebarimt"
                        : "Хувь хүний Ebarimt"}
                    </p>
                    {isDemoEbarimt ? (
                      <p className="mx-auto mt-2 w-fit rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">
                        Зөвхөн дэлгэц шалгах туршилтын баримт
                      </p>
                    ) : null}
                    {ebarimt.customerRegNo ? (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Регистр: {ebarimt.customerRegNo}
                      </p>
                    ) : null}
                    {ebarimt.lottery ? (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Сугалаа: {ebarimt.lottery}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                      <ReceiptText className="h-7 w-7" />
                    </div>
                    <p className="mt-4 font-black text-rose-700">
                      Ebarimt үүссэнгүй
                    </p>
                    <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-500">
                      {ebarimt.error || "PosAPI холболтыг шалгаад дахин оролдоно уу."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void retryEbarimt()}
                      disabled={ebarimtSubmitting}
                      className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#11231d] px-5 text-xs font-black text-white disabled:opacity-50"
                    >
                      {ebarimtSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Дахин оролдох
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => printCompletedReceipt(receipt)}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Printer className="h-5 w-5" />
              {silentPrintEnabled
                ? "Дахин хэвлэх"
                : ebarimtSucceeded
                  ? "Баримт хэвлэх"
                  : "Захиалгын баримт хэвлэх"}
            </button>
            <button
              type="button"
              onClick={() => resetOrder({ reload: true })}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9a62e] px-8 text-sm font-black text-[#172219] transition hover:bg-[#e2b440]"
            >
              Шинэ захиалга
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-xs font-bold text-white/35">
            {secondsToReset} секундийн дараа эхлэх дэлгэц рүү шилжинэ
          </p>
        </section>
      </main>
    );
  }

  if (screen === "checkout") {
    return (
      <main className="min-h-[100dvh] bg-[#f3f5f2] px-4 py-5 text-[#10221c] sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setScreen("menu")}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Цэс рүү буцах
            </button>
            <p className="text-right text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              Захиалга баталгаажуулах
            </p>
          </header>

          {catalogNotice ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {catalogNotice}
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black">Таны захиалга</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                  {cartQty} бараа
                </span>
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                {cart.map((line) => (
                  <div
                    key={line.product.id}
                    className="grid grid-cols-[64px_1fr_auto] items-center gap-4 py-4"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                      {line.product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-300">
                          <PackageOpen className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {line.product.name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {formatMoney(Number(line.product.price))} × {line.qty}
                      </p>
                    </div>
                    <p className="text-sm font-black">
                      {formatMoney(Number(line.product.price) * line.qty)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="h-fit rounded-[28px] bg-[#11231d] p-6 text-white shadow-xl shadow-emerald-950/10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                Төлбөрийн мэдээлэл
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-white/55">Барааны дүн</span>
                  <span className="font-black">{formatMoney(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-white/55">Хөнгөлөлт</span>
                  <span className="font-black">0₮</span>
                </div>
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-6">
                <span className="text-sm font-bold text-white/60">Нийт төлөх</span>
                <span className="text-3xl font-black tracking-tight">
                  {formatMoney(cartTotal)}
                </span>
              </div>

              {ebarimtReady ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Ebarimt авах төрөл
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEbarimtBuyerMode("B2C");
                        setCompanyLookupError("");
                        setActionError("");
                      }}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black transition ${
                        ebarimtBuyerMode === "B2C"
                          ? "border-emerald-300 bg-emerald-300 text-[#172219]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      <UserRound className="h-4 w-4" />
                      Хувь хүн
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEbarimtBuyerMode("B2B");
                        setActionError("");
                      }}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black transition ${
                        ebarimtBuyerMode === "B2B"
                          ? "border-emerald-300 bg-emerald-300 text-[#172219]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      Байгууллага
                    </button>
                  </div>

                  {ebarimtBuyerMode === "B2B" ? (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        <input
                          inputMode="numeric"
                          maxLength={7}
                          value={companyRegNo}
                          onChange={(event) => {
                            const value = event.target.value.replace(/\D/g, "").slice(0, 7);
                            setCompanyRegNo(value);
                            setCompanyLookup(null);
                            setCompanyLookupError("");
                            setActionError("");
                          }}
                          placeholder="Регистрийн 7 орон"
                          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-emerald-300"
                        />
                        <button
                          type="button"
                          onClick={() => void lookupCompanyBuyer().catch(() => null)}
                          disabled={
                            companyLookupLoading || companyRegNo.length !== 7
                          }
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-[#172219] disabled:opacity-40"
                        >
                          {companyLookupLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Шалгах"
                          )}
                        </button>
                      </div>
                      {companyLookup ? (
                        <div className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-300/10 px-3 py-2 text-xs font-bold leading-5 text-emerald-200">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            {companyLookup.name || "Байгууллага"} · TIN {companyLookup.tin}
                          </span>
                        </div>
                      ) : null}
                      {companyLookupError ? (
                        <p className="mt-2 text-xs font-bold leading-5 text-rose-200">
                          {companyLookupError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : register.ebarimtEnabled ? (
                <p className="mt-4 rounded-xl bg-amber-300/10 px-3 py-2 text-xs font-bold leading-5 text-amber-200">
                  Ebarimt үйлчилгээний орчны тохиргоо идэвхгүй байна.
                </p>
              ) : null}

              <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Төлбөрийн хэлбэр
              </p>
              <div
                className={`mt-3 grid gap-2 ${
                  DEMO_CASH_PAYMENT_ENABLED ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("QPAY");
                    setActionError("");
                  }}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
                    paymentMethod === "QPAY"
                      ? "border-[#f4c34f] bg-[#f4c34f] text-[#172219]"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  <QrCode className="h-6 w-6" />
                  QPay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!cardTerminalReady) return;
                    setPaymentMethod("CARD");
                    setActionError("");
                  }}
                  disabled={!cardTerminalReady}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    paymentMethod === "CARD"
                      ? "border-[#f4c34f] bg-[#f4c34f] text-[#172219]"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  <CreditCard className="h-6 w-6" />
                  Карт
                </button>
                {DEMO_CASH_PAYMENT_ENABLED ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("CASH");
                      setActionError("");
                    }}
                    className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-1 text-center text-xs font-black transition ${
                      paymentMethod === "CASH"
                        ? "border-[#f4c34f] bg-[#f4c34f] text-[#172219]"
                        : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                    }`}
                  >
                    <Banknote className="h-6 w-6" />
                    Тест
                  </button>
                ) : null}
              </div>
              {!cardTerminalReady ? (
                <p className="mt-2 text-[11px] font-semibold leading-4 text-amber-200/65">
                  Карт ашиглахын тулд POS терминалаа тохируулна уу.
                </p>
              ) : null}

              {actionError ? (
                <div className="mt-5 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm font-bold leading-5 text-rose-200">
                  {actionError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void startPayment()}
                disabled={
                  submitting ||
                  companyLookupLoading ||
                  cart.length === 0 ||
                  (paymentMethod === "CARD" && !cardTerminalReady)
                }
                className="mt-6 inline-flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#d9a62e] px-5 text-base font-black text-[#172219] transition hover:bg-[#e2b440] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : paymentMethod === "CARD" ? (
                  <CreditCard className="h-5 w-5" />
                ) : paymentMethod === "CASH" ? (
                  <Banknote className="h-5 w-5" />
                ) : (
                  <QrCode className="h-5 w-5" />
                )}
                {paymentMethod === "CARD"
                  ? "Картаар төлөх"
                  : paymentMethod === "CASH"
                    ? "Тест борлуулалт үүсгэх"
                  : "QPay-аар төлөх"}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-white/35">
                <Check className="h-3.5 w-3.5" />
                Төлөгдсөний дараа захиалга шууд илгээгдэнэ
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#f5f6f3] text-[#10221c]">
      <header className="flex h-[78px] items-center gap-4 border-b border-black/5 bg-white px-4 sm:px-6">
        <button
          type="button"
          onClick={() => resetOrder()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          aria-label="Эхлэл рүү буцах"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#11231d] text-white">
            <Store className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">
              {user.organizationName || "MGL Store"}
            </p>
            <p className="truncate text-[11px] font-bold text-slate-400">
              {register.branch.name} · {orderMode === "DINE_IN" ? "Энд идэх" : "Авч явах"}
            </p>
          </div>
        </div>
        <div className="relative ml-auto hidden w-full max-w-sm sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Бүтээгдэхүүн хайх..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#13795b] focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={requestFullscreen}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500"
          aria-label="Бүтэн дэлгэц"
        >
          <Expand className="h-5 w-5" />
        </button>
      </header>

      <div className="flex h-[calc(100dvh-78px)] flex-col">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {catalogNotice ? (
            <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 sm:mx-6">
              {catalogNotice}
            </div>
          ) : null}
          <div className="border-b border-black/5 bg-white px-4 sm:px-6">
            <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`h-11 shrink-0 rounded-2xl px-5 text-sm font-black transition ${
                    activeCategory === category
                      ? "bg-[#11231d] text-white shadow-md"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {categoryCopy[category]}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-6">
            <div className="relative mb-5 sm:hidden">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Бүтээгдэхүүн хайх..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none"
              />
            </div>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  {categoryCopy[activeCategory]}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Сонгох бүтээгдэхүүн дээрээ дарна уу
                </p>
              </div>
              <span className="text-xs font-black text-slate-400">
                {visibleProducts.length} бүтээгдэхүүн
              </span>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="grid min-h-64 place-items-center rounded-[28px] border-2 border-dashed border-slate-200 bg-white/50 text-center">
                <div>
                  <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-400">
                    Илэрц олдсонгүй
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {visibleProducts.map((product) => {
                  const selectedQty =
                    cart.find((line) => line.product.id === product.id)?.qty || 0;
                  const soldOut = product.stockQty <= selectedQty;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={soldOut}
                      className="group overflow-hidden rounded-[24px] border border-black/5 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#e4eee8] via-[#f0e8d5] to-[#e8d1a5]">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-[#13795b]/50">
                            <PackageOpen className="h-10 w-10" />
                          </span>
                        )}
                        {selectedQty > 0 ? (
                          <span className="absolute right-3 top-3 grid h-9 min-w-9 place-items-center rounded-full bg-[#11231d] px-2 text-sm font-black text-white shadow-lg">
                            {selectedQty}
                          </span>
                        ) : null}
                        {product.stockQty <= 0 ? (
                          <span className="absolute inset-0 grid place-items-center bg-white/75 text-xs font-black uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                            Дууссан
                          </span>
                        ) : null}
                      </span>
                      <span className="block p-4">
                        <span className="line-clamp-2 min-h-10 text-sm font-black leading-5">
                          {product.name}
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-base font-black text-[#13795b]">
                            {formatMoney(Number(product.price))}
                          </span>
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-[#d9a62e] group-hover:text-[#172219]">
                            <Plus className="h-4 w-4" />
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="flex h-[164px] shrink-0 border-t border-black/5 bg-white shadow-[0_-12px_40px_rgba(15,35,29,0.08)] sm:h-[176px]">
          <div className="hidden w-[190px] shrink-0 items-center justify-between border-r border-slate-100 px-5 py-4 sm:flex">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef5f1] text-[#13795b]">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black">Таны сагс</h2>
                <p className="text-xs font-bold text-slate-400">{cartQty} бараа</p>
              </div>
            </div>
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={() => setCart([])}
                className="grid h-9 w-9 place-items-center rounded-xl text-rose-500 transition hover:bg-rose-50"
                aria-label="Сагс цэвэрлэх"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden px-3 py-3 [scrollbar-width:thin] sm:px-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-w-[210px] items-center justify-center gap-3 text-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-300">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-500">
                    Сагс хоосон байна
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Бүтээгдэхүүнээ сонгоно уу.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full gap-3">
                {cart.map((line) => (
                  <article
                    key={line.product.id}
                    className="flex h-full w-[230px] shrink-0 flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:w-[260px]"
                  >
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {line.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={line.product.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-slate-300">
                            <PackageOpen className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black leading-5">
                          {line.product.name}
                        </p>
                        <p className="mt-1 text-xs font-black text-[#13795b]">
                          {formatMoney(Number(line.product.price) * line.qty)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(line.product.id, -1)}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-black">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(line.product.id, 1)}
                        disabled={line.qty >= line.product.stockQty}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-[#11231d] text-white disabled:opacity-35"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-[180px] shrink-0 flex-col justify-center border-l border-slate-100 p-3 sm:w-[280px] sm:p-5">
            <div className="mb-3 flex items-end justify-between gap-2">
              <span className="hidden text-sm font-bold text-slate-500 sm:inline">Нийт дүн</span>
              <span className="text-lg font-black tracking-tight sm:text-2xl">
                {formatMoney(cartTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={openCheckout}
              disabled={cart.length === 0}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#11231d] px-4 text-sm font-black text-white transition hover:bg-[#1b382f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:h-14 sm:px-5 sm:text-base"
            >
              <span>Төлөх</span>
              <span className="flex items-center gap-2">
                {formatMoney(cartTotal)}
                <ChevronRight className="h-5 w-5" />
              </span>
            </button>
          </div>
        </aside>
      </div>

    </main>
  );
}
