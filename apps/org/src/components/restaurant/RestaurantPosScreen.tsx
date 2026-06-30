"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QrGenerator } from "@mgl/ui";
import {
  ArrowLeft,
  Banknote,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  HandCoins,
  History,
  LayoutGrid,
  Loader2,
  Minus,
  Monitor,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import {
  bootstrapRestaurantDiningTables,
  cancelRestaurantTicketItem,
  chargeRestaurantClientBridge,
  clearRestaurantDiningTable,
  closeRestaurantPosShift,
  connectRestaurantCardTerminal,
  createRestaurantCardAttempt,
  createRestaurantCardSale,
  createRestaurantCashSale,
  createRestaurantCreditSale,
  createRestaurantMenuProduct,
  createRestaurantDiningTable,
  createRestaurantQPayInvoice,
  createRestaurantQPaySale,
  enableRestaurantMenuProduct,
  getCurrentRestaurantPosShift,
  getRestaurantCardAttemptStatus,
  getRestaurantCashDrawerSummary,
  getRestaurantCreditCustomers,
  getRestaurantCreditSales,
  getRestaurantQPayInvoiceStatus,
  getRestaurantDiningTables,
  getRestaurantPosProducts,
  getRestaurantPosRegisters,
  getRestaurantShiftHistory,
  ensureRestaurantTableQrToken,
  openRestaurantPosShift,
  payRestaurantCreditSale,
  payRestaurantCreditSalesBulk,
  saveRestaurantTicket,
  sendRestaurantTicketToKitchen,
  submitRestaurantClientBridgeResult,
  type RestaurantDiningTable,
  type RestaurantCreditSale,
  type RestaurantPosQPayInvoice,
  type RestaurantPosProduct,
  type RestaurantPosRegister,
  type RestaurantTicket,
} from "@/lib/restaurant-pos-api";
import {
  RESTAURANT_CUSTOMER_DISPLAY_CHANNEL,
  RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY,
  type RestaurantCustomerDisplayPayload,
  type RestaurantCustomerDisplaySuccess,
} from "./customer-display";
import type {
  CardAttempt,
  CashDenominationCount,
  CashDrawerSummary,
  PosCreditBorrower,
  PosReceipt,
  PosShift,
  PosShiftHistoryItem,
  SaleCreditPaymentMeta,
} from "@mgl/types";

type OrderMode = "DINE_IN" | "TO_GO" | "DELIVERY";
type MenuCategory =
  | "hot"
  | "cold"
  | "soup"
  | "grill"
  | "appetizer"
  | "dessert"
  | "drink";
type MenuCategoryFilter = "all" | MenuCategory;
type DishTone = "coral" | "amber" | "mint" | "lime" | "orange" | "sky";
type TableStatus = "FREE" | "OPEN" | "KITCHEN" | "READY" | "PAID" | "RESERVED";
type PaymentMethod = "CASH" | "CARD" | "QPAY" | "CREDIT";
type RestaurantMenuCategory = NonNullable<RestaurantPosProduct["menuCategory"]>;
type RestaurantKitchenStation = NonNullable<
  RestaurantPosProduct["kitchenStation"]
>;
type ProductManagerMode = "existing" | "new";

type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  available: number;
  taxRate: number;
  tone: DishTone;
  imageUrl?: string;
};

type TicketLine = {
  id: string;
  ticketItemId?: string;
  name: string;
  price: number;
  qty: number;
  sentQty: number;
  note: string;
  available: number;
  taxRate: number;
  tone: DishTone;
  imageUrl?: string;
};

type SaleLinePayload = {
  productId: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
};

type PendingQPayCheckout = {
  invoice: RestaurantPosQPayInvoice;
  ticket: RestaurantTicket;
  amount: number;
  note: string;
  lines: SaleLinePayload[];
  orderMode: OrderMode;
  tableLabel: string;
};

type CardPaymentRun = {
  abortController: AbortController;
  cancelled: boolean;
};

type PendingCreditQPayRepayment = {
  credit: RestaurantCreditSale;
  credits: RestaurantCreditSale[];
  invoice: RestaurantPosQPayInvoice;
  amount: number;
  note: string;
};

type RestaurantCreditSaleGroup = {
  key: string;
  borrowerName: string;
  borrowerPhone: string | null;
  employeeName: string | null;
  borrowerId: string;
  credits: RestaurantCreditSale[];
  totalDue: number;
  totalLines: number;
  overdue: boolean;
  createdAt: string;
  dueDate: string | null;
};

type DiningTable = {
  id: string;
  label: string;
  qrToken: string | null;
  zone: string;
  seats: number;
  status: TableStatus;
  total: number;
  currentTicket: RestaurantTicket | null;
};

const categories: { id: MenuCategoryFilter; label: string }[] = [
  { id: "all", label: "Бүгд" },
  { id: "hot", label: "Халуун хоол" },
  { id: "cold", label: "Хүйтэн хоол" },
  { id: "soup", label: "Шөл" },
  { id: "grill", label: "Грилл" },
  { id: "appetizer", label: "Зууш" },
  { id: "dessert", label: "Амттан" },
  { id: "drink", label: "Ундаа" },
];

const restaurantMenuCategories: Array<{
  value: RestaurantMenuCategory;
  label: string;
}> = [
  { value: "HOT", label: "Халуун хоол" },
  { value: "COLD", label: "Хүйтэн хоол" },
  { value: "SOUP", label: "Шөл" },
  { value: "GRILL", label: "Грилл" },
  { value: "APPETIZER", label: "Зууш" },
  { value: "DESSERT", label: "Амттан" },
  { value: "DRINK", label: "Ундаа" },
];

const restaurantKitchenStations: Array<{
  value: RestaurantKitchenStation;
  label: string;
}> = [
  { value: "HOT_KITCHEN", label: "Халуун гал тогоо" },
  { value: "COLD_KITCHEN", label: "Хүйтэн гал тогоо" },
  { value: "BAR", label: "Бар" },
];

const dishToneStyles: Record<DishTone, string> = {
  coral: "from-rose-400 via-orange-300 to-emerald-300",
  amber: "from-amber-300 via-orange-500 to-stone-800",
  mint: "from-emerald-200 via-lime-200 to-orange-300",
  lime: "from-lime-300 via-emerald-500 to-yellow-200",
  orange: "from-orange-300 via-amber-600 to-emerald-400",
  sky: "from-sky-300 via-fuchsia-300 to-rose-300",
};

const tableStatusCopy: Record<TableStatus, string> = {
  FREE: "Сул",
  OPEN: "Нээлттэй",
  KITCHEN: "Гал тогоонд",
  READY: "Бэлэн",
  PAID: "Төлсөн",
  RESERVED: "Захиалсан",
};

const tableStatusStyles: Record<TableStatus, string> = {
  FREE: "border-white/10 bg-white/[0.03] text-slate-300",
  OPEN: "border-sky-400/70 bg-sky-400/10 text-sky-200",
  KITCHEN: "border-amber-300/70 bg-amber-300/10 text-amber-200",
  READY: "border-emerald-300/70 bg-emerald-300/10 text-emerald-200",
  PAID: "border-emerald-300/70 bg-emerald-300/10 text-emerald-200",
  RESERVED: "border-rose-300/70 bg-rose-300/10 text-rose-200",
};

const orderModeCopy: Record<OrderMode, string> = {
  DINE_IN: "Зааланд",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
};

const paymentOptions = [
  {
    value: "CASH",
    label: "Бэлэн",
    action: "Бэлэн төлбөр авах",
    icon: Banknote,
    enabled: true,
  },
  {
    value: "CARD",
    label: "Карт",
    action: "Картын төлбөр авах",
    icon: CreditCard,
    enabled: true,
  },
  {
    value: "QPAY",
    label: "QPay",
    action: "QPay нэхэмжлэх үүсгэх",
    icon: QrCode,
    enabled: true,
  },
  {
    value: "CREDIT",
    label: "Зээл",
    action: "Зээлээр бүртгэх",
    icon: HandCoins,
    enabled: true,
  },
] satisfies Array<{
  value: PaymentMethod;
  label: string;
  action: string;
  icon: typeof Banknote;
  enabled: boolean;
}>;

const moneyFormatter = new Intl.NumberFormat("mn-MN");
const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;
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

const buildCashCount = (
  counts: Record<number, number>,
): CashDenominationCount[] =>
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
const SHIFT_HISTORY_RANGE_OPTIONS = [
  { id: "7", label: "7 хоног", description: "Сүүлийн 7 хоног", days: 7 },
  { id: "14", label: "14 хоног", description: "Сүүлийн 14 хоног", days: 14 },
  { id: "30", label: "30 хоног", description: "Сүүлийн 30 хоног", days: 30 },
  { id: "100", label: "100 хаалт", description: "Сүүлийн 100 хаалт", days: null },
] as const;
type ShiftHistoryRangeId = (typeof SHIFT_HISTORY_RANGE_OPTIONS)[number]["id"];

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
const DEFAULT_ANDROID_PGW_BRIDGE_URL = "http://127.0.0.1:7420";
const LONG_RUNNING_CARD_PROVIDERS = new Set([
  "PUSH_ECR",
  "MINU_AGENT",
  "ANDROID_PGW",
]);
const terminalNeedsWaitingOverlay = (provider?: string | null) =>
  Boolean(provider && LONG_RUNNING_CARD_PROVIDERS.has(provider));
const getEffectiveCardProvider = (register?: RestaurantPosRegister | null) =>
  register?.cardProviderType || (register?.minuAgentEnabled ? "MINU_AGENT" : null);
const cardTerminalSourceLabel = (source?: string | null) => {
  if (source === "ORG_REGISTER") return "Байгууллагын existing POS terminal";
  if (source === "CARD_TERMINAL_REQUEST") return "Батлагдсан terminal хүсэлт";
  if (source === "REGISTER") return "Энэ кассын terminal";
  return "Terminal тохируулаагүй";
};
const CREDIT_MONTHLY_INTEREST_RATE = 0.012;
const addCreditMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};
const readCreditTermMonths = (value: string) => {
  const months = Math.floor(Number(value || 1));
  return Number.isFinite(months) ? Math.min(60, Math.max(1, months)) : 1;
};
const creditBorrowerSubtitle = (borrower: PosCreditBorrower) =>
  [
    borrower.borrowerPhone,
    borrower.employeeName ? `Ажилтан: ${borrower.employeeName}` : "",
    borrower.borrowerEmail,
  ]
    .filter(Boolean)
    .join(" · ") || "Дэлгэрэнгүй мэдээлэлгүй";
const getCreditSaleGroupKey = (credit: RestaurantCreditSale) =>
  (
    credit.customerId ||
    `${credit.targetType}:${credit.borrowerId || credit.borrowerPhone || credit.borrowerName}`
  ).toLowerCase();

const paymentMethodLabel = (method?: string | null) => {
  const normalized = String(method || "").toUpperCase();
  if (normalized === "QPAY" || normalized === "QR") return "QPay";
  if (normalized === "CARD") return "Карт";
  if (normalized === "CREDIT") return "Зээл";
  if (normalized === "MIXED") return "Холимог";
  return "Бэлэн";
};

const menuCategoryMap: Record<
  NonNullable<RestaurantPosProduct["menuCategory"]>,
  MenuCategory
> = {
  HOT: "hot",
  COLD: "cold",
  SOUP: "soup",
  GRILL: "grill",
  APPETIZER: "appetizer",
  DESSERT: "dessert",
  DRINK: "drink",
};

const categoryTone: Record<MenuCategory, DishTone> = {
  hot: "orange",
  cold: "mint",
  soup: "amber",
  grill: "coral",
  appetizer: "lime",
  dessert: "sky",
  drink: "sky",
};

const REGISTER_STORAGE_KEY = "org_restaurant_pos_register_id";

const createClientSaleId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `restaurant-${crypto.randomUUID()}`
    : `restaurant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const mapDiningTable = (table: RestaurantDiningTable): DiningTable => ({
  id: table.id,
  label: table.label,
  qrToken: table.qrToken,
  zone: table.zone,
  seats: table.seats,
  status: table.status,
  total: table.total,
  currentTicket: table.currentTicket,
});

const EMPTY_DINING_TABLE: DiningTable = {
  id: "",
  label: "-",
  qrToken: null,
  zone: "",
  seats: 0,
  status: "FREE",
  total: 0,
  currentTicket: null,
};

const mapTicketLines = (
  ticket: RestaurantTicket | null,
  menuItems: MenuItem[],
): TicketLine[] =>
  ticket?.items.map((item) => {
    const menuItem = menuItems.find((product) => product.id === item.productId);
    return {
      id: item.productId,
      ticketItemId: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      sentQty: item.sentQty,
      note: item.note,
      available: Math.max(item.qty, menuItem?.available ?? item.qty),
      taxRate: menuItem?.taxRate ?? 0,
      tone: menuItem?.tone ?? "sky",
      imageUrl: menuItem?.imageUrl,
    };
  }) ?? [];

type RestaurantReceiptPrintContext = {
  organizationName: string;
  registerName: string;
  orderLabel: string;
};

const escapeReceiptHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatReceiptDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

function printRestaurantReceipt(
  receipt: PosReceipt,
  context: RestaurantReceiptPrintContext,
) {
  if (typeof document === "undefined") return;

  const money = (value: number) =>
    `${Math.round(Number(value) || 0).toLocaleString("mn-MN")} ₮`;
  const lineRows = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>
            <div class="item-name">${escapeReceiptHtml(line.name)}</div>
            <div class="item-detail">${line.qty} × ${money(line.unitPrice)}</div>
          </td>
          <td class="amount">${money(line.lineTotal)}</td>
        </tr>
      `,
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

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 800);
  };

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
    }, 80);
  };

  iframe.srcdoc = `<!doctype html>
    <html lang="mn">
      <head>
        <meta charset="utf-8" />
        <title>${escapeReceiptHtml(receipt.receiptNo)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body {
            width: 72mm;
            margin: 0 auto;
            color: #000;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.35;
          }
          h1 { margin: 0; text-align: center; font-size: 16px; }
          .center { text-align: center; }
          .muted { color: #333; }
          .meta { margin-top: 8px; padding: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
          .meta-row, .total-row { display: flex; justify-content: space-between; gap: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #777; }
          .item-name { font-weight: 700; }
          .item-detail { margin-top: 2px; color: #333; font-size: 10px; }
          .amount { width: 30%; text-align: right; white-space: nowrap; font-weight: 700; }
          .totals { margin-top: 8px; }
          .total-row { margin-top: 3px; }
          .grand-total { margin-top: 6px; padding-top: 6px; border-top: 2px solid #000; font-size: 15px; font-weight: 800; }
          .footer { margin-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${escapeReceiptHtml(context.organizationName)}</h1>
        <div class="center muted">${escapeReceiptHtml(receipt.branchName)}</div>
        <div class="center muted">${escapeReceiptHtml(context.registerName)}</div>

        <div class="meta">
          <div class="meta-row"><span>Баримт:</span><strong>${escapeReceiptHtml(receipt.receiptNo)}</strong></div>
          <div class="meta-row"><span>Огноо:</span><span>${escapeReceiptHtml(formatReceiptDate(receipt.createdAt))}</span></div>
          <div class="meta-row"><span>Кассчин:</span><span>${escapeReceiptHtml(receipt.cashierName)}</span></div>
          <div class="meta-row"><span>Захиалга:</span><span>${escapeReceiptHtml(context.orderLabel)}</span></div>
          <div class="meta-row"><span>Төлбөр:</span><span>${escapeReceiptHtml(paymentMethodLabel(receipt.paymentMethod))}</span></div>
        </div>

        <table><tbody>${lineRows}</tbody></table>

        <div class="totals">
          <div class="total-row"><span>Дүн:</span><span>${money(receipt.subTotal)}</span></div>
          ${
            receipt.discountTotal > 0
              ? `<div class="total-row"><span>Хөнгөлөлт:</span><span>-${money(receipt.discountTotal)}</span></div>`
              : ""
          }
          ${
            receipt.taxTotal > 0
              ? `<div class="total-row"><span>Үүнд НӨАТ:</span><span>${money(receipt.taxTotal)}</span></div>`
              : ""
          }
          <div class="total-row grand-total"><span>НИЙТ:</span><span>${money(receipt.grandTotal)}</span></div>
        </div>

        <div class="footer">
          <strong>Үйлчлүүлсэнд баярлалаа</strong>
        </div>
      </body>
    </html>`;

  document.body.appendChild(iframe);
}

export function RestaurantPosScreen() {
  const { user } = useOrg();
  const [registers, setRegisters] = useState<RestaurantPosRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [shift, setShift] = useState<PosShift | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [cashCounts, setCashCounts] = useState<Record<number, number>>({});
  const [drawerSummary, setDrawerSummary] =
    useState<CashDrawerSummary | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [shiftNote, setShiftNote] = useState("");
  const [showShiftHistory, setShowShiftHistory] = useState(false);
  const [shiftHistory, setShiftHistory] = useState<PosShiftHistoryItem[]>([]);
  const [shiftHistoryLoading, setShiftHistoryLoading] = useState(false);
  const [shiftHistoryError, setShiftHistoryError] = useState("");
  const [shiftHistoryRange, setShiftHistoryRange] =
    useState<ShiftHistoryRangeId>("7");
  const [selectedShiftHistoryId, setSelectedShiftHistoryId] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<MenuCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [diningTables, setDiningTables] = useState<DiningTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [productManagerOpen, setProductManagerOpen] = useState(false);
  const [productManagerMode, setProductManagerMode] =
    useState<ProductManagerMode>("new");
  const [catalogProducts, setCatalogProducts] = useState<
    RestaurantPosProduct[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [productManagerSaving, setProductManagerSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [menuProductCategory, setMenuProductCategory] =
    useState<RestaurantMenuCategory>("HOT");
  const [menuProductStation, setMenuProductStation] =
    useState<RestaurantKitchenStation>("HOT_KITCHEN");
  const [menuProductPreparationMinutes, setMenuProductPreparationMinutes] =
    useState("15");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductStock, setNewProductStock] = useState("100");
  const [ticketLines, setTicketLines] = useState<TicketLine[]>([]);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [kitchenSubmitting, setKitchenSubmitting] = useState(false);
  const [cancellingLineId, setCancellingLineId] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [clearSubmitting, setClearSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [qpayCheckout, setQpayCheckout] = useState<PendingQPayCheckout | null>(
    null,
  );
  const [qpayChecking, setQpayChecking] = useState(false);
  const [qpayFinalizing, setQpayFinalizing] = useState(false);
  const [qpayMessage, setQpayMessage] = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardMessage, setCardMessage] = useState("");
  const [cardSetupProvider, setCardSetupProvider] = useState<
    "ANDROID_PGW" | "MINU_AGENT"
  >("ANDROID_PGW");
  const [cardSetupBridgeUrl, setCardSetupBridgeUrl] = useState(
    DEFAULT_ANDROID_PGW_BRIDGE_URL,
  );
  const [cardSetupTerminalId, setCardSetupTerminalId] = useState("");
  const [cardSetupMinuUsername, setCardSetupMinuUsername] = useState("");
  const [cardSetupMinuPassword, setCardSetupMinuPassword] = useState("");
  const [cardSetupMinuBranchId, setCardSetupMinuBranchId] = useState("");
  const [cardSetupSubmitting, setCardSetupSubmitting] = useState(false);
  const [cardSetupError, setCardSetupError] = useState("");
  const [creditBorrowers, setCreditBorrowers] = useState<PosCreditBorrower[]>(
    [],
  );
  const [creditBorrowersLoading, setCreditBorrowersLoading] = useState(false);
  const [creditBorrowersError, setCreditBorrowersError] = useState("");
  const [creditSearch, setCreditSearch] = useState("");
  const [selectedCreditBorrowerId, setSelectedCreditBorrowerId] =
    useState("");
  const [creditTermMonths, setCreditTermMonths] = useState("1");
  const [creditNote, setCreditNote] = useState("");
  const [creditListOpen, setCreditListOpen] = useState(false);
  const [creditSales, setCreditSales] = useState<RestaurantCreditSale[]>([]);
  const [creditSalesLoading, setCreditSalesLoading] = useState(false);
  const [creditSalesError, setCreditSalesError] = useState("");
  const [creditSalesSearch, setCreditSalesSearch] = useState("");
  const [creditRepaymentId, setCreditRepaymentId] = useState("");
  const [creditRepaymentMessage, setCreditRepaymentMessage] = useState("");
  const [creditQPayRepayment, setCreditQPayRepayment] =
    useState<PendingCreditQPayRepayment | null>(null);
  const [creditQPayChecking, setCreditQPayChecking] = useState(false);
  const [creditQPayFinalizing, setCreditQPayFinalizing] = useState(false);
  const [creditQPayMessage, setCreditQPayMessage] = useState("");
  const [customerDisplaySuccess, setCustomerDisplaySuccess] =
    useState<RestaurantCustomerDisplaySuccess | null>(null);
  const [notice, setNotice] = useState("");
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [tableCreateOpen, setTableCreateOpen] = useState(false);
  const [tableCreating, setTableCreating] = useState(false);
  const [tableCreateError, setTableCreateError] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableZone, setNewTableZone] = useState("Гол заал");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSelectedTableId, setQrSelectedTableId] = useState("");
  const [qrTokensByTableId, setQrTokensByTableId] = useState<
    Record<string, string>
  >({});
  const [qrLoadingTableId, setQrLoadingTableId] = useState("");
  const [qrError, setQrError] = useState("");
  const qrPrintRef = useRef<HTMLDivElement>(null);
  const customerDisplayChannelRef = useRef<BroadcastChannel | null>(null);
  const qpayFinalizedInvoiceRef = useRef<string | null>(null);
  const cardPaymentRunRef = useRef<CardPaymentRun | null>(null);
  const creditQPayFinalizedInvoiceRef = useRef<string | null>(null);

  const selectedRegister = useMemo(
    () =>
      registers.find((register) => register.id === selectedRegisterId) ?? null,
    [registers, selectedRegisterId],
  );
  const shiftMatchesRegister =
    Boolean(shift?.registerId) && shift?.registerId === selectedRegister?.id;
  const countedCashItems = useMemo(
    () => buildCashCount(cashCounts),
    [cashCounts],
  );
  const hasCountedCash = countedCashItems.some((item) => item.count > 0);
  const countedCashTotal = useMemo(
    () => sumCashCount(countedCashItems),
    [countedCashItems],
  );
  const closingCashPreview = hasCountedCash
    ? countedCashTotal
    : Number(closingCash) || 0;
  const expectedCashPreview =
    drawerSummary?.expectedCash ?? shift?.expectedCash ?? 0;
  const closingDifferencePreview = roundMoney(
    closingCashPreview - expectedCashPreview,
  );
  const selectedShiftHistory = useMemo(
    () =>
      shiftHistory.find((item) => item.id === selectedShiftHistoryId) ??
      shiftHistory[0] ??
      null,
    [shiftHistory, selectedShiftHistoryId],
  );
  const shiftHistoryTotals = useMemo(
    () =>
      shiftHistory.reduce(
        (totals, item) => ({
          totalSales: roundMoney(totals.totalSales + item.totalSales),
          cashSales: roundMoney(totals.cashSales + item.cashSales),
          cardSales: roundMoney(totals.cardSales + item.cardSales),
          qpaySales: roundMoney(totals.qpaySales + item.qpaySales),
          creditSales: roundMoney(totals.creditSales + item.creditSales),
          salesCount: totals.salesCount + item.salesCount,
        }),
        {
          totalSales: 0,
          cashSales: 0,
          cardSales: 0,
          qpaySales: 0,
          creditSales: 0,
          salesCount: 0,
        },
      ),
    [shiftHistory],
  );
  const selectedShiftHistoryRange = useMemo(
    () =>
      SHIFT_HISTORY_RANGE_OPTIONS.find((item) => item.id === shiftHistoryRange) ??
      SHIFT_HISTORY_RANGE_OPTIONS[0],
    [shiftHistoryRange],
  );

  const loadShiftHistory = useCallback(
    async (signal?: AbortSignal) => {
      setShiftHistoryLoading(true);
      setShiftHistoryError("");
      try {
        const rangeParams = getShiftHistoryRangeParams(shiftHistoryRange);
        const data = await getRestaurantShiftHistory(
          {
            branchId: selectedRegister?.branchId,
            status: "CLOSED",
            ...rangeParams,
          },
          signal,
        );
        const shifts = Array.isArray(data.shifts) ? data.shifts : [];
        setShiftHistory(shifts);
        setSelectedShiftHistoryId((current) =>
          shifts.some((item) => item.id === current)
            ? current
            : shifts[0]?.id ?? "",
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setShiftHistoryError(
          error instanceof Error
            ? error.message
            : "Хаалтын түүх авахад алдаа гарлаа",
        );
      } finally {
        setShiftHistoryLoading(false);
      }
    },
    [selectedRegister?.branchId, shiftHistoryRange],
  );

  const refreshCashDrawerSummary = useCallback(
    async (signal?: AbortSignal) => {
      if (!shift?.id) return null;
      setDrawerLoading(true);
      setDrawerError("");
      try {
        const summary = await getRestaurantCashDrawerSummary(shift.id, signal);
        setDrawerSummary(summary);
        return summary;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }
        setDrawerError(
          error instanceof Error
            ? error.message
            : "Кассын хаалтын мэдээлэл авахад алдаа гарлаа",
        );
        return null;
      } finally {
        setDrawerLoading(false);
      }
    },
    [shift?.id],
  );

  const selectedTable =
    diningTables.find((table) => table.id === selectedTableId) ??
    diningTables[0] ??
    EMPTY_DINING_TABLE;
  const activeTables = diningTables.filter(
    (table) => table.status !== "FREE",
  ).length;
  const openTicketCount = diningTables.filter(
    (table) => table.currentTicket,
  ).length;
  const qrSelectedTable =
    diningTables.find((table) => table.id === qrSelectedTableId) ??
    selectedTable;
  const qrSelectedToken =
    (qrSelectedTable.id ? qrTokensByTableId[qrSelectedTable.id] : "") ||
    qrSelectedTable.qrToken ||
    "";
  const qrMenuUrl =
    qrSelectedToken && typeof window !== "undefined"
      ? `${window.location.origin}/menu/${encodeURIComponent(qrSelectedToken)}`
      : qrSelectedToken
        ? `/menu/${encodeURIComponent(qrSelectedToken)}`
        : "";

  const loadPosSetup = useCallback(async () => {
    setSetupLoading(true);
    setSetupError("");
    try {
      const [nextRegisters, currentShift] = await Promise.all([
        getRestaurantPosRegisters(),
        getCurrentRestaurantPosShift(),
      ]);
      setRegisters(nextRegisters);
      setShift(currentShift);

      const savedRegisterId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(REGISTER_STORAGE_KEY)
          : null;
      const currentShiftRegister = nextRegisters.find(
        (register) => register.id === currentShift?.registerId,
      );
      const savedRegister = nextRegisters.find(
        (register) => register.id === savedRegisterId,
      );
      const nextRegister =
        currentShiftRegister ?? savedRegister ?? nextRegisters[0] ?? null;

      setSelectedRegisterId(nextRegister?.id ?? "");
      if (nextRegister && typeof window !== "undefined") {
        window.localStorage.setItem(REGISTER_STORAGE_KEY, nextRegister.id);
      }
      if (nextRegister && !currentShift) {
        setShowOpenShift(true);
      }
    } catch (error) {
      setSetupError(
        error instanceof Error
          ? error.message
          : "POS кассын тохиргоо ачаалахад алдаа гарлаа",
      );
    } finally {
      setSetupLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosSetup();
  }, [loadPosSetup]);

  useEffect(() => {
    if (!showCloseShift || !shift?.id) return;
    const controller = new AbortController();
    void refreshCashDrawerSummary(controller.signal);
    return () => controller.abort();
  }, [showCloseShift, shift?.id, refreshCashDrawerSummary]);

  useEffect(() => {
    if (!showShiftHistory) return;
    const controller = new AbortController();
    void loadShiftHistory(controller.signal);
    return () => controller.abort();
  }, [showShiftHistory, loadShiftHistory]);

  const loadMenu = useCallback(async () => {
    if (!selectedRegister?.branchId) {
      setMenuItems([]);
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    setMenuError("");
    try {
      const products = await getRestaurantPosProducts(
        selectedRegister.branchId,
        {
          restaurantMenuOnly: false,
        },
      );
      const nextItems = products
        .filter((product) => product.isActive)
        .map((product) => {
          const menuCategory =
            product.menuCategory ||
            (product.kitchenStation === "BAR" ? "DRINK" : "HOT");
          const category = menuCategoryMap[menuCategory];
          return {
            id: product.id,
            name: product.name,
            category,
            price: Number(product.price) || 0,
            available: Number(product.stockQty) || 0,
            taxRate: Number(product.taxRate) || 0,
            tone: categoryTone[category],
            imageUrl: product.imageUrl || undefined,
          };
        });
      setMenuItems(nextItems);
    } catch (error) {
      setMenuError(
        error instanceof Error ? error.message : "Меню ачаалахад алдаа гарлаа",
      );
    } finally {
      setMenuLoading(false);
    }
  }, [selectedRegister?.branchId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const loadCatalogProducts = useCallback(async () => {
    if (!selectedRegister?.branchId) {
      setCatalogProducts([]);
      return;
    }

    setCatalogLoading(true);
    setCatalogError("");
    try {
      const products = await getRestaurantPosProducts(
        selectedRegister.branchId,
        { restaurantMenuOnly: false },
      );
      setCatalogProducts(products);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Бүтээгдэхүүний жагсаалт авахад алдаа гарлаа",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [selectedRegister?.branchId]);

  const loadCreditBorrowers = useCallback(async () => {
    if (!user.organizationId) {
      setCreditBorrowers([]);
      setSelectedCreditBorrowerId("");
      return;
    }

    setCreditBorrowersLoading(true);
    setCreditBorrowersError("");
    try {
      const customers = await getRestaurantCreditCustomers(user.organizationId, {
        limit: 100,
      });
      setCreditBorrowers(customers);
      setSelectedCreditBorrowerId((current) =>
        customers.some((customer) => customer.id === current) ? current : "",
      );
    } catch (error) {
      setCreditBorrowersError(
        error instanceof Error
          ? error.message
          : "Зээлдэгчийн жагсаалт авахад алдаа гарлаа",
      );
      setCreditBorrowers([]);
      setSelectedCreditBorrowerId("");
    } finally {
      setCreditBorrowersLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    if (paymentMethod !== "CREDIT") return;
    void loadCreditBorrowers();
  }, [loadCreditBorrowers, paymentMethod]);

  const loadCreditSales = useCallback(async () => {
    if (!user.organizationId) {
      setCreditSales([]);
      return;
    }

    setCreditSalesLoading(true);
    setCreditSalesError("");
    try {
      const credits = await getRestaurantCreditSales(user.organizationId, {
        branchId: selectedRegister?.branchId,
        limit: 100,
      });
      setCreditSales(credits);
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "Зээлийн жагсаалт авахад алдаа гарлаа",
      );
      setCreditSales([]);
    } finally {
      setCreditSalesLoading(false);
    }
  }, [selectedRegister?.branchId, user.organizationId]);

  const openCreditList = () => {
    setCreditListOpen(true);
    setCreditSalesSearch("");
    setCreditRepaymentMessage("");
    setCreditSalesError("");
    void loadCreditSales();
  };

  const loadTables = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!selectedRegister?.branchId) {
        setDiningTables([]);
        setSelectedTableId("");
        setTicketLines([]);
        return;
      }

      if (!options?.silent) {
        setTablesLoading(true);
      }
      setTablesError("");
      try {
        let tables = await getRestaurantDiningTables(selectedRegister.branchId);
        if (tables.length === 0) {
          await bootstrapRestaurantDiningTables(selectedRegister.branchId);
          tables = await getRestaurantDiningTables(selectedRegister.branchId);
        }

        const mapped = tables.map(mapDiningTable);
        setDiningTables(mapped);
        setSelectedTableId((current) =>
          mapped.some((table) => table.id === current)
            ? current
            : (mapped[0]?.id ?? ""),
        );
      } catch (error) {
        setTablesError(
          error instanceof Error
            ? error.message
            : "Рестораны ширээ ачаалахад алдаа гарлаа",
        );
      } finally {
        if (!options?.silent) {
          setTablesLoading(false);
        }
      }
    },
    [selectedRegister?.branchId],
  );

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!selectedRegister?.branchId) return;
    const refreshTimer = window.setInterval(() => {
      void loadTables({ silent: true });
    }, 5_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadTables, selectedRegister?.branchId]);

  useEffect(() => {
    if (!selectedTable.id) {
      setTicketLines([]);
      return;
    }
    setTicketLines(mapTicketLines(selectedTable.currentTicket, menuItems));
    if (selectedTable.currentTicket) {
      setOrderMode(selectedTable.currentTicket.orderMode);
    } else {
      setOrderMode("DINE_IN");
    }
  }, [menuItems, selectedTable.currentTicket, selectedTable.id]);

  const filteredMenu = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, menuItems, query]);
  const filteredCatalogProducts = useMemo(() => {
    const normalizedQuery = productSearch.trim().toLowerCase();
    return catalogProducts.filter((product) => {
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        (product.barcode || "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [catalogProducts, productSearch]);
  const availableCatalogProducts = filteredCatalogProducts.filter(
    (product) => !product.isRestaurantMenuItem,
  );
  const subtotal = ticketLines.reduce(
    (sum, line) => sum + line.price * line.qty,
    0,
  );
  const discount = 0;
  const total = subtotal - discount;
  const selectedPayment =
    paymentOptions.find((option) => option.value === paymentMethod) ??
    paymentOptions[0];
  const SelectedPaymentIcon = selectedPayment.icon;
  const normalizedCreditSearch = creditSearch.trim().toLowerCase();
  const filteredCreditBorrowers = creditBorrowers.filter((borrower) => {
    if (!normalizedCreditSearch) return true;
    return [
      borrower.borrowerName,
      borrower.borrowerPhone,
      borrower.borrowerEmail,
      borrower.borrowerAddress,
      borrower.employeeName,
      borrower.borrowerId,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedCreditSearch));
  });
  const selectedCreditBorrower =
    creditBorrowers.find((borrower) => borrower.id === selectedCreditBorrowerId) ??
    null;
  const safeCreditTermMonths = readCreditTermMonths(creditTermMonths);
  const creditDueDate = addCreditMonths(new Date(), safeCreditTermMonths);
  const creditDueDateLabel = new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(creditDueDate);
  const normalizedCreditSalesSearch = creditSalesSearch.trim().toLowerCase();
  const filteredCreditSales = creditSales.filter((credit) => {
    if (!normalizedCreditSalesSearch) return true;
    return [
      credit.borrowerName,
      credit.borrowerPhone,
      credit.employeeName,
      credit.receiptNo,
      credit.borrowerId,
      ...credit.lines.map((line) => line.productName),
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedCreditSalesSearch),
      );
  });
  const filteredCreditSalesTotalDue = filteredCreditSales.reduce(
    (sum, credit) => sum + Number(credit.totalDue || 0),
    0,
  );
  const filteredCreditSaleGroups = useMemo(() => {
    const groups = new Map<string, RestaurantCreditSaleGroup>();

    for (const credit of filteredCreditSales) {
      const key = getCreditSaleGroupKey(credit);
      const existing = groups.get(key);
      if (existing) {
        existing.credits.push(credit);
        existing.totalDue += Number(credit.totalDue || 0);
        existing.totalLines += credit.lines.length;
        existing.overdue = existing.overdue || credit.status === "OVERDUE";
        if (new Date(credit.createdAt).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = credit.createdAt;
        }
        if (
          credit.dueDate &&
          (!existing.dueDate ||
            new Date(credit.dueDate).getTime() < new Date(existing.dueDate).getTime())
        ) {
          existing.dueDate = credit.dueDate;
        }
        continue;
      }

      groups.set(key, {
        key,
        borrowerName: credit.borrowerName,
        borrowerPhone: credit.borrowerPhone,
        employeeName: credit.employeeName,
        borrowerId: credit.borrowerId,
        credits: [credit],
        totalDue: Number(credit.totalDue || 0),
        totalLines: credit.lines.length,
        overdue: credit.status === "OVERDUE",
        createdAt: credit.createdAt,
        dueDate: credit.dueDate,
      });
    }

    return [...groups.values()].sort((a, b) =>
      a.borrowerName.localeCompare(b.borrowerName),
    );
  }, [filteredCreditSales]);
  const totalOpenCreditDue = creditSales.reduce(
    (sum, credit) => sum + Number(credit.totalDue || 0),
    0,
  );
  const qpayPending = qpayCheckout?.invoice.status === "PENDING";
  const qpayPaymentActive = Boolean(qpayCheckout);
  const effectiveCardProvider = getEffectiveCardProvider(selectedRegister);
  const cardTerminalReady = Boolean(
    selectedRegister?.cardEnabled &&
      effectiveCardProvider &&
      (effectiveCardProvider === "ANDROID_PGW"
        ? selectedRegister.terminalBridgeUrl
        : selectedRegister.cardTerminalId),
  );
  const cardTerminalLabel = effectiveCardProvider
    ? effectiveCardProvider === "ANDROID_PGW"
      ? `Android PGW · ${selectedRegister?.terminalBridgeUrl || DEFAULT_ANDROID_PGW_BRIDGE_URL}`
      : `${effectiveCardProvider} · ${selectedRegister?.cardTerminalId || "terminalId дутуу"}`
    : "Terminal тохируулаагүй";
  const selectedTicketPaid = selectedTable.currentTicket?.status === "PAID";
  const selectedTicketActive = Boolean(
    selectedTable.currentTicket && !selectedTicketPaid,
  );
  const hasUnsentItems = ticketLines.some((line) => line.qty > line.sentQty);
  const canCheckout =
    Boolean(selectedRegister && shiftMatchesRegister) &&
    Boolean(selectedTable.id) &&
    !selectedTicketPaid &&
    ticketLines.length > 0 &&
    total > 0 &&
    !qpayPaymentActive &&
    !cardProcessing &&
    !checkoutSubmitting &&
    !qpayFinalizing &&
    !ticketSaving &&
    !kitchenSubmitting &&
    !cancellingLineId &&
    !clearSubmitting;
  const canSendKitchen =
    orderMode === "DINE_IN" &&
    Boolean(selectedTable.currentTicket || ticketLines.length > 0) &&
    Boolean(shiftMatchesRegister) &&
    !selectedTicketPaid &&
    !qpayPaymentActive &&
    hasUnsentItems &&
    !ticketSaving &&
    !kitchenSubmitting &&
    !cancellingLineId &&
    !clearSubmitting;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(RESTAURANT_CUSTOMER_DISPLAY_CHANNEL);
    customerDisplayChannelRef.current = channel;
    return () => {
      channel.close();
      customerDisplayChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cardPaymentRunRef.current) {
        cardPaymentRunRef.current.cancelled = true;
        cardPaymentRunRef.current.abortController.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!customerDisplaySuccess) return;
    const timer = window.setTimeout(
      () => setCustomerDisplaySuccess(null),
      10_000,
    );
    return () => window.clearTimeout(timer);
  }, [customerDisplaySuccess]);

  useEffect(() => {
    const displayQPay = qpayCheckout
      ? {
          invoiceId: qpayCheckout.invoice.invoiceId,
          amount: qpayCheckout.amount,
          qrText: qpayCheckout.invoice.qrText,
          qrImage: qpayCheckout.invoice.qrImage,
          status: qpayCheckout.invoice.status,
          expiresAt: qpayCheckout.invoice.expiresAt,
          deepLinks: qpayCheckout.invoice.deepLinks,
        }
      : creditQPayRepayment
        ? {
            invoiceId: creditQPayRepayment.invoice.invoiceId,
            amount: creditQPayRepayment.amount,
            qrText: creditQPayRepayment.invoice.qrText,
            qrImage: creditQPayRepayment.invoice.qrImage,
            status: creditQPayRepayment.invoice.status,
            expiresAt: creditQPayRepayment.invoice.expiresAt,
            deepLinks: creditQPayRepayment.invoice.deepLinks,
          }
        : null;
    const displayLines = creditQPayRepayment
      ? creditQPayRepayment.credits.flatMap((credit) =>
          credit.lines.map((line) => ({
          id: `${credit.id}:${line.id}`,
          name: line.productName,
          qty: line.qty,
          sentQty: line.qty,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          })),
        )
      : ticketLines.map((line) => ({
          id: line.id,
          name: line.name,
          qty: line.qty,
          sentQty: line.sentQty,
          unitPrice: line.price,
          lineTotal: line.price * line.qty,
          note: line.note.trim() || undefined,
          imageUrl: line.imageUrl,
        }));
    const displayTotals = creditQPayRepayment
      ? {
          subtotal: creditQPayRepayment.amount,
          discount: 0,
          total: creditQPayRepayment.amount,
        }
      : {
          subtotal,
          discount,
          total,
        };

    const payload: RestaurantCustomerDisplayPayload = {
      organizationName: user.organizationName || "MGL Store Restaurant",
      branchName: selectedRegister?.branch.name || "Салбар сонгогдоогүй",
      registerName:
        selectedRegister?.label || selectedRegister?.name || "Restaurant POS",
      tableLabel: creditQPayRepayment
        ? `Зээлийн төлөлт · ${creditQPayRepayment.credit.borrowerName}`
        : selectedTable.label,
      orderMode,
      paymentMethod: creditQPayRepayment ? "QPAY" : paymentMethod,
      lines: displayLines,
      totals: displayTotals,
      qpay: displayQPay,
      message: creditQPayMessage || qpayMessage || cardMessage || notice,
      success: customerDisplaySuccess,
      updatedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(
        RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY,
        JSON.stringify(payload),
      );
      customerDisplayChannelRef.current?.postMessage(payload);
    } catch {
      // Customer display sync is best-effort; POS flow should continue.
    }
  }, [
    customerDisplaySuccess,
    cardMessage,
    creditQPayMessage,
    creditQPayRepayment,
    discount,
    notice,
    orderMode,
    paymentMethod,
    qpayCheckout,
    qpayMessage,
    selectedRegister?.branch.name,
    selectedRegister?.label,
    selectedRegister?.name,
    selectedTable.label,
    subtotal,
    ticketLines,
    total,
    user.organizationName,
  ]);

  const updateTableTicket = (
    tableId: string,
    ticket: RestaurantTicket | null,
  ) => {
    setDiningTables((current) =>
      current.map((table) =>
        table.id === tableId
          ? {
              ...table,
              currentTicket: ticket,
              total: ticket?.total ?? 0,
              status: ticket
                ? ticket.status === "OPEN"
                  ? "OPEN"
                  : ticket.status === "READY"
                    ? "READY"
                    : ticket.status === "PAID"
                      ? "PAID"
                      : "KITCHEN"
                : "FREE",
            }
          : table,
      ),
    );
  };

  const persistTicketLines = async (
    nextLines: TicketLine[],
    nextMode: OrderMode = orderMode,
  ) => {
    if (
      !selectedRegister ||
      !selectedTable.id ||
      !shiftMatchesRegister ||
      !shift
    ) {
      throw new Error("Нээлттэй POS ээлж болон ширээ шаардлагатай.");
    }
    if (selectedTable.currentTicket?.status === "PAID") {
      throw new Error(
        "Энэ ticket төлөгдсөн байна. Шинэ захиалга авахын өмнө ширээг чөлөөлнө үү.",
      );
    }

    setTicketLines(nextLines);
    setTicketSaving(true);
    setCheckoutError("");
    const targetTableId = selectedTable.id;
    try {
      const ticket = await saveRestaurantTicket({
        branchId: selectedRegister.branchId,
        shiftId: shift.id,
        tableId: targetTableId,
        orderMode: nextMode,
        lines: nextLines.map((line) => ({
          productId: line.id,
          qty: line.qty,
          note: line.note,
        })),
      });
      updateTableTicket(targetTableId, ticket);
      setTicketLines(mapTicketLines(ticket, menuItems));
      void loadTables({ silent: true });
      return ticket;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ticket хадгалахад алдаа гарлаа";
      setCheckoutError(message);
      await loadTables();
      throw error;
    } finally {
      setTicketSaving(false);
    }
  };

  const buildSaleLines = (lines: TicketLine[]): SaleLinePayload[] =>
    lines.map((line) => ({
      productId: line.id,
      qty: line.qty,
      unitPrice: line.price,
      discountAmount: 0,
      taxRate: line.taxRate,
    }));

  const buildSaleNote = (
    lines: TicketLine[],
    mode: OrderMode,
    tableLabel: string,
  ) => {
    const lineNotes = lines
      .filter((line) => line.note.trim())
      .map((line) => `${line.name}: ${line.note.trim()}`)
      .join("; ");

    return [
      `Restaurant ${orderModeCopy[mode]}`,
      mode === "DINE_IN" ? `Ширээ ${tableLabel}` : "",
      lineNotes,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const buildCreditPaymentMeta = (
    borrower: PosCreditBorrower,
    amount: number,
  ): SaleCreditPaymentMeta => {
    const safeAmount = Math.max(0, Number(amount) || 0);
    const dueDate = addCreditMonths(new Date(), safeCreditTermMonths);
    return {
      targetType: borrower.targetType,
      borrowerId: borrower.borrowerId,
      borrowerName: borrower.borrowerName,
      borrowerPhone: borrower.borrowerPhone || undefined,
      borrowerEmail: borrower.borrowerEmail || undefined,
      borrowerAddress: borrower.borrowerAddress || undefined,
      employeeId: borrower.employeeId || undefined,
      employeeName: borrower.employeeName || undefined,
      termMonths: safeCreditTermMonths,
      monthlyInterestRate: CREDIT_MONTHLY_INTEREST_RATE,
      principal: safeAmount,
      totalInterest: 0,
      totalDue: safeAmount,
      dueDate: dueDate.toISOString(),
      note: creditNote.trim() || undefined,
    };
  };

  const printReceipt = (
    receipt: PosReceipt,
    context?: { orderMode?: OrderMode; tableLabel?: string },
  ) => {
    if (!selectedRegister) return;
    const receiptOrderMode = context?.orderMode ?? orderMode;
    const receiptTableLabel = context?.tableLabel ?? selectedTable.label;
    printRestaurantReceipt(receipt, {
      organizationName: user.organizationName || "MGL Store Restaurant",
      registerName: selectedRegister.label || selectedRegister.name,
      orderLabel:
        receiptOrderMode === "DINE_IN"
          ? `${orderModeCopy[receiptOrderMode]} · Ширээ ${receiptTableLabel}`
          : orderModeCopy[receiptOrderMode],
    });
  };

  const completePaidSale = async (
    receipt: PosReceipt,
    ticket: RestaurantTicket,
    mode: OrderMode,
    tableLabel: string,
  ) => {
    setLastReceipt(receipt);
    setReceiptPreviewOpen(true);
    setCustomerDisplaySuccess({
      title: "Төлбөр амжилттай",
      text: `Баримт ${receipt.receiptNo} хэвлэгдлээ.`,
      receiptNo: receipt.receiptNo,
      amount: receipt.grandTotal,
      paymentMethod: receipt.paymentMethod,
      ts: Date.now(),
    });
    const paidTicket: RestaurantTicket = {
      ...ticket,
      status: "PAID",
      closedAt: new Date().toISOString(),
    };
    updateTableTicket(ticket.tableId || selectedTable.id, paidTicket);
    setTicketLines(mapTicketLines(paidTicket, menuItems));
    setNotice(
      mode === "DINE_IN"
        ? `Борлуулалт амжилттай: ${receipt.receiptNo}. Ширээ "Төлсөн" төлөвтэй хэвээр байна — үйлчлүүлэгч гарсны дараа ширээг чөлөөлнө үү.`
        : `Борлуулалт амжилттай: ${receipt.receiptNo}. Захиалга гал тогоо руу автоматаар илгээгдлээ.`,
    );
    printReceipt(receipt, { orderMode: mode, tableLabel });
    await Promise.all([loadMenu(), loadTables()]);
  };

  const finalizeQPayCheckout = async (
    checkout: PendingQPayCheckout,
    paidInvoice: RestaurantPosQPayInvoice,
  ) => {
    if (qpayFinalizing) return;
    if (!selectedRegister || !shift || !user.organizationId) {
      setQpayMessage("POS register болон нээлттэй ээлж шаардлагатай.");
      return;
    }

    setQpayFinalizing(true);
    setCheckoutSubmitting(true);
    setCheckoutError("");
    setQpayMessage("QPay төлбөр баталгаажлаа. Борлуулалт бүртгэж байна...");
    try {
      const receipt = await createRestaurantQPaySale({
        shiftId: shift.id,
        branchId: selectedRegister.branchId,
        registerId: selectedRegister.id,
        organizationId: user.organizationId,
        restaurantTicketId: checkout.ticket.id,
        clientSaleId: createClientSaleId(),
        total: checkout.amount,
        qpayInvoiceId: paidInvoice.invoiceId,
        note: checkout.note,
        lines: checkout.lines,
      });
      setQpayCheckout(null);
      setQpayMessage("");
      await completePaidSale(
        receipt,
        checkout.ticket,
        checkout.orderMode,
        checkout.tableLabel,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "QPay борлуулалт бүртгэхэд алдаа гарлаа";
      setQpayMessage(message);
      setCheckoutError(message);
    } finally {
      setCheckoutSubmitting(false);
      setQpayFinalizing(false);
    }
  };

  const ensureQrTokenForTable = async (table: DiningTable) => {
    if (!selectedRegister || !table.id) {
      throw new Error("QR үүсгэхийн тулд POS register болон ширээ сонгоно уу.");
    }
    const existingToken = qrTokensByTableId[table.id] || table.qrToken;
    if (existingToken) return existingToken;

    setQrLoadingTableId(table.id);
    setQrError("");
    try {
      const result = await ensureRestaurantTableQrToken({
        branchId: selectedRegister.branchId,
        tableId: table.id,
      });
      setQrTokensByTableId((current) => ({
        ...current,
        [table.id]: result.qrToken,
      }));
      setDiningTables((current) =>
        current.map((item) =>
          item.id === table.id ? { ...item, qrToken: result.qrToken } : item,
        ),
      );
      return result.qrToken;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ширээний QR үүсгэхэд алдаа гарлаа";
      setQrError(message);
      throw error;
    } finally {
      setQrLoadingTableId("");
    }
  };

  const handleOpenQrModal = async () => {
    const table = selectedTable.id ? selectedTable : diningTables[0];
    setQrModalOpen(true);
    setQrSelectedTableId(table?.id ?? "");
    setQrError("");
    if (!table?.id) {
      setQrError("QR үүсгэх ширээ олдсонгүй.");
      return;
    }
    try {
      await ensureQrTokenForTable(table);
    } catch {
      // qrError is set by ensureQrTokenForTable.
    }
  };

  const openProductManager = () => {
    setProductManagerOpen(true);
    setProductManagerMode("new");
    setCatalogError("");
    setMenuProductCategory("HOT");
    setMenuProductStation("HOT_KITCHEN");
    setMenuProductPreparationMinutes("15");
    setNewProductName("");
    setNewProductPrice("");
    setNewProductStock("100");
  };

  const readPreparationMinutes = () => {
    const value = Math.floor(Number(menuProductPreparationMinutes || 0));
    return Number.isFinite(value) ? Math.min(1440, Math.max(0, value)) : 0;
  };

  const handleEnableMenuProduct = async (product: RestaurantPosProduct) => {
    setProductManagerSaving(true);
    setCatalogError("");
    try {
      await enableRestaurantMenuProduct({
        productId: product.id,
        menuCategory: menuProductCategory,
        kitchenStation: menuProductStation,
        preparationMinutes: readPreparationMinutes(),
      });
      setNotice(`"${product.name}" рестораны менюд нэмэгдлээ.`);
      setProductManagerOpen(false);
      await loadMenu();
      await loadCatalogProducts();
    } catch (error) {
      setCatalogError(
        error instanceof Error ? error.message : "Менюд нэмэхэд алдаа гарлаа",
      );
    } finally {
      setProductManagerSaving(false);
    }
  };

  const handleCreateMenuProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user.organizationId) {
      setCatalogError("Байгууллагын мэдээлэл олдсонгүй.");
      return;
    }

    const name = newProductName.trim();
    const price = Number(newProductPrice);
    const stock = Math.floor(Number(newProductStock || 0));
    if (!name) {
      setCatalogError("Хоолны нэр оруулна уу.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setCatalogError("Үнэ буруу байна.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setCatalogError("Үлдэгдэл 0-ээс багагүй байх ёстой.");
      return;
    }

    setProductManagerSaving(true);
    setCatalogError("");
    try {
      await createRestaurantMenuProduct({
        organizationId: user.organizationId,
        name,
        price,
        stock,
        menuCategory: menuProductCategory,
        kitchenStation: menuProductStation,
        preparationMinutes: readPreparationMinutes(),
      });
      setNotice(`"${name}" шинээр үүсэж, рестораны менюд нэмэгдлээ.`);
      setProductManagerOpen(false);
      await loadMenu();
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Шинэ хоол үүсгэхэд алдаа гарлаа",
      );
    } finally {
      setProductManagerSaving(false);
    }
  };

  const openCreateTableModal = () => {
    setNewTableLabel("");
    setNewTableZone(selectedTable.zone || "Гол заал");
    setNewTableSeats("4");
    setTableCreateError("");
    setTableCreateOpen(true);
  };

  const handleCreateTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRegister) {
      setTableCreateError("Ширээ нэмэхийн тулд POS register сонгоно уу.");
      return;
    }

    const label = newTableLabel.trim();
    const zone = newTableZone.trim() || "Гол заал";
    const seats = Math.floor(Number(newTableSeats || 4));
    if (!label) {
      setTableCreateError("Ширээний нэр оруулна уу.");
      return;
    }
    if (!Number.isFinite(seats) || seats < 1) {
      setTableCreateError("Суудлын тоо 1-ээс их байх ёстой.");
      return;
    }

    setTableCreating(true);
    setTableCreateError("");
    try {
      const created = await createRestaurantDiningTable({
        branchId: selectedRegister.branchId,
        label,
        zone,
        seats,
      });
      const mapped = mapDiningTable(created);
      setDiningTables((current) => [...current, mapped]);
      setSelectedTableId(mapped.id);
      const qrToken = mapped.qrToken;
      if (qrToken) {
        setQrTokensByTableId((current) => ({
          ...current,
          [mapped.id]: qrToken,
        }));
      }
      setTableCreateOpen(false);
      setNotice(`Ширээ ${mapped.label} нэмэгдлээ.`);
      void loadTables({ silent: true });
    } catch (error) {
      setTableCreateError(
        error instanceof Error ? error.message : "Ширээ нэмэхэд алдаа гарлаа",
      );
    } finally {
      setTableCreating(false);
    }
  };

  const copyQrMenuUrl = async () => {
    if (!qrMenuUrl) return;
    try {
      await navigator.clipboard.writeText(qrMenuUrl);
      setNotice(`Ширээ ${qrSelectedTable.label} QR menu link хуулагдлаа.`);
    } catch {
      setQrError("Link хуулах боломжгүй байна. Доорх URL-г гараар хуулна уу.");
    }
  };

  const printQrMenu = () => {
    if (!qrMenuUrl || typeof document === "undefined") return;
    const qrSvgMarkup =
      qrPrintRef.current?.querySelector("svg")?.outerHTML || "";
    if (!qrSvgMarkup) {
      setQrError("QR бүрэн үүсээгүй байна. Дахин оролдоно уу.");
      return;
    }
    const qrInstruction = "QR уншуулан захиалгаа өгнө үү";

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 800);
    };

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
      }, 80);
    };

    iframe.srcdoc = `<!doctype html>
      <html lang="mn">
        <head>
          <meta charset="utf-8" />
          <title>Table QR ${escapeReceiptHtml(qrSelectedTable.label)}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #111827;
              background: #fff;
              font-family: "Segoe UI", Arial, Helvetica, sans-serif;
              text-align: center;
              min-height: calc(100vh - 24mm);
              display: flex;
              align-items: flex-start;
              justify-content: center;
              padding-top: 8mm;
            }
            .card {
              width: 82mm;
              border: 1.4pt solid #111827;
              border-radius: 14pt;
              padding: 8mm 7mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4mm;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            h1 { margin: 0; font-size: 14pt; font-weight: 700; line-height: 1.2; }
            p { margin: 0; line-height: 1.35; }
            .branch { margin-top: 1mm; font-size: 9pt; font-weight: 500; color: #4b5563; }
            .table { font-size: 27pt; font-weight: 800; line-height: 1; }
            .qr-note { max-width: 68mm; font-size: 14pt; font-weight: 700; line-height: 1.25; }
            .qr-box {
              display: flex;
              width: 58mm;
              height: 58mm;
              align-items: center;
              justify-content: center;
            }
            .qr-box svg {
              display: block;
              width: 58mm !important;
              height: 58mm !important;
            }
            .url { max-width: 68mm; overflow-wrap: anywhere; font-size: 6pt; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="card">
            <div>
              <h1>${escapeReceiptHtml(user.organizationName || "MGL Store Restaurant")}</h1>
              <p class="branch">${escapeReceiptHtml(selectedRegister?.branch.name || "")}</p>
            </div>
            <div class="table">${escapeReceiptHtml(qrSelectedTable.label)}</div>
            <p class="qr-note">${escapeReceiptHtml(qrInstruction)}</p>
            <div class="qr-box">${qrSvgMarkup}</div>
            <p class="url">${escapeReceiptHtml(qrMenuUrl)}</p>
          </div>
        </body>
      </html>`;

    document.body.appendChild(iframe);
  };

  const handleRegisterChange = (registerId: string) => {
    if (qpayPaymentActive) {
      setCheckoutError("QPay төлбөрийн цонх нээлттэй байна. Эхлээд хаана уу.");
      return;
    }
    if (shift?.registerId && shift.registerId !== registerId) {
      setSetupError(
        "Нээлттэй ээлжтэй үед өөр POS касс сонгох боломжгүй. Эхлээд ээлжээ хаана уу.",
      );
      return;
    }
    setSelectedRegisterId(registerId);
    setDiningTables([]);
    setSelectedTableId("");
    setTicketLines([]);
    setCheckoutError("");
    setNotice("");
    setCustomerDisplaySuccess(null);
    setCardMessage("");
    setCardSetupError("");
    setSelectedCreditBorrowerId("");
    setCreditSearch("");
    setCreditBorrowersError("");
    setQrSelectedTableId("");
    setQrTokensByTableId({});
    setQrError("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGISTER_STORAGE_KEY, registerId);
    }
  };

  const handleTableSelect = (table: DiningTable) => {
    if (
      ticketSaving ||
      kitchenSubmitting ||
      checkoutSubmitting ||
      clearSubmitting ||
      qpayPaymentActive
    )
      return;
    setSelectedTableId(table.id);
    setTicketLines(mapTicketLines(table.currentTicket, menuItems));
    setOrderMode(table.currentTicket?.orderMode ?? "DINE_IN");
    setCheckoutError("");
    setNotice("");
    setCustomerDisplaySuccess(null);
    setSelectedCreditBorrowerId("");
    setCreditSearch("");
  };

  const handleOrderModeChange = async (mode: OrderMode) => {
    if (selectedTicketPaid || qpayPaymentActive) return;
    setOrderMode(mode);
    setCheckoutError("");
    setNotice("");
    if (ticketLines.length === 0 && !selectedTable.currentTicket) return;
    try {
      await persistTicketLines(ticketLines, mode);
    } catch {
      setOrderMode(selectedTable.currentTicket?.orderMode ?? "DINE_IN");
    }
  };

  const handleSendKitchen = async () => {
    if (!canSendKitchen || orderMode !== "DINE_IN") return;
    setKitchenSubmitting(true);
    setCheckoutError("");
    setNotice("");
    try {
      const savedTicket = await persistTicketLines(ticketLines);
      if (!savedTicket) {
        throw new Error("Гал тогоо руу илгээх ticket олдсонгүй.");
      }
      const result = await sendRestaurantTicketToKitchen(savedTicket.id);
      updateTableTicket(selectedTable.id, result.ticket);
      setTicketLines(mapTicketLines(result.ticket, menuItems));
      const kitchenTicketNumbers = (
        result.kitchenTickets?.length
          ? result.kitchenTickets
          : [result.kitchenTicket]
      )
        .map((ticket) => ticket.kitchenTicketNo)
        .join(", ");
      setNotice(`Гал тогоо руу илгээлээ: ${kitchenTicketNumbers}`);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Гал тогоо руу илгээхэд алдаа гарлаа",
      );
    } finally {
      setKitchenSubmitting(false);
    }
  };

  const handleOpenShift = async () => {
    if (!selectedRegister) return;
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setSetupError("Эхлэх бэлэн мөнгө 0 эсвэл түүнээс их байна.");
      return;
    }

    setShiftSubmitting(true);
    setSetupError("");
    try {
      const opened = await openRestaurantPosShift({
        branchId: selectedRegister.branchId,
        registerId: selectedRegister.id,
        openingCash: amount,
      });
      setShift(opened);
      setShowOpenShift(false);
      setNotice("Кассын ээлж амжилттай нээгдлээ.");
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Ээлж нээхэд алдаа гарлаа",
      );
    } finally {
      setShiftSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    if (diningTables.some((table) => table.currentTicket)) {
      setSetupError(
        "Чөлөөлөөгүй ширээний ticket байна. Ээлж хаахаас өмнө бүх төлбөрийг дуусгаад ширээг чөлөөлнө үү.",
      );
      return;
    }
    const activeCashCount = hasCountedCash ? countedCashItems : undefined;
    if (!activeCashCount && !closingCash.trim()) {
      setSetupError("Хаалтын бэлэн мөнгөний дүнг оруулна уу.");
      return;
    }
    const amount = activeCashCount ? countedCashTotal : Number(closingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setSetupError("Хаалтын бэлэн мөнгө 0 эсвэл түүнээс их байна.");
      return;
    }

    setShiftSubmitting(true);
    setSetupError("");
    try {
      const latestSummary = await refreshCashDrawerSummary();
      if (!latestSummary) {
        throw new Error("Хаалтын тооцоог шинэчилж чадсангүй.");
      }
      const latestDifference = roundMoney(amount - latestSummary.expectedCash);
      const confirmed = window.confirm(
        [
          "Ээлжийг хаах уу?",
          `Тооцоолсон бэлэн: ${formatMoney(latestSummary.expectedCash)}`,
          `Тоолсон бэлэн: ${formatMoney(amount)}`,
          `Зөрүү: ${formatMoney(latestDifference)}`,
        ].join("\n"),
      );
      if (!confirmed) return;
      await closeRestaurantPosShift({
        shiftId: shift.id,
        closingCash: amount,
        cashCount: activeCashCount,
        note: shiftNote.trim() || undefined,
      });
      setShift(null);
      setShowCloseShift(false);
      setClosingCash("");
      setCashCounts({});
      setDrawerSummary(null);
      setDrawerError("");
      setShiftNote("");
      setNotice("Кассын ээлж амжилттай хаагдлаа.");
      setShowOpenShift(false);
      setShowShiftHistory(true);
      void loadShiftHistory();
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Ээлж хаахад алдаа гарлаа",
      );
    } finally {
      setShiftSubmitting(false);
    }
  };

  const updateRegisterInState = (updated: RestaurantPosRegister) => {
    setRegisters((current) =>
      current.map((register) =>
        register.id === updated.id ? { ...register, ...updated } : register,
      ),
    );
  };

  const handleConnectCardTerminal = async () => {
    if (!selectedRegister) {
      setCardSetupError("POS register сонгоно уу.");
      return;
    }

    setCardSetupSubmitting(true);
    setCardSetupError("");
    setCheckoutError("");
    try {
      const updated =
        cardSetupProvider === "ANDROID_PGW"
          ? await connectRestaurantCardTerminal({
              registerId: selectedRegister.id,
              providerType: "ANDROID_PGW",
              terminalBridgeUrl:
                cardSetupBridgeUrl.trim() || DEFAULT_ANDROID_PGW_BRIDGE_URL,
            })
          : await connectRestaurantCardTerminal({
              registerId: selectedRegister.id,
              providerType: "MINU_AGENT",
              cardTerminalId: cardSetupTerminalId.trim(),
              minuAgentUsername: cardSetupMinuUsername.trim() || undefined,
              minuAgentPassword: cardSetupMinuPassword.trim() || undefined,
              minuAgentBranchId: cardSetupMinuBranchId.trim() || undefined,
            });
      updateRegisterInState(updated);
      setCardSetupMinuPassword("");
      setNotice(`${updated.cardProviderType || cardSetupProvider} terminal холбогдлоо.`);
      setCardMessage("Картын terminal бэлэн боллоо.");
    } catch (error) {
      setCardSetupError(
        error instanceof Error ? error.message : "Terminal холбох үед алдаа гарлаа",
      );
    } finally {
      setCardSetupSubmitting(false);
    }
  };

  const authorizeCardPayment = async (amount: number): Promise<CardAttempt> => {
    if (!selectedRegister || !user.organizationId) {
      throw new Error("POS register шаардлагатай.");
    }
    const provider = getEffectiveCardProvider(selectedRegister);
    if (!provider || !selectedRegister.cardEnabled) {
      throw new Error("Картын terminal холбогдоогүй байна.");
    }
    if (provider === "ANDROID_PGW" && !selectedRegister.terminalBridgeUrl) {
      throw new Error(
        "ANDROID_PGW Bridge URL тохируулаагүй байна. http://127.0.0.1:7420 оруулна уу.",
      );
    }
    if (provider !== "ANDROID_PGW" && !selectedRegister.cardTerminalId) {
      throw new Error(`${provider} terminalId тохируулаагүй байна.`);
    }

    const run: CardPaymentRun = {
      abortController: new AbortController(),
      cancelled: false,
    };
    cardPaymentRunRef.current?.abortController.abort();
    if (cardPaymentRunRef.current) {
      cardPaymentRunRef.current.cancelled = true;
    }
    cardPaymentRunRef.current = run;

    const isCancelled = () => run.cancelled || cardPaymentRunRef.current !== run;
    const terminalId = selectedRegister.cardTerminalId || "terminal-1";
    const useClientBridge =
      provider === "ANDROID_PGW" && Boolean(selectedRegister.terminalBridgeUrl);

    setCardProcessing(true);
    setCardMessage(
      provider === "ANDROID_PGW"
        ? "Android PGW terminal руу төлбөр илгээж байна..."
        : `${provider} terminal дээр карт уншуулна уу...`,
    );

    try {
      const attempt = await createRestaurantCardAttempt({
        amount,
        terminalId,
        bridgeUrl: useClientBridge ? selectedRegister.terminalBridgeUrl : null,
        registerId: selectedRegister.id,
        organizationId: user.organizationId,
        clientBridge: useClientBridge,
      });
      if (isCancelled()) throw new Error("Картын төлбөр цуцлагдлаа.");

      let approvedAttempt = attempt;
      if (useClientBridge) {
        try {
          const bridgeResult = await chargeRestaurantClientBridge({
            bridgeUrl: selectedRegister.terminalBridgeUrl!,
            attemptId: attempt.attemptId,
            amount,
            terminalId,
            signal: run.abortController.signal,
          });
          if (isCancelled()) throw new Error("Картын төлбөр цуцлагдлаа.");
          approvedAttempt = await submitRestaurantClientBridgeResult({
            attemptId: attempt.attemptId,
            result: bridgeResult,
          });
        } catch (bridgeError) {
          if (isCancelled()) throw bridgeError;
          const message =
            bridgeError instanceof Error
              ? bridgeError.message
              : "Картын terminal холболтын алдаа гарлаа";
          approvedAttempt = await submitRestaurantClientBridgeResult({
            attemptId: attempt.attemptId,
            result: { status: "FAILED", message },
          }).catch(() => ({ ...attempt, status: "FAILED" as const, message }));
        }
      } else {
        const maxPolls = terminalNeedsWaitingOverlay(provider) ? 150 : 8;
        for (let index = 0; index < maxPolls; index += 1) {
          if (isCancelled()) throw new Error("Картын төлбөр цуцлагдлаа.");
          if (approvedAttempt.status === "APPROVED") break;
          if (
            approvedAttempt.status === "DECLINED" ||
            approvedAttempt.status === "FAILED"
          ) {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          approvedAttempt = await getRestaurantCardAttemptStatus(attempt.attemptId);
        }
      }

      if (approvedAttempt.status !== "APPROVED") {
        throw new Error(
          approvedAttempt.message ||
            (approvedAttempt.status === "PENDING"
              ? "Terminal төлбөр баталгаажаагүй байна."
              : "Картын төлбөр амжилтгүй боллоо."),
        );
      }

      setCardMessage("Картын төлбөр амжилттай баталгаажлаа.");
      return approvedAttempt;
    } finally {
      if (cardPaymentRunRef.current === run) {
        cardPaymentRunRef.current = null;
      }
      setCardProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedRegister || !shift || !user.organizationId) {
      setCheckoutError("POS register болон нээлттэй ээлж шаардлагатай.");
      return;
    }
    if (!shiftMatchesRegister) {
      setCheckoutError("Нээлттэй ээлж сонгосон POS касстай таарахгүй байна.");
      return;
    }
    if (paymentMethod === "CARD" && !cardTerminalReady) {
      setCheckoutError(
        "Картын terminal холбогдоогүй байна. Доорх хэсгээс Android PGW эсвэл Minu Agent холбоно уу.",
      );
      return;
    }
    if (paymentMethod === "CREDIT" && !selectedCreditBorrower) {
      setCheckoutError("Зээлээр бүртгэхийн тулд бүртгэлтэй зээлдэгч сонгоно уу.");
      return;
    }
    if (qpayPending) {
      setCheckoutError("QPay төлбөр хүлээгдэж байна.");
      return;
    }
    if (ticketLines.some((line) => line.qty > line.available)) {
      setCheckoutError("Зарим хоолны үлдэгдэл хүрэлцэхгүй байна.");
      return;
    }
    setCheckoutSubmitting(true);
    setCheckoutError("");
    setNotice("");
    setCustomerDisplaySuccess(null);
    setQpayMessage("");
    try {
      const savedTicket = await persistTicketLines(ticketLines);
      if (!savedTicket) {
        throw new Error("Төлбөр хийх ticket олдсонгүй.");
      }

      const saleLines = buildSaleLines(ticketLines);
      const saleNote = buildSaleNote(
        ticketLines,
        orderMode,
        selectedTable.label,
      );

      if (paymentMethod === "QPAY") {
        const invoice = await createRestaurantQPayInvoice({
          amount: total,
          registerId: selectedRegister.id,
          organizationId: user.organizationId,
        });
        qpayFinalizedInvoiceRef.current = null;
        setQpayCheckout({
          invoice,
          ticket: savedTicket,
          amount: total,
          note: saleNote,
          lines: saleLines,
          orderMode,
          tableLabel: selectedTable.label,
        });
        setQpayMessage("QPay QR уншуулж төлбөрөө төлнө үү.");
        return;
      }

      if (paymentMethod === "CARD") {
        const cardAttempt = await authorizeCardPayment(total);
        const receipt = await createRestaurantCardSale({
          shiftId: shift.id,
          branchId: selectedRegister.branchId,
          registerId: selectedRegister.id,
          organizationId: user.organizationId,
          restaurantTicketId: savedTicket.id,
          clientSaleId: createClientSaleId(),
          total,
          note: saleNote,
          lines: saleLines,
          cardAttemptId: cardAttempt.attemptId,
          cardTransactionId: cardAttempt.transactionId,
        });
        await completePaidSale(
          receipt,
          savedTicket,
          orderMode,
          selectedTable.label,
        );
        return;
      }

      if (paymentMethod === "CREDIT") {
        if (!selectedCreditBorrower) {
          throw new Error("Зээлээр бүртгэх зээлдэгч сонгогдоогүй байна.");
        }

        const receipt = await createRestaurantCreditSale({
          shiftId: shift.id,
          branchId: selectedRegister.branchId,
          registerId: selectedRegister.id,
          organizationId: user.organizationId,
          restaurantTicketId: savedTicket.id,
          clientSaleId: createClientSaleId(),
          total,
          note: saleNote,
          lines: saleLines,
          credit: buildCreditPaymentMeta(selectedCreditBorrower, total),
        });
        setSelectedCreditBorrowerId("");
        setCreditNote("");
        void loadCreditBorrowers();
        void loadCreditSales();
        await completePaidSale(
          receipt,
          savedTicket,
          orderMode,
          selectedTable.label,
        );
        return;
      }

      const receipt = await createRestaurantCashSale({
        shiftId: shift.id,
        branchId: selectedRegister.branchId,
        registerId: selectedRegister.id,
        organizationId: user.organizationId,
        restaurantTicketId: savedTicket.id,
        clientSaleId: createClientSaleId(),
        total,
        note: saleNote,
        lines: saleLines,
      });
      await completePaidSale(
        receipt,
        savedTicket,
        orderMode,
        selectedTable.label,
      );
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Борлуулалт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handlePayCreditCash = async (credit: RestaurantCreditSale) => {
    if (!shift || !selectedRegister || !shiftMatchesRegister) {
      setCreditSalesError(
        "Зээлийн төлөлт авахын тулд энэ рестораны кассын ээлж нээлттэй байх ёстой.",
      );
      return;
    }

    const dueAmount = Number(credit.totalDue || 0);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Зээлийн төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(credit.id);
    setCreditRepaymentMessage("");
    setCreditSalesError("");
    try {
      await payRestaurantCreditSale({
        creditSaleId: credit.id,
        amount: dueAmount,
        paymentMethod: "CASH",
        shiftId: shift.id,
        note: `Restaurant credit repayment ${credit.receiptNo}`,
      });
      setCreditSales((current) =>
        current.filter((item) => item.id !== credit.id),
      );
      setCreditRepaymentMessage(
        `${credit.borrowerName} зээлийн төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      setNotice(
        `${credit.borrowerName} зээлийн төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      void loadCreditSales();
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "Зээлийн төлөлт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const handleStartCreditQPay = async (credit: RestaurantCreditSale) => {
    if (!selectedRegister || !user.organizationId) {
      setCreditSalesError(
        "QPay төлөлт үүсгэхийн тулд POS register сонгогдсон байх ёстой.",
      );
      return;
    }
    if (qpayPaymentActive || creditQPayRepayment) {
      setCreditSalesError("Өөр QPay төлбөр нээлттэй байна. Эхлээд хаана уу.");
      return;
    }

    const dueAmount = Number(credit.totalDue || 0);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Зээлийн төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(credit.id);
    setCreditRepaymentMessage("");
    setCreditQPayMessage("");
    setCreditSalesError("");
    try {
      const invoice = await createRestaurantQPayInvoice({
        amount: dueAmount,
        registerId: selectedRegister.id,
        organizationId: user.organizationId,
      });
      creditQPayFinalizedInvoiceRef.current = null;
      setCreditQPayRepayment({
        credit,
        credits: [credit],
        invoice,
        amount: dueAmount,
        note: `Restaurant credit QPay repayment ${credit.receiptNo}`,
      });
      setCreditQPayMessage("QPay QR уншуулж зээлийн төлбөрөө төлнө үү.");
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "QPay төлөлт үүсгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const handlePayCreditCard = async (credit: RestaurantCreditSale) => {
    if (!selectedRegister || !user.organizationId) {
      setCreditSalesError(
        "Картын төлөлт авахын тулд POS register сонгогдсон байх ёстой.",
      );
      return;
    }
    if (!cardTerminalReady) {
      setCreditSalesError(
        "Картын terminal холбогдоогүй байна. Dashboard > Тохиргоо > POS terminal дээрээс холбоно уу.",
      );
      return;
    }
    if (qpayPaymentActive || creditQPayRepayment) {
      setCreditSalesError("Өөр төлбөр нээлттэй байна. Эхлээд хаана уу.");
      return;
    }

    const dueAmount = Number(credit.totalDue || 0);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Зээлийн төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(credit.id);
    setCreditRepaymentMessage("");
    setCreditSalesError("");
    try {
      const attempt = await authorizeCardPayment(dueAmount);
      await payRestaurantCreditSale({
        creditSaleId: credit.id,
        amount: dueAmount,
        paymentMethod: "CARD",
        cardAttemptId: attempt.attemptId,
        note: `Restaurant credit card repayment ${credit.receiptNo}`,
      });
      setCreditSales((current) =>
        current.filter((item) => item.id !== credit.id),
      );
      setCreditRepaymentMessage(
        `${credit.borrowerName} зээлийн картын төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      setNotice(
        `${credit.borrowerName} зээлийн картын төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      void loadCreditSales();
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "Картын зээлийн төлөлт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const handlePayCreditGroupCash = async (group: RestaurantCreditSaleGroup) => {
    if (!shift || !selectedRegister || !shiftMatchesRegister) {
      setCreditSalesError(
        "Нийт зээлийн төлөлт авахын тулд энэ рестораны кассын ээлж нээлттэй байх ёстой.",
      );
      return;
    }
    if (group.credits.length < 2) {
      setCreditSalesError("Нийт төлөхөд 2 буюу түүнээс олон зээл хэрэгтэй.");
      return;
    }
    const dueAmount = roundMoney(group.totalDue);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Нийт төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(`group:${group.key}`);
    setCreditRepaymentMessage("");
    setCreditSalesError("");
    try {
      await payRestaurantCreditSalesBulk({
        creditSaleIds: group.credits.map((credit) => credit.id),
        amount: dueAmount,
        paymentMethod: "CASH",
        shiftId: shift.id,
        note: `Restaurant bulk credit cash repayment ${group.borrowerName}`,
      });
      const paidCreditIds = new Set(group.credits.map((credit) => credit.id));
      setCreditSales((current) =>
        current.filter((item) => !paidCreditIds.has(item.id)),
      );
      setCreditRepaymentMessage(
        `${group.borrowerName} нийт ${group.credits.length} зээлийн бэлэн төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      setNotice(
        `${group.borrowerName} нийт ${group.credits.length} зээлийн бэлэн төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      void loadCreditSales();
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "Нийт зээлийн төлөлт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const handlePayCreditGroupCard = async (group: RestaurantCreditSaleGroup) => {
    if (!selectedRegister || !user.organizationId) {
      setCreditSalesError(
        "Картын төлөлт авахын тулд POS register сонгогдсон байх ёстой.",
      );
      return;
    }
    if (!cardTerminalReady) {
      setCreditSalesError(
        "Картын terminal холбогдоогүй байна. Dashboard > Тохиргоо > POS terminal дээрээс холбоно уу.",
      );
      return;
    }
    if (group.credits.length < 2) {
      setCreditSalesError("Нийт төлөхөд 2 буюу түүнээс олон зээл хэрэгтэй.");
      return;
    }
    if (qpayPaymentActive || creditQPayRepayment) {
      setCreditSalesError("Өөр төлбөр нээлттэй байна. Эхлээд хаана уу.");
      return;
    }

    const dueAmount = roundMoney(group.totalDue);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Нийт төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(`group:${group.key}`);
    setCreditRepaymentMessage("");
    setCreditSalesError("");
    try {
      const attempt = await authorizeCardPayment(dueAmount);
      await payRestaurantCreditSalesBulk({
        creditSaleIds: group.credits.map((credit) => credit.id),
        amount: dueAmount,
        paymentMethod: "CARD",
        cardAttemptId: attempt.attemptId,
        note: `Restaurant bulk credit card repayment ${group.borrowerName}`,
      });
      const paidCreditIds = new Set(group.credits.map((credit) => credit.id));
      setCreditSales((current) =>
        current.filter((item) => !paidCreditIds.has(item.id)),
      );
      setCreditRepaymentMessage(
        `${group.borrowerName} нийт ${group.credits.length} зээлийн картын төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      setNotice(
        `${group.borrowerName} нийт ${group.credits.length} зээлийн картын төлөлт ${formatMoney(dueAmount)} амжилттай бүртгэгдлээ.`,
      );
      void loadCreditSales();
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "Картын нийт зээлийн төлөлт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const handleStartCreditGroupQPay = async (
    group: RestaurantCreditSaleGroup,
  ) => {
    if (!selectedRegister || !user.organizationId) {
      setCreditSalesError(
        "QPay төлөлт үүсгэхийн тулд POS register сонгогдсон байх ёстой.",
      );
      return;
    }
    if (group.credits.length < 2) {
      setCreditSalesError("Нийт төлөхөд 2 буюу түүнээс олон зээл хэрэгтэй.");
      return;
    }
    if (qpayPaymentActive || creditQPayRepayment) {
      setCreditSalesError("Өөр QPay төлбөр нээлттэй байна. Эхлээд хаана уу.");
      return;
    }

    const dueAmount = roundMoney(group.totalDue);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setCreditSalesError("Нийт төлөх дүн буруу байна.");
      return;
    }

    setCreditRepaymentId(`group:${group.key}`);
    setCreditRepaymentMessage("");
    setCreditQPayMessage("");
    setCreditSalesError("");
    try {
      const invoice = await createRestaurantQPayInvoice({
        amount: dueAmount,
        registerId: selectedRegister.id,
        organizationId: user.organizationId,
      });
      creditQPayFinalizedInvoiceRef.current = null;
      setCreditQPayRepayment({
        credit: group.credits[0]!,
        credits: group.credits,
        invoice,
        amount: dueAmount,
        note: `Restaurant bulk credit QPay repayment ${group.borrowerName}`,
      });
      setCreditQPayMessage(
        "QPay QR уншуулж нийт зээлийн төлбөрөө төлнө үү.",
      );
    } catch (error) {
      setCreditSalesError(
        error instanceof Error
          ? error.message
          : "QPay нийт төлөлт үүсгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditRepaymentId("");
    }
  };

  const finalizeCreditQPayRepayment = async (
    repayment: PendingCreditQPayRepayment,
    paidInvoice: RestaurantPosQPayInvoice,
  ) => {
    if (creditQPayFinalizing) return;

    setCreditQPayFinalizing(true);
    setCreditQPayMessage("QPay төлбөр баталгаажлаа. Зээлийг хааж байна...");
    try {
      if (repayment.credits.length > 1) {
        await payRestaurantCreditSalesBulk({
          creditSaleIds: repayment.credits.map((credit) => credit.id),
          amount: repayment.amount,
          paymentMethod: "QPAY",
          qpayInvoiceId: paidInvoice.invoiceId,
          note: repayment.note,
        });
      } else {
        await payRestaurantCreditSale({
          creditSaleId: repayment.credit.id,
          amount: repayment.amount,
          paymentMethod: "QPAY",
          qpayInvoiceId: paidInvoice.invoiceId,
          note: repayment.note,
        });
      }
      const paidCreditIds = new Set(
        repayment.credits.map((credit) => credit.id),
      );
      setCreditSales((current) =>
        current.filter((item) => !paidCreditIds.has(item.id)),
      );
      setCreditQPayRepayment(null);
      setCreditQPayMessage("");
      const repaymentLabel =
        repayment.credits.length > 1
          ? `${repayment.credit.borrowerName} нийт ${repayment.credits.length} зээл`
          : `${repayment.credit.borrowerName} зээлийн`;
      setCreditRepaymentMessage(
        `${repaymentLabel} QPay төлөлт ${formatMoney(repayment.amount)} амжилттай бүртгэгдлээ.`,
      );
      setNotice(
        `${repaymentLabel} QPay төлөлт ${formatMoney(repayment.amount)} амжилттай бүртгэгдлээ.`,
      );
      void loadCreditSales();
    } catch (error) {
      setCreditQPayMessage(
        error instanceof Error
          ? error.message
          : "QPay зээлийн төлөлт бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setCreditQPayFinalizing(false);
    }
  };

  const checkCreditQPayRepaymentStatus = async (
    repayment: PendingCreditQPayRepayment,
    options?: { silent?: boolean },
  ) => {
    if (!options?.silent) {
      setCreditQPayChecking(true);
    }
    try {
      const status = await getRestaurantQPayInvoiceStatus(
        repayment.invoice.invoiceId,
      );
      const nextInvoice: RestaurantPosQPayInvoice = {
        ...repayment.invoice,
        ...status,
        qrImage: status.qrImage || repayment.invoice.qrImage,
        deepLinks: status.deepLinks || repayment.invoice.deepLinks,
      };

      setCreditQPayRepayment((current) =>
        current?.invoice.invoiceId === repayment.invoice.invoiceId
          ? { ...current, invoice: nextInvoice }
          : current,
      );

      if (nextInvoice.status === "PAID") {
        setCreditQPayMessage("QPay төлбөр баталгаажлаа.");
        if (creditQPayFinalizedInvoiceRef.current !== nextInvoice.invoiceId) {
          creditQPayFinalizedInvoiceRef.current = nextInvoice.invoiceId;
          await finalizeCreditQPayRepayment(repayment, nextInvoice);
        }
      } else if (nextInvoice.status === "EXPIRED") {
        setCreditQPayMessage(
          "QPay invoice хугацаа дууссан байна. Дахин QPay үүсгэнэ үү.",
        );
      } else {
        setCreditQPayMessage("QPay төлбөр хүлээгдэж байна...");
      }
    } catch (error) {
      if (!options?.silent) {
        setCreditQPayMessage(
          error instanceof Error
            ? error.message
            : "QPay төлбөр шалгахад алдаа гарлаа",
        );
      }
    } finally {
      if (!options?.silent) {
        setCreditQPayChecking(false);
      }
    }
  };

  useEffect(() => {
    if (
      !creditQPayRepayment ||
      creditQPayRepayment.invoice.status !== "PENDING"
    )
      return;
    const repayment = creditQPayRepayment;
    const timer = window.setInterval(() => {
      void checkCreditQPayRepaymentStatus(repayment, { silent: true });
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [
    creditQPayRepayment?.invoice.invoiceId,
    creditQPayRepayment?.invoice.status,
  ]);

  const checkQPayCheckoutStatus = async (
    checkout: PendingQPayCheckout,
    options?: { silent?: boolean },
  ) => {
    if (!options?.silent) {
      setQpayChecking(true);
    }
    try {
      const status = await getRestaurantQPayInvoiceStatus(
        checkout.invoice.invoiceId,
      );
      const nextInvoice: RestaurantPosQPayInvoice = {
        ...checkout.invoice,
        ...status,
        qrImage: status.qrImage || checkout.invoice.qrImage,
        deepLinks: status.deepLinks || checkout.invoice.deepLinks,
      };

      setQpayCheckout((current) =>
        current?.invoice.invoiceId === checkout.invoice.invoiceId
          ? { ...current, invoice: nextInvoice }
          : current,
      );

      if (nextInvoice.status === "PAID") {
        setQpayMessage("QPay төлбөр баталгаажлаа.");
        if (qpayFinalizedInvoiceRef.current !== nextInvoice.invoiceId) {
          qpayFinalizedInvoiceRef.current = nextInvoice.invoiceId;
          await finalizeQPayCheckout(checkout, nextInvoice);
        }
      } else if (nextInvoice.status === "EXPIRED") {
        setQpayMessage("QPay invoice хугацаа дууссан байна. Дахин үүсгэнэ үү.");
      } else {
        setQpayMessage("QPay төлбөр хүлээгдэж байна...");
      }
    } catch (error) {
      if (!options?.silent) {
        setQpayMessage(
          error instanceof Error
            ? error.message
            : "QPay төлбөр шалгахад алдаа гарлаа",
        );
      }
    } finally {
      if (!options?.silent) {
        setQpayChecking(false);
      }
    }
  };

  useEffect(() => {
    if (!qpayCheckout || qpayCheckout.invoice.status !== "PENDING") return;
    const checkout = qpayCheckout;
    const timer = window.setInterval(() => {
      void checkQPayCheckoutStatus(checkout, { silent: true });
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [qpayCheckout?.invoice.invoiceId, qpayCheckout?.invoice.status]);

  const handleClearTable = async (options?: { forceCancel?: boolean }) => {
    if (
      !selectedRegister ||
      !selectedTable.id ||
      (!selectedTicketPaid && !options?.forceCancel)
    )
      return;

    setClearSubmitting(true);
    setCheckoutError("");
    setNotice("");
    try {
      const table = await clearRestaurantDiningTable({
        branchId: selectedRegister.branchId,
        tableId: selectedTable.id,
        forceCancel: options?.forceCancel,
      });
      setDiningTables((current) =>
        current.map((item) =>
          item.id === table.id ? mapDiningTable(table) : item,
        ),
      );
      setTicketLines([]);
      setOrderMode("DINE_IN");
      setCustomerDisplaySuccess(null);
      setNotice(
        options?.forceCancel
          ? `Ширээ ${table.label} дээрх ticket цуцлагдаж, ширээ сул боллоо.`
          : `Ширээ ${table.label} чөлөөлөгдлөө.`,
      );
      void loadTables({ silent: true });
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Ширээ чөлөөлөхөд алдаа гарлаа",
      );
    } finally {
      setClearSubmitting(false);
    }
  };

  const addItem = async (item: MenuItem) => {
    if (
      !selectedTable.id ||
      ticketSaving ||
      Boolean(cancellingLineId) ||
      selectedTicketPaid ||
      qpayPaymentActive
    )
      return;
    const existing = ticketLines.find((line) => line.id === item.id);
    if (existing && existing.qty >= item.available) {
      setNotice(`"${item.name}" хоолны үлдэгдэл хүрэлцэхгүй байна.`);
      return;
    }

    setCustomerDisplaySuccess(null);

    const nextLines = existing
      ? ticketLines.map((line) =>
          line.id === item.id ? { ...line, qty: line.qty + 1 } : line,
        )
      : [
          ...ticketLines,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            qty: 1,
            sentQty: 0,
            note: "",
            available: item.available,
            taxRate: item.taxRate,
            tone: item.tone,
            imageUrl: item.imageUrl,
          },
        ];
    try {
      await persistTicketLines(nextLines);
    } catch {
      // Error state and server reload are handled by persistTicketLines.
    }
  };

  const changeQty = async (lineId: string, delta: number) => {
    if (
      ticketSaving ||
      Boolean(cancellingLineId) ||
      selectedTicketPaid ||
      qpayPaymentActive
    )
      return;
    const target = ticketLines.find((line) => line.id === lineId);
    if (target && target.qty + delta > target.available) {
      setNotice(`"${target.name}" хоолны үлдэгдэл хүрэлцэхгүй байна.`);
      return;
    }
    if (target && target.qty + delta < target.sentQty) {
      setNotice(
        `"${target.name}" гал тогоонд ${target.sentQty}ш илгээгдсэн тул түүнээс багасгах боломжгүй.`,
      );
      return;
    }

    setCustomerDisplaySuccess(null);

    const nextLines = ticketLines
      .map((line) => {
        if (line.id !== lineId) return line;
        return { ...line, qty: Math.max(0, line.qty + delta) };
      })
      .filter((line) => line.qty > 0);
    try {
      await persistTicketLines(nextLines);
    } catch {
      // Error state and server reload are handled by persistTicketLines.
    }
  };

  const removeLine = async (lineId: string) => {
    if (
      ticketSaving ||
      Boolean(cancellingLineId) ||
      selectedTicketPaid ||
      qpayPaymentActive
    )
      return;
    const target = ticketLines.find((line) => line.id === lineId);
    if (!target) return;

    if (target.sentQty > 0) {
      if (
        !selectedRegister ||
        !selectedTable.currentTicket?.id ||
        !target.ticketItemId
      ) {
        return;
      }

      setCancellingLineId(lineId);
      setCustomerDisplaySuccess(null);
      setCheckoutError("");
      setNotice("");
      try {
        const ticket = await cancelRestaurantTicketItem({
          branchId: selectedRegister.branchId,
          ticketId: selectedTable.currentTicket.id,
          itemId: target.ticketItemId,
        });
        updateTableTicket(selectedTable.id, ticket);
        setTicketLines(mapTicketLines(ticket, menuItems));
        setNotice(
          ticket
            ? `"${target.name}" цуцлагдлаа. Гал тогооны дэлгэц шинэчлэгдэнэ.`
            : `"${target.name}" цуцлагдаж, ширээ сул боллоо.`,
        );
        void loadTables({ silent: true });
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : "Хоол цуцлахад алдаа гарлаа",
        );
        await loadTables({ silent: true });
      } finally {
        setCancellingLineId("");
      }
      return;
    }

    const nextLines = ticketLines.filter((line) => line.id !== lineId);
    setCustomerDisplaySuccess(null);
    try {
      await persistTicketLines(nextLines);
    } catch {
      // Error state and server reload are handled by persistTicketLines.
    }
  };

  const updateNote = (lineId: string, note: string) => {
    if (selectedTicketPaid || qpayPaymentActive || Boolean(cancellingLineId))
      return;
    setTicketLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, note } : line)),
    );
  };

  const saveCurrentNotes = async () => {
    if (
      ticketSaving ||
      Boolean(cancellingLineId) ||
      selectedTicketPaid ||
      qpayPaymentActive ||
      ticketLines.length === 0
    )
      return;
    try {
      await persistTicketLines(ticketLines);
    } catch {
      // Error state and server reload are handled by persistTicketLines.
    }
  };

  const openCustomerDisplay = () => {
    if (typeof window === "undefined") return;
    window.open(
      "/restaurant-customer-display",
      "mgl-restaurant-customer-display",
      "width=1180,height=760,noopener,noreferrer",
    );
  };

  return (
    <section className="relative h-full overflow-hidden bg-[#202331] text-slate-100 shadow-2xl shadow-slate-950/20">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_430px] bg-[#222532] max-xl:grid-cols-1 max-xl:overflow-y-auto">
        <main className="flex min-h-0 flex-col px-7 py-5 max-xl:min-h-[760px] max-md:px-4">
          <header className="flex shrink-0 flex-col gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1b1d2b] px-3 text-sm font-bold text-slate-200 transition hover:border-sky-400/60 hover:text-white"
                  aria-label="Буцах"
                  title="Буцах"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Буцах
                </Link>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-400 text-white">
                  <UtensilsCrossed className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-semibold tracking-normal text-white">
                    Ресторан касс
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    {selectedRegister?.branch.name || "Салбар сонгоогүй"} ·{" "}
                    {shiftMatchesRegister ? "Ээлж нээлттэй" : "Ээлж хаалттай"} ·
                    Ширээ {selectedTable.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleOpenQrModal()}
                disabled={!selectedRegister || diningTables.length === 0}
                className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-emerald-300/40 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-600"
              >
                <QrCode className="h-4 w-4" />
                QR хэвлэх
              </button>
              <button
                type="button"
                onClick={openCustomerDisplay}
                className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-sky-300/40 px-4 text-sm font-black text-sky-100 transition hover:bg-sky-300 hover:text-slate-950"
              >
                <Monitor className="h-4 w-4" />
                Хэрэглэгчийн дэлгэц
              </button>
              <Link
                href="/dashboard/kitchen-display"
                className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-amber-300/40 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
              >
                <ChefHat className="h-4 w-4" />
                Гал тогоо
              </Link>
              <select
                value={selectedRegisterId}
                onChange={(event) => handleRegisterChange(event.target.value)}
                disabled={
                  setupLoading ||
                  registers.length === 0 ||
                  Boolean(shift?.registerId)
                }
                className="h-12 min-w-48 rounded-lg border border-white/10 bg-[#303442] px-3 text-sm font-bold text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="POS касс сонгох"
              >
                {registers.length === 0 ? (
                  <option value="">POS касс байхгүй</option>
                ) : null}
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.branch.name} · {register.label || register.name}
                  </option>
                ))}
              </select>

              {shiftMatchesRegister ? (
                <button
                  type="button"
                  onClick={() => {
                    setSetupError("");
                    setDrawerError("");
                    setShowCloseShift(true);
                  }}
                  className="h-12 shrink-0 rounded-lg border border-rose-300/40 px-4 text-sm font-black text-rose-200 transition hover:bg-rose-300 hover:text-slate-950"
                >
                  Ээлж хаах
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOpenShift(true)}
                  disabled={!selectedRegister || setupLoading}
                  className="h-12 shrink-0 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Ээлж нээх
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowShiftHistory(true);
                  setShiftHistoryError("");
                }}
                className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-violet-300/40 px-4 text-sm font-black text-violet-100 transition hover:bg-violet-300 hover:text-slate-950"
              >
                <History className="h-4 w-4" />
                Хаалтын түүх
              </button>

              <label className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-12 w-full rounded-lg border border-white/5 bg-[#303442] pl-11 pr-4 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70"
                  placeholder="Хоол, ундаа хайх..."
                />
              </label>
            </div>
          </header>

          {setupLoading ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              POS кассын тохиргоо ачаалж байна...
            </div>
          ) : null}

          {setupError ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">
              <span>{setupError}</span>
              <button
                type="button"
                onClick={() => void loadPosSetup()}
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-black text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Дахин шалгах
              </button>
            </div>
          ) : null}

          {!setupLoading && registers.length === 0 ? (
            <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
              Энэ байгууллагад батлагдсан POS register алга. Admin хэсгээс
              салбар, POS register үүсгэж идэвхжүүлсний дараа касс ажиллана.
            </div>
          ) : null}

          {notice ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {notice}
            </div>
          ) : null}

          <section className="mt-4 shrink-0 rounded-lg border border-white/5 bg-[#1d1d2b] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <LayoutGrid className="h-4 w-4 text-sky-400" />
                Ширээний зураглал
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {activeTables} идэвхтэй · {diningTables.length} ширээ
                </span>
                <button
                  type="button"
                  onClick={openCreateTableModal}
                  disabled={!selectedRegister}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-400/10 px-3 text-xs font-black text-sky-200 transition hover:bg-sky-400 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-slate-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ширээ нэмэх
                </button>
              </div>
            </div>
            {tablesError ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-200">
                <span>{tablesError}</span>
                <button type="button" onClick={() => void loadTables()}>
                  Дахин ачаалах
                </button>
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-6 gap-2 max-2xl:grid-cols-3 max-md:grid-cols-2">
              {tablesLoading ? (
                <div className="col-span-full flex h-16 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ширээ ачаалж байна...
                </div>
              ) : (
                diningTables.map((table) => {
                  const isSelected = table.id === selectedTable.id;
                  const displayStatus =
                    isSelected && ticketLines.length > 0
                      ? table.status === "FREE"
                        ? "OPEN"
                        : table.status
                      : table.status;
                  const displayTotal =
                    isSelected && ticketLines.length > 0
                      ? subtotal
                      : table.total;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => handleTableSelect(table)}
                      disabled={
                        ticketSaving ||
                        kitchenSubmitting ||
                        checkoutSubmitting ||
                        clearSubmitting ||
                        qpayPaymentActive
                      }
                      className={`h-16 rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-sky-400 bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                          : `${tableStatusStyles[displayStatus]} hover:border-sky-400/50`
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-black leading-none">
                          {table.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold opacity-80">
                          <Users className="h-3 w-3" />
                          {table.seats}
                        </span>
                      </span>
                      <span className="mt-2 block truncate text-xs font-bold opacity-90">
                        {tableStatusCopy[displayStatus]}
                        {displayTotal > 0
                          ? ` · ${formatMoney(displayTotal)}`
                          : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <div className="mt-4 flex shrink-0 items-center justify-between gap-4">
            <div className="flex min-w-0 gap-7 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative h-9 shrink-0 text-sm font-bold transition ${
                    activeCategory === category.id
                      ? "text-sky-400"
                      : "text-slate-200 hover:text-white"
                  }`}
                >
                  {category.label}
                  {activeCategory === category.id ? (
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-sky-400" />
                  ) : null}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/5 bg-[#1d1d2b] px-4 text-sm font-bold text-slate-100 transition hover:bg-[#292b3b]"
            >
              <ChevronDown className="h-4 w-4" />
              Ширээ {selectedTable.label} · {orderModeCopy[orderMode]}
            </button>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4">
              <h3 className="text-xl font-bold tracking-normal text-white">
                Меню сонгох
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-500">
                  {filteredMenu.length} item
                </p>
                <button
                  type="button"
                  onClick={() => void loadMenu()}
                  disabled={menuLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-black text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Меню шинэчлэх"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${menuLoading ? "animate-spin" : ""}`}
                  />
                  Шинэчлэх
                </button>
                <button
                  type="button"
                  onClick={openProductManager}
                  disabled={!selectedRegister}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-400/50 bg-sky-400/10 px-3 text-sm font-black text-sky-100 transition hover:bg-sky-400 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-slate-600"
                >
                  <Plus className="h-4 w-4" />
                  Хоол нэмэх
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
              </div>
            ) : menuError ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-rose-300">{menuError}</p>
                <button
                  type="button"
                  onClick={() => void loadMenu()}
                  className="mt-3 h-9 rounded-lg border border-white/10 px-4 text-sm font-bold text-slate-200 hover:bg-white/5"
                >
                  Дахин ачаалах
                </button>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center border border-dashed border-white/10 text-center">
                <ChefHat className="h-9 w-9 text-slate-600" />
                <p className="mt-3 text-sm font-bold text-slate-300">
                  {query || activeCategory !== "all"
                    ? "Тохирох хоол олдсонгүй"
                    : "Менюд хоол бүртгэгдээгүй байна"}
                </p>
                {!query && activeCategory === "all" ? (
                  <button
                    type="button"
                    onClick={openProductManager}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-sky-400 px-4 text-sm font-black text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Хоол нэмэх
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 grid min-h-0 flex-1 auto-rows-[184px] grid-cols-3 content-start gap-x-8 gap-y-5 overflow-y-auto pr-2 max-2xl:gap-x-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void addItem(item)}
                    disabled={
                      item.available <= 0 ||
                      !selectedTable.id ||
                      !shiftMatchesRegister ||
                      selectedTicketPaid ||
                      ticketSaving ||
                      kitchenSubmitting ||
                      checkoutSubmitting ||
                      clearSubmitting ||
                      qpayPaymentActive
                    }
                    className="group relative h-full rounded-lg bg-[#1d1b2b] px-5 pb-4 pt-16 text-center shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:bg-[#242235] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  >
                    <DishVisual
                      tone={item.tone}
                      size="lg"
                      imageUrl={item.imageUrl}
                      className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8"
                    />
                    <div className="flex h-full flex-col items-center justify-end">
                      <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-100">
                        {item.name}
                      </p>
                      <p className="mt-2 text-sm font-semibold tabular-nums text-slate-200">
                        {formatMoney(item.price)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {item.available > 0
                          ? `${item.available} порц боломжтой`
                          : "Дууссан"}
                      </p>
                    </div>
                    <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 text-sky-400 opacity-0 transition group-hover:opacity-100">
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col overflow-hidden bg-[#1b1726] px-5 py-4 max-xl:min-h-[720px] max-sm:px-3 max-sm:py-3">
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  {selectedTicketPaid ? "Төлсөн захиалга" : "Идэвхтэй захиалга"}
                </p>
                <h3 className="truncate text-xl font-bold text-white">
                  Ширээ {selectedTable.label}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedTable.zone} · {selectedTable.seats} суудал
                </p>
              </div>
              <span
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-black ${
                  shiftMatchesRegister
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-amber-300/10 text-amber-200"
                }`}
              >
                {shiftMatchesRegister ? "Ээлж нээлттэй" : "Ээлж хаалттай"}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["DINE_IN", "TO_GO", "DELIVERY"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void handleOrderModeChange(mode)}
                  disabled={
                    ticketSaving ||
                    kitchenSubmitting ||
                    selectedTicketPaid ||
                    qpayPaymentActive
                  }
                  className={`h-10 rounded-lg border text-sm font-bold transition ${
                    orderMode === mode
                      ? "border-sky-400 bg-sky-400 text-white"
                      : "border-white/10 bg-transparent text-sky-400 hover:bg-white/5"
                  }`}
                >
                  {orderModeCopy[mode]}
                </button>
              ))}
            </div>

            {orderMode === "DINE_IN" ? (
              <button
                type="button"
                onClick={() => void handleSendKitchen()}
                disabled={!canSendKitchen}
                title={
                  hasUnsentItems
                    ? "Шинэ хоолнуудыг гал тогоо руу илгээх"
                    : selectedTicketPaid
                      ? "Төлөгдсөн ticket-ийг гал тогоо руу илгээх боломжгүй"
                      : "Гал тогоо руу илгээх шинэ хоол байхгүй"
                }
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-300/10 text-sm font-black text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
              >
                {kitchenSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChefHat className="h-4 w-4" />
                )}
                {kitchenSubmitting
                  ? "Гал тогоо руу илгээж байна..."
                  : "Гал тогоо руу илгээх"}
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2.5 text-xs font-bold leading-5 text-sky-100">
                Төлбөр амжилттай бүртгэгдсэний дараа захиалга гал тогоо руу
                автоматаар илгээгдэнэ.
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm font-bold text-slate-200">
              <span>Сагсны бараа</span>
              <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-black text-slate-400">
                {ticketLines.length} мөр
              </span>
            </div>
          </div>

          <div className="min-h-[210px] flex-[1_1_260px] space-y-3 overflow-y-auto py-3 pr-1">
            {ticketLines.length === 0 ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                <UtensilsCrossed className="h-8 w-8 text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  Менюгээс хоол сонгоно уу
                </p>
                {lastReceipt ? (
                  <div className="mt-5 w-full rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-left">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                      Сүүлийн төлөгдсөн баримт
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {lastReceipt.receiptNo}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-100/80">
                          Төлөгдсөн ticket active захиалгаас гарсан.
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black tabular-nums text-white">
                        {formatMoney(lastReceipt.grandTotal)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => printReceipt(lastReceipt)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200/30 text-xs font-black text-emerald-100 hover:bg-emerald-300 hover:text-slate-950"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Дахин хэвлэх
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptPreviewOpen(true)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-300 text-xs font-black text-slate-950 hover:bg-emerald-200"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        Баримт харах
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              ticketLines.map((line) => {
                const cancellingLine = cancellingLineId === line.id;

                return (
                  <article
                    key={line.id}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3 shadow-sm shadow-black/10"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="pt-0.5">
                        <DishVisual
                          tone={line.tone}
                          size="sm"
                          imageUrl={line.imageUrl}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-100">
                              {line.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span>{formatMoney(line.price)}</span>
                              {line.sentQty > 0 ? (
                                <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                                  Гал тогоонд {line.sentQty}ш
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="shrink-0 text-right text-sm font-black tabular-nums text-white">
                            {formatMoney(line.price * line.qty)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="flex h-10 w-[108px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg bg-[#2d3142]">
                            <button
                              type="button"
                              onClick={() => void changeQty(line.id, -1)}
                              disabled={
                                ticketSaving ||
                                Boolean(cancellingLineId) ||
                                selectedTicketPaid ||
                                qpayPaymentActive ||
                                line.qty <= line.sentQty
                              }
                              className="flex h-full w-8 items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`${line.name} хасах`}
                              title="Хасах"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold tabular-nums text-white">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => void changeQty(line.id, 1)}
                              disabled={
                                ticketSaving ||
                                Boolean(cancellingLineId) ||
                                selectedTicketPaid ||
                                qpayPaymentActive
                              }
                              className="flex h-full w-8 items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`${line.name} нэмэх`}
                              title="Нэмэх"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <input
                            value={line.note}
                            onChange={(event) =>
                              updateNote(line.id, event.target.value)
                            }
                            onBlur={() => void saveCurrentNotes()}
                            disabled={
                              selectedTicketPaid ||
                              qpayPaymentActive ||
                              Boolean(cancellingLineId)
                            }
                            placeholder="Тэмдэглэл..."
                            className="h-10 min-w-[150px] flex-1 rounded-lg border border-white/5 bg-[#2d3142] px-3 text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/70"
                          />
                          <button
                            type="button"
                            onClick={() => void removeLine(line.id)}
                            disabled={
                              ticketSaving ||
                              Boolean(cancellingLineId) ||
                              selectedTicketPaid ||
                              qpayPaymentActive
                            }
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              line.sentQty > 0
                                ? "border-amber-300/50 text-amber-200 hover:bg-amber-300 hover:text-slate-950"
                                : "border-sky-400/70 text-sky-400 hover:bg-sky-400 hover:text-white"
                            }`}
                            aria-label={`${line.name} устгах`}
                            title={
                              line.sentQty > 0
                                ? "Гал тогоонд явсан хоол цуцлах"
                                : "Устгах"
                            }
                          >
                            {cancellingLine ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="min-h-0 max-h-[46dvh] shrink overflow-y-auto overscroll-contain border-t border-white/10 pt-4 pr-1 max-xl:max-h-[42dvh]">
            <TotalLine label="Discount" value={formatMoney(discount)} />
            <TotalLine label="Sub total" value={formatMoney(subtotal)} />
            <TotalLine label="Total" value={formatMoney(total)} strong />

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-500">
                  Төлбөрийн хэлбэр
                </p>
                <button
                  type="button"
                  onClick={openCreditList}
                  disabled={!user.organizationId}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-300/10 px-2.5 text-[11px] font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-slate-600"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  Зээлийн жагсаалт
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = paymentMethod === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (
                          option.enabled &&
                          !selectedTicketPaid &&
                          !qpayPaymentActive &&
                          !cardProcessing
                        ) {
                          setPaymentMethod(option.value);
                          setCheckoutError("");
                          if (option.value === "CREDIT") {
                            void loadCreditBorrowers();
                          }
                        }
                      }}
                      disabled={
                        !option.enabled ||
                        selectedTicketPaid ||
                        qpayPaymentActive ||
                        cardProcessing
                      }
                      title={
                        option.enabled
                          ? option.label
                          : `${option.label} төлбөр дараагийн үе шатанд холбогдоно`
                      }
                      aria-pressed={isActive}
                      className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-bold transition ${
                        isActive
                          ? "border-sky-400 bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                          : option.enabled
                            ? "border-white/10 bg-white/[0.02] text-slate-300 hover:border-sky-400/50 hover:text-white"
                            : "cursor-not-allowed border-white/5 bg-white/[0.01] text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod === "CARD" ? (
              <div className="mt-3 rounded-xl border border-sky-300/25 bg-sky-300/10 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-sky-100">
                      Картын terminal
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-sky-100/70">
                      {cardTerminalReady
                        ? `${cardTerminalLabel} · ${cardTerminalSourceLabel(selectedRegister?.cardTerminalSource)}`
                        : "Terminal холбогдоогүй байна. Android PGW bridge эсвэл Minu Agent terminal шинээр холбоно уу."}
                    </p>
                  </div>
                  {cardTerminalReady ? (
                    <span className="shrink-0 rounded-full bg-emerald-300 px-2 py-1 text-[10px] font-black text-slate-950">
                      READY
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black text-slate-950">
                      SETUP
                    </span>
                  )}
                </div>

                {cardMessage ? (
                  <p className="mt-2 rounded-lg border border-sky-200/20 bg-sky-200/10 px-3 py-2 text-xs font-bold leading-5 text-sky-50">
                    {cardMessage}
                  </p>
                ) : null}

                {!cardTerminalReady ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(["ANDROID_PGW", "MINU_AGENT"] as const).map(
                        (provider) => (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => {
                              setCardSetupProvider(provider);
                              setCardSetupError("");
                            }}
                            className={`h-9 rounded-lg border text-xs font-black transition ${
                              cardSetupProvider === provider
                                ? "border-sky-300 bg-sky-300 text-slate-950"
                                : "border-white/10 text-slate-300 hover:border-sky-300/60 hover:text-white"
                            }`}
                          >
                            {provider === "ANDROID_PGW"
                              ? "Android PGW"
                              : "Minu Agent"}
                          </button>
                        ),
                      )}
                    </div>

                    {cardSetupProvider === "ANDROID_PGW" ? (
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-100/70">
                          Bridge URL
                        </span>
                        <input
                          value={cardSetupBridgeUrl}
                          onChange={(event) =>
                            setCardSetupBridgeUrl(event.target.value)
                          }
                          placeholder={DEFAULT_ANDROID_PGW_BRIDGE_URL}
                          className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-300/70"
                        />
                      </label>
                    ) : (
                      <div className="space-y-2">
                        <input
                          value={cardSetupTerminalId}
                          onChange={(event) =>
                            setCardSetupTerminalId(event.target.value)
                          }
                          placeholder="Minu terminalId"
                          className="h-9 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-300/70"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={cardSetupMinuUsername}
                            onChange={(event) =>
                              setCardSetupMinuUsername(event.target.value)
                            }
                            placeholder={
                              selectedRegister?.minuAgentUsername ||
                              "Minu username"
                            }
                            className="h-9 rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-300/70"
                          />
                          <input
                            value={cardSetupMinuBranchId}
                            onChange={(event) =>
                              setCardSetupMinuBranchId(event.target.value)
                            }
                            placeholder={
                              selectedRegister?.minuAgentBranchId ||
                              "Minu branchId"
                            }
                            className="h-9 rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-300/70"
                          />
                        </div>
                        <input
                          value={cardSetupMinuPassword}
                          onChange={(event) =>
                            setCardSetupMinuPassword(event.target.value)
                          }
                          type="password"
                          placeholder={
                            selectedRegister?.minuAgentPasswordSet
                              ? "Password хадгалагдсан бол хоосон үлдээж болно"
                              : "Minu password"
                          }
                          className="h-9 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-300/70"
                        />
                      </div>
                    )}

                    {cardSetupError ? (
                      <p className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-100">
                        {cardSetupError}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleConnectCardTerminal()}
                      disabled={cardSetupSubmitting || !selectedRegister}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-300 text-xs font-black text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {cardSetupSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Terminal холбох
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {paymentMethod === "CREDIT" ? (
              <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-200">
                      Бүртгэлтэй зээлдэгч
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-amber-100/70">
                      Vendor POS дээр бүртгэгдсэн зээлдэгчээс сонгоно.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadCreditBorrowers()}
                    disabled={creditBorrowersLoading}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-200/30 px-2 text-[11px] font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        creditBorrowersLoading ? "animate-spin" : ""
                      }`}
                    />
                    Шинэчлэх
                  </button>
                </div>

                <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#11131d] px-3">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    value={creditSearch}
                    onChange={(event) => setCreditSearch(event.target.value)}
                    placeholder="Нэр, утас, ажилтан хайх..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </label>

                {creditBorrowersError ? (
                  <p className="mt-2 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-200">
                    {creditBorrowersError}
                  </p>
                ) : null}

                <div className="mt-3 max-h-28 space-y-2 overflow-y-auto pr-1">
                  {creditBorrowersLoading ? (
                    <div className="flex h-20 items-center justify-center gap-2 text-xs font-bold text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Зээлдэгчид ачаалж байна...
                    </div>
                  ) : filteredCreditBorrowers.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs font-bold leading-5 text-slate-500">
                      Бүртгэлтэй зээлдэгч олдсонгүй.
                    </p>
                  ) : (
                    filteredCreditBorrowers.map((borrower) => {
                      const isSelected = borrower.id === selectedCreditBorrowerId;
                      return (
                        <button
                          key={borrower.id}
                          type="button"
                          onClick={() => {
                            setSelectedCreditBorrowerId(borrower.id);
                            setCheckoutError("");
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-amber-300 bg-amber-300 text-slate-950"
                              : "border-white/10 bg-white/[0.03] text-slate-100 hover:border-amber-300/60"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black">
                              {borrower.borrowerName}
                            </span>
                            <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-black">
                              {borrower.targetType === "COMPANY"
                                ? "Байгууллага"
                                : "Хувь хүн"}
                            </span>
                          </span>
                          <span
                            className={`mt-1 block truncate text-[11px] font-semibold ${
                              isSelected ? "text-slate-800" : "text-slate-500"
                            }`}
                          >
                            {creditBorrowerSubtitle(borrower)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/70">
                      Хугацаа
                    </span>
                    <input
                      value={creditTermMonths}
                      onChange={(event) => setCreditTermMonths(event.target.value)}
                      inputMode="numeric"
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-bold text-slate-100 outline-none focus:border-amber-300/70"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/70">
                      Тэмдэглэл
                    </span>
                    <input
                      value={creditNote}
                      onChange={(event) => setCreditNote(event.target.value)}
                      placeholder="Заавал биш"
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-300/70"
                    />
                  </label>
                </div>

                <p className="mt-2 text-[11px] font-bold leading-4 text-amber-100/75">
                  Төлөх дүн {formatMoney(total)} · {safeCreditTermMonths} сар ·
                  дуусах өдөр {creditDueDateLabel}
                </p>
              </div>
            ) : null}

            {checkoutError ? (
              <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-200">
                {checkoutError}
              </p>
            ) : null}

            {selectedTicketPaid ? (
              <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3">
                <p className="text-xs font-bold leading-5 text-emerald-100">
                  {orderMode === "DINE_IN"
                    ? "Төлбөр авсан ч үйлчлүүлэгч ширээн дээр сууж байгаа гэж үзнэ. Гарсны дараа ширээг чөлөөлнө."
                    : "Төлбөр бүртгэгдэж, захиалга гал тогоо руу илгээгдсэн. Захиалгыг хүлээлгэн өгсний дараа энэ байрыг чөлөөлнө."}
                </p>
                <button
                  type="button"
                  onClick={() => void handleClearTable()}
                  disabled={clearSubmitting}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clearSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Ширээ чөлөөлөх
                </button>
              </div>
            ) : (
              <div className="mt-3">
                {selectedTicketActive ? (
                  <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
                    <p className="text-xs font-bold leading-5 text-amber-100">
                      Энэ ширээн дээр төлбөр аваагүй ticket байна. Хэрвээ
                      захиалгыг цуцлаад ширээг суллах бол доорх товчийг дарна.
                      Гал тогоонд идэвхтэй ticket байвал хамт цуцлагдаж
                      queue-ээс гарна.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handleClearTable({ forceCancel: true })
                      }
                      disabled={
                        clearSubmitting ||
                        ticketSaving ||
                        kitchenSubmitting ||
                        checkoutSubmitting ||
                        qpayPaymentActive
                      }
                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-300/50 bg-amber-300/10 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {clearSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Захиалга цуцалж ширээ суллах
                    </button>
                  </div>
                ) : null}

                {orderMode === "DINE_IN" && hasUnsentItems ? (
                  <p className="mb-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
                    Төлбөр амжилттай болсны дараа илгээгдээгүй хоолнууд гал
                    тогоо руу автоматаар явна.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={!canCheckout}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-400 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                >
                  {checkoutSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectedPaymentIcon className="h-4 w-4" />
                  )}
                  {checkoutSubmitting
                    ? "Борлуулалт бүртгэж байна..."
                    : selectedPayment.action}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {creditListOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Credit sales
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Зээлийн жагсаалт
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {selectedRegister?.branch.name || "Салбар сонгогдоогүй"} дээрх төлөгдөөгүй зээлүүд.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreditListOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 border-b border-white/10 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#11131d] px-4">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    value={creditSalesSearch}
                    onChange={(event) => setCreditSalesSearch(event.target.value)}
                    placeholder="Зээлдэгч, утас, баримт, хоолоор хайх..."
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </label>
                <div className="flex h-11 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-sm font-black text-amber-100">
                  {filteredCreditSaleGroups.length} хүн · {filteredCreditSales.length} зээл · {formatMoney(filteredCreditSalesTotalDue)}
                </div>
                <button
                  type="button"
                  onClick={() => void loadCreditSales()}
                  disabled={creditSalesLoading}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-black text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${creditSalesLoading ? "animate-spin" : ""}`}
                  />
                  Шинэчлэх
                </button>
              </div>
              {creditSales.length > 0 ? (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Нийт нээлттэй үлдэгдэл: {formatMoney(totalOpenCreditDue)}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {creditRepaymentMessage &&
              !creditSalesLoading &&
              !creditSalesError ? (
                <div className="mb-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
                  {creditRepaymentMessage}
                </div>
              ) : null}
              {creditSalesLoading ? (
                <div className="flex h-56 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Зээлийн жагсаалт ачаалж байна...
                </div>
              ) : creditSalesError ? (
                <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-200">
                  {creditSalesError}
                </div>
              ) : filteredCreditSaleGroups.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
                  <HandCoins className="h-9 w-9 text-slate-600" />
                  <p className="mt-3 text-sm font-black text-slate-300">
                    Зээл олдсонгүй
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Шинэ зээл үүсэхэд энд автоматаар харагдана.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredCreditSaleGroups.map((group) => (
                    <article
                      key={group.key}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-black text-white">
                              {group.borrowerName}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                group.overdue
                                  ? "bg-rose-300/15 text-rose-200"
                                  : "bg-emerald-300/15 text-emerald-200"
                              }`}
                            >
                              {group.overdue ? "Хугацаа хэтэрсэн" : "Нээлттэй"}
                            </span>
                            <span className="shrink-0 rounded-full bg-sky-300/10 px-2 py-0.5 text-[10px] font-black text-sky-100">
                              {group.credits.length} зээл · {group.totalLines} мөр
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {[group.borrowerPhone, group.employeeName, group.borrowerId]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-black tabular-nums text-amber-200">
                            {formatMoney(group.totalDue)}
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-slate-500">
                            нийт төлөх
                          </p>
                        </div>
                      </div>

                      {group.credits.length > 1 ? (
                        <div className="mt-3 grid gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                          <p className="text-xs font-bold text-amber-100">
                            Энэ зээлдэгчийн {group.credits.length} зээлийг нийтээр нь төлөх
                          </p>
                          <button
                            type="button"
                            onClick={() => void handlePayCreditGroupCash(group)}
                            disabled={
                              creditRepaymentId !== "" ||
                              Boolean(creditQPayRepayment) ||
                              cardProcessing ||
                              !shift ||
                              !shiftMatchesRegister
                            }
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-xs font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            <Banknote className="h-4 w-4" />
                            Нийт бэлэн
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePayCreditGroupCard(group)}
                            disabled={
                              creditRepaymentId !== "" ||
                              Boolean(creditQPayRepayment) ||
                              qpayPaymentActive ||
                              cardProcessing ||
                              !selectedRegister ||
                              !user.organizationId ||
                              !cardTerminalReady
                            }
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 text-xs font-black text-violet-100 transition hover:bg-violet-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            <CreditCard className="h-4 w-4" />
                            Нийт карт
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStartCreditGroupQPay(group)}
                            disabled={
                              creditRepaymentId !== "" ||
                              Boolean(creditQPayRepayment) ||
                              qpayPaymentActive ||
                              cardProcessing ||
                              !selectedRegister ||
                              !user.organizationId
                            }
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-300/10 px-3 text-xs font-black text-sky-100 transition hover:bg-sky-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            <QrCode className="h-4 w-4" />
                            Нийт QPay
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-3 space-y-3">
                        {group.credits.map((credit) => {
                          const visibleLines = credit.lines.slice(0, 3);
                          const hiddenLineCount = Math.max(
                            0,
                            credit.lines.length - visibleLines.length,
                          );
                          const payingThisCredit =
                            creditRepaymentId === credit.id;
                          return (
                            <div
                              key={credit.id}
                              className="rounded-xl bg-[#11131d] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-black text-slate-200">
                                    {credit.receiptNo}
                                  </p>
                                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                                    Үүссэн: {formatReceiptDate(credit.createdAt)} · Дуусах:{" "}
                                    {credit.dueDate ? formatReceiptDate(credit.dueDate) : "-"}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-black tabular-nums text-white">
                                    {formatMoney(credit.totalDue)}
                                  </p>
                                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                                    {credit.termMonths} сар
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                {visibleLines.length > 0 ? (
                                  visibleLines.map((line) => (
                                    <div
                                      key={line.id}
                                      className="flex items-center justify-between gap-3 text-xs"
                                    >
                                      <span className="min-w-0 truncate font-bold text-slate-200">
                                        {line.productName}
                                      </span>
                                      <span className="shrink-0 font-black tabular-nums text-white">
                                        {line.qty}ш · {formatMoney(line.lineTotal)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs font-bold text-slate-500">
                                    Барааны мөр байхгүй.
                                  </p>
                                )}
                                {hiddenLineCount > 0 ? (
                                  <p className="text-[11px] font-bold text-slate-500">
                                    +{hiddenLineCount} мөр нэмэлт байна
                                  </p>
                                ) : null}
                              </div>

                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handlePayCreditCash(credit)}
                                  disabled={
                                    payingThisCredit ||
                                    creditRepaymentId !== "" ||
                                    Boolean(creditQPayRepayment) ||
                                    cardProcessing ||
                                    !shift ||
                                    !shiftMatchesRegister
                                  }
                                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-300 text-xs font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                                  title={
                                    shift && shiftMatchesRegister
                                      ? "Зээлийн төлөлтийг бэлнээр бүртгэх"
                                      : "Эхлээд рестораны кассын ээлж нээнэ үү"
                                  }
                                >
                                  {payingThisCredit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Banknote className="h-4 w-4" />
                                  )}
                                  Бэлэн
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePayCreditCard(credit)}
                                  disabled={
                                    payingThisCredit ||
                                    creditRepaymentId !== "" ||
                                    Boolean(creditQPayRepayment) ||
                                    qpayPaymentActive ||
                                    cardProcessing ||
                                    !selectedRegister ||
                                    !user.organizationId ||
                                    !cardTerminalReady
                                  }
                                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-violet-300/40 bg-violet-300/10 text-xs font-black text-violet-100 transition hover:bg-violet-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                                  title={
                                    cardTerminalReady
                                      ? "Зээлийн төлөлтийг картаар авах"
                                      : "Эхлээд картын terminal холбоно уу"
                                  }
                                >
                                  {payingThisCredit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  Карт
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleStartCreditQPay(credit)}
                                  disabled={
                                    payingThisCredit ||
                                    creditRepaymentId !== "" ||
                                    Boolean(creditQPayRepayment) ||
                                    qpayPaymentActive ||
                                    cardProcessing ||
                                    !selectedRegister ||
                                    !user.organizationId
                                  }
                                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-sky-300/40 bg-sky-300/10 text-xs font-black text-sky-100 transition hover:bg-sky-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                                  title="Зээлийн төлөлтийг QPay-р авах"
                                >
                                  {payingThisCredit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <QrCode className="h-4 w-4" />
                                  )}
                                  QPay
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {creditQPayRepayment ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                  Credit QPay
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Зээлийн QPay төлөлт
                </h3>
                <p className="mt-2 truncate text-sm font-semibold text-slate-400">
                  {creditQPayRepayment.credit.borrowerName} ·{" "}
                  {formatMoney(creditQPayRepayment.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreditQPayRepayment(null);
                  setCreditQPayMessage("");
                  creditQPayFinalizedInvoiceRef.current = null;
                }}
                disabled={creditQPayFinalizing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-40"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-2xl bg-white p-5 text-slate-950">
                <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-100">
                  {creditQPayRepayment.invoice.qrImage ? (
                    <img
                      src={`data:image/png;base64,${creditQPayRepayment.invoice.qrImage}`}
                      alt="QPay QR"
                      className="h-60 w-60 object-contain"
                    />
                  ) : creditQPayRepayment.invoice.qrText ? (
                    <QrGenerator
                      value={creditQPayRepayment.invoice.qrText}
                      size={230}
                    />
                  ) : (
                    <QrCode className="h-16 w-16 text-slate-300" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Дүн
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {formatMoney(creditQPayRepayment.amount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Төлөв
                    </p>
                    <p
                      className={`mt-1 text-2xl font-black ${
                        creditQPayRepayment.invoice.status === "PAID"
                          ? "text-emerald-300"
                          : creditQPayRepayment.invoice.status === "EXPIRED"
                            ? "text-rose-300"
                            : "text-sky-300"
                      }`}
                    >
                      {creditQPayRepayment.invoice.status}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-[#1b1d2b] p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Invoice
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-bold text-slate-300">
                    {creditQPayRepayment.invoice.invoiceId}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Дуусах:{" "}
                    {new Date(
                      creditQPayRepayment.invoice.expiresAt,
                    ).toLocaleTimeString("mn-MN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {creditQPayRepayment.invoice.deepLinks?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {creditQPayRepayment.invoice.deepLinks.map(
                      (link, index) => (
                        <a
                          key={`${link.link}-${index}`}
                          href={link.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-11 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-sm font-black text-sky-100 hover:bg-sky-300 hover:text-slate-950"
                        >
                          {link.name || link.description || "Банк апп"}
                        </a>
                      ),
                    )}
                  </div>
                ) : null}

                <p
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold leading-6 ${
                    creditQPayRepayment.invoice.status === "EXPIRED"
                      ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                      : creditQPayRepayment.invoice.status === "PAID"
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        : "border-sky-300/30 bg-sky-300/10 text-sky-100"
                  }`}
                >
                  {creditQPayMessage ||
                    "QPay QR уншуулж зээлийн төлбөрөө төлнө үү."}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      void checkCreditQPayRepaymentStatus(creditQPayRepayment)
                    }
                    disabled={
                      creditQPayChecking ||
                      creditQPayFinalizing ||
                      creditQPayRepayment.invoice.status !== "PENDING"
                    }
                    className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm font-black text-slate-100 hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {creditQPayChecking || creditQPayFinalizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Төлбөр шалгах
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreditQPayRepayment(null);
                      setCreditQPayMessage("");
                      creditQPayFinalizedInvoiceRef.current = null;
                    }}
                    disabled={creditQPayFinalizing}
                    className="flex h-12 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    Хаах
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {productManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="grid max-h-[92vh] w-full max-w-5xl grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl max-lg:grid-cols-1">
            <div className="border-r border-white/10 p-5 max-lg:border-b max-lg:border-r-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                    Restaurant menu
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    Хоол нэмэх
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    Байгууллагын active product-ууд касс дээр шууд харагдана.
                    Энд зөвхөн байхгүй хоолыг шинээр үүсгэнэ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductManagerOpen(false)}
                  disabled={productManagerSaving}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-40"
                  aria-label="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {[{ value: "new" as const, label: "Шинээр" }].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setProductManagerMode(mode.value);
                      setCatalogError("");
                    }}
                    disabled={productManagerSaving}
                    className={`h-10 rounded-lg border text-sm font-black transition ${
                      productManagerMode === mode.value
                        ? "border-sky-400 bg-sky-400 text-white"
                        : "border-white/10 text-slate-300 hover:border-sky-400/50 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Ангилал
                  </span>
                  <select
                    value={menuProductCategory}
                    onChange={(event) =>
                      setMenuProductCategory(
                        event.target.value as RestaurantMenuCategory,
                      )
                    }
                    disabled={productManagerSaving}
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-sm font-bold text-slate-100 outline-none focus:border-sky-400/70"
                  >
                    {restaurantMenuCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Гал тогооны хэсэг
                  </span>
                  <select
                    value={menuProductStation}
                    onChange={(event) =>
                      setMenuProductStation(
                        event.target.value as RestaurantKitchenStation,
                      )
                    }
                    disabled={productManagerSaving}
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-sm font-bold text-slate-100 outline-none focus:border-sky-400/70"
                  >
                    {restaurantKitchenStations.map((station) => (
                      <option key={station.value} value={station.value}>
                        {station.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Бэлтгэх минут
                  </span>
                  <input
                    value={menuProductPreparationMinutes}
                    onChange={(event) =>
                      setMenuProductPreparationMinutes(event.target.value)
                    }
                    inputMode="numeric"
                    disabled={productManagerSaving}
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#11131d] px-3 text-sm font-bold text-slate-100 outline-none focus:border-sky-400/70"
                  />
                </label>
              </div>

              {catalogError ? (
                <p className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold leading-5 text-rose-200">
                  {catalogError}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 overflow-y-auto p-5">
              {productManagerMode === "existing" ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black text-white">
                        Байгаа бүтээгдэхүүнээс нэмэх
                      </h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Менюд ороогүй product-ийг сонгоод restaurant item
                        болгоно.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadCatalogProducts()}
                      disabled={catalogLoading || productManagerSaving}
                      className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-black text-slate-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          catalogLoading ? "animate-spin" : ""
                        }`}
                      />
                      Шинэчлэх
                    </button>
                  </div>

                  <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#11131d] px-4">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Product нэр, SKU, barcode хайх..."
                      className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600"
                    />
                  </label>

                  <div className="mt-4 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                    {catalogLoading ? (
                      <div className="flex h-36 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Бүтээгдэхүүн ачаалж байна...
                      </div>
                    ) : availableCatalogProducts.length === 0 ? (
                      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
                        <ChefHat className="h-8 w-8 text-slate-600" />
                        <p className="mt-3 text-sm font-bold text-slate-300">
                          Нэмэх боломжтой product олдсонгүй.
                        </p>
                        <button
                          type="button"
                          onClick={() => setProductManagerMode("new")}
                          className="mt-3 h-9 rounded-lg bg-sky-400 px-4 text-sm font-black text-white"
                        >
                          Шинээр үүсгэх
                        </button>
                      </div>
                    ) : (
                      availableCatalogProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {formatMoney(product.price)} · үлдэгдэл{" "}
                              {product.stockQty}
                              {product.sku ? ` · SKU ${product.sku}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void handleEnableMenuProduct(product)
                            }
                            disabled={productManagerSaving}
                            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-sky-400 px-3 text-sm font-black text-white hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            {productManagerSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Менюд
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateMenuProduct} className="space-y-4">
                  <div>
                    <h4 className="text-xl font-black text-white">
                      Шинэ хоол үүсгэх
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Product catalog дээр үүсээд restaurant menu-д шууд орно.
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-300">
                      Хоолны нэр
                    </span>
                    <input
                      value={newProductName}
                      onChange={(event) =>
                        setNewProductName(event.target.value)
                      }
                      placeholder="Жишээ: Chicken burger"
                      autoFocus
                      disabled={productManagerSaving}
                      className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/70 disabled:opacity-60"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-bold text-slate-300">
                        Үнэ
                      </span>
                      <input
                        value={newProductPrice}
                        onChange={(event) =>
                          setNewProductPrice(event.target.value)
                        }
                        inputMode="decimal"
                        placeholder="0"
                        disabled={productManagerSaving}
                        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/70 disabled:opacity-60"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-slate-300">
                        Үлдэгдэл / порц
                      </span>
                      <input
                        value={newProductStock}
                        onChange={(event) =>
                          setNewProductStock(event.target.value)
                        }
                        inputMode="numeric"
                        disabled={productManagerSaving}
                        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none focus:border-sky-400/70 disabled:opacity-60"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setProductManagerOpen(false)}
                      disabled={productManagerSaving}
                      className="flex h-12 items-center justify-center rounded-lg border border-white/10 text-sm font-black text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Болих
                    </button>
                    <button
                      type="submit"
                      disabled={productManagerSaving}
                      className="flex h-12 items-center justify-center gap-2 rounded-lg bg-sky-400 text-sm font-black text-white transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {productManagerSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Үүсгээд нэмэх
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tableCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTable}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                  Restaurant table
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Ширээ нэмэх
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Шинэ ширээ зураглал дээр нэмэгдэж, QR token автоматаар үүснэ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTableCreateOpen(false)}
                disabled={tableCreating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-40"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Ширээний нэр
                </span>
                <input
                  value={newTableLabel}
                  onChange={(event) => setNewTableLabel(event.target.value)}
                  placeholder="Жишээ: A5, VIP 2"
                  autoFocus
                  disabled={tableCreating}
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/70 disabled:opacity-60"
                />
              </label>

              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <label className="block">
                  <span className="text-sm font-bold text-slate-300">
                    Бүс / заал
                  </span>
                  <input
                    value={newTableZone}
                    onChange={(event) => setNewTableZone(event.target.value)}
                    placeholder="Гол заал"
                    disabled={tableCreating}
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/70 disabled:opacity-60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-300">
                    Суудал
                  </span>
                  <input
                    value={newTableSeats}
                    onChange={(event) => setNewTableSeats(event.target.value)}
                    inputMode="numeric"
                    disabled={tableCreating}
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none focus:border-sky-400/70 disabled:opacity-60"
                  />
                </label>
              </div>

              {tableCreateError ? (
                <p className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold leading-5 text-rose-200">
                  {tableCreateError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTableCreateOpen(false)}
                  disabled={tableCreating}
                  className="flex h-12 items-center justify-center rounded-lg border border-white/10 text-sm font-black text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={tableCreating}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-sky-400 text-sm font-black text-white transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {tableCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Нэмэх
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {qrModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="grid max-h-[92vh] w-full max-w-5xl grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl max-lg:grid-cols-1">
            <div className="min-h-0 border-r border-white/10 p-5 max-lg:border-b max-lg:border-r-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    QR menu
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    Сонгосон ширээний QR
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    Энэ ширээний нэг QR-г хэвлээд бодит ширээн дээр байрлуулна.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                  aria-label="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 max-h-[58vh] space-y-2 overflow-y-auto pr-1 max-lg:max-h-52">
                {diningTables.map((table) => {
                  const isActive = table.id === qrSelectedTable.id;
                  const loadingQr = qrLoadingTableId === table.id;
                  const hasQr = Boolean(
                    qrTokensByTableId[table.id] || table.qrToken,
                  );

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => {
                        setQrSelectedTableId(table.id);
                        setQrError("");
                        void ensureQrTokenForTable(table);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-emerald-300 bg-emerald-300/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-emerald-300/50"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-black">
                          Ширээ {table.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                          {table.zone} · {table.seats} суудал
                        </span>
                      </span>
                      {loadingQr ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      ) : hasQr ? (
                        <QrCode className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Plus className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-6">
              <div className="rounded-2xl border border-white/10 bg-[#1b1d2b] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-400">
                      QR дээрх ширээ
                    </p>
                    <h4 className="mt-1 text-3xl font-black text-white">
                      {qrSelectedTable.id
                        ? `Ширээ ${qrSelectedTable.label}`
                        : "Ширээ сонгоно уу"}
                    </h4>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Scan хийхэд энэ ширээний web menu нээгдэнэ.
                    </p>
                  </div>
                  <span className="rounded-xl bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">
                    /menu/token
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-[260px_minmax(0,1fr)] gap-5 max-md:grid-cols-1">
                  <div
                    ref={qrPrintRef}
                    className="flex min-h-72 flex-col items-center justify-center rounded-2xl bg-white p-5 text-slate-950"
                  >
                    {qrMenuUrl ? (
                      <p className="qr-note mb-4 text-center text-lg font-bold leading-6 text-slate-950">
                        QR уншуулан захиалгаа өгнө үү
                      </p>
                    ) : null}
                    {qrSelectedTable.id &&
                    qrLoadingTableId === qrSelectedTable.id ? (
                      <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                    ) : qrMenuUrl ? (
                      <QrGenerator value={qrMenuUrl} size={220} />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void ensureQrTokenForTable(qrSelectedTable)
                        }
                        disabled={!qrSelectedTable.id}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        QR үүсгэх
                      </button>
                    )}
                  </div>

                  <div className="min-w-0">
                    <label className="block">
                      <span className="text-sm font-bold text-slate-300">
                        QR menu URL
                      </span>
                      <input
                        value={qrMenuUrl}
                        readOnly
                        placeholder="QR token үүсээгүй байна"
                        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#11131d] px-4 text-sm font-semibold text-slate-100 outline-none"
                      />
                    </label>

                    {qrError ? (
                      <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-bold leading-5 text-rose-200">
                        {qrError}
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => void copyQrMenuUrl()}
                        disabled={!qrMenuUrl}
                        className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm font-black text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-600"
                      >
                        <QrCode className="h-4 w-4" />
                        Link хуулах
                      </button>
                      <button
                        type="button"
                        onClick={printQrMenu}
                        disabled={!qrMenuUrl}
                        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-300 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <Printer className="h-4 w-4" />
                        Хэвлэх
                      </button>
                    </div>

                    <div className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm font-semibold leading-6 text-sky-100">
                      QR захиалга шууд гал тогооны дэлгэц рүү илгээгдэж, касс
                      дээр тухайн ширээний active order болж харагдана.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {qpayCheckout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                  QPay payment
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  QPay төлбөр
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Ширээ {qpayCheckout.tableLabel} ·{" "}
                  {formatMoney(qpayCheckout.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQpayCheckout(null);
                  setQpayMessage("");
                  qpayFinalizedInvoiceRef.current = null;
                }}
                disabled={qpayFinalizing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-40"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-2xl bg-white p-5 text-slate-950">
                <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-100">
                  {qpayCheckout.invoice.qrImage ? (
                    <img
                      src={`data:image/png;base64,${qpayCheckout.invoice.qrImage}`}
                      alt="QPay QR"
                      className="h-60 w-60 object-contain"
                    />
                  ) : qpayCheckout.invoice.qrText ? (
                    <QrGenerator
                      value={qpayCheckout.invoice.qrText}
                      size={230}
                    />
                  ) : (
                    <QrCode className="h-16 w-16 text-slate-300" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Дүн
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {formatMoney(qpayCheckout.amount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Төлөв
                    </p>
                    <p
                      className={`mt-1 text-2xl font-black ${
                        qpayCheckout.invoice.status === "PAID"
                          ? "text-emerald-300"
                          : qpayCheckout.invoice.status === "EXPIRED"
                            ? "text-rose-300"
                            : "text-sky-300"
                      }`}
                    >
                      {qpayCheckout.invoice.status}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-[#1b1d2b] p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Invoice
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-bold text-slate-300">
                    {qpayCheckout.invoice.invoiceId}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Дуусах:{" "}
                    {new Date(
                      qpayCheckout.invoice.expiresAt,
                    ).toLocaleTimeString("mn-MN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {qpayCheckout.invoice.deepLinks?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {qpayCheckout.invoice.deepLinks.map((link, index) => (
                      <a
                        key={`${link.link}-${index}`}
                        href={link.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-sm font-black text-sky-100 hover:bg-sky-300 hover:text-slate-950"
                      >
                        {link.name || link.description || "Банк апп"}
                      </a>
                    ))}
                  </div>
                ) : null}

                <p
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold leading-6 ${
                    qpayCheckout.invoice.status === "EXPIRED"
                      ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                      : qpayCheckout.invoice.status === "PAID"
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        : "border-sky-300/30 bg-sky-300/10 text-sky-100"
                  }`}
                >
                  {qpayMessage || "QPay QR уншуулж төлбөрөө төлнө үү."}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void checkQPayCheckoutStatus(qpayCheckout)}
                    disabled={
                      qpayChecking ||
                      qpayFinalizing ||
                      qpayCheckout.invoice.status !== "PENDING"
                    }
                    className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm font-black text-slate-100 hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {qpayChecking || qpayFinalizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Төлбөр шалгах
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQpayCheckout(null);
                      setQpayMessage("");
                      qpayFinalizedInvoiceRef.current = null;
                    }}
                    disabled={qpayFinalizing}
                    className="flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {qpayCheckout.invoice.status === "EXPIRED"
                      ? "Дахин үүсгэх"
                      : "Хаах"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showOpenShift && selectedRegister && !shift ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#242735] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  POS ээлж
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Ээлж нээх
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {selectedRegister.branch.name} ·{" "}
                  {selectedRegister.label || selectedRegister.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenShift(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-slate-300">
                Эхлэх бэлэн мөнгө
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#1b1d2b] px-4 text-lg font-black tabular-nums text-white outline-none focus:border-emerald-300"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleOpenShift()}
              disabled={shiftSubmitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              {shiftSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Ээлж нээх
            </button>
          </div>
        </div>
      ) : null}

      {showShiftHistory ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-violet-300">
                  POS ээлж
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Хаалтын түүх
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {selectedRegister?.branch.name || "Бүх салбар"} ·{" "}
                  {selectedShiftHistoryRange.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadShiftHistory()}
                  disabled={shiftHistoryLoading}
                  className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-black text-slate-200 hover:border-violet-300 hover:text-violet-200 disabled:opacity-60"
                >
                  {shiftHistoryLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Шинэчлэх
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftHistory(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                  aria-label="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {SHIFT_HISTORY_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setShiftHistoryRange(option.id)}
                    className={`h-9 rounded-lg px-3 text-xs font-black transition ${
                      shiftHistoryRange === option.id
                        ? "bg-violet-300 text-slate-950"
                        : "border border-white/10 text-slate-300 hover:border-violet-300 hover:text-violet-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {shiftHistoryError ? (
                <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">
                  {shiftHistoryError}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Хаалт", shiftHistory.length],
                  ["Баримт", shiftHistoryTotals.salesCount],
                  ["Нийт", shiftHistoryTotals.totalSales],
                  ["Бэлэн", shiftHistoryTotals.cashSales],
                  ["Карт", shiftHistoryTotals.cardSales],
                  ["QPay", shiftHistoryTotals.qpaySales],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/10 bg-[#1b1d2b] px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-lg font-black tabular-nums text-white">
                      {label === "Хаалт" || label === "Баримт"
                        ? Number(value).toLocaleString("mn-MN")
                        : formatMoney(Number(value) || 0)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_1.2fr]">
                <section className="min-h-0 rounded-2xl border border-white/10 bg-[#1b1d2b]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-black text-white">
                      Хаалтууд
                    </p>
                  </div>
                  <div className="max-h-[52vh] overflow-y-auto p-2">
                    {shiftHistoryLoading ? (
                      <div className="flex h-40 items-center justify-center text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : shiftHistory.length === 0 ? (
                      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm font-bold text-slate-500">
                        Хаалтын түүх алга байна.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {shiftHistory.map((item) => {
                          const selected = item.id === selectedShiftHistory?.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedShiftHistoryId(item.id)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                selected
                                  ? "border-violet-300 bg-violet-300/15"
                                  : "border-white/10 bg-[#242735] hover:border-violet-300/60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-white">
                                    {formatReceiptDate(item.closedAt || item.openedAt)}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {item.registerName || "POS касс"} · {item.cashierName || "Кассчин"}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                    item.cashDifference
                                      ? "bg-rose-300/15 text-rose-200"
                                      : "bg-emerald-300/15 text-emerald-200"
                                  }`}
                                >
                                  Зөрүү {formatMoney(item.cashDifference || 0)}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                                <span>Нийт {formatMoney(item.totalSales)}</span>
                                <span>Бэлэн {formatMoney(item.cashSales)}</span>
                                <span>Баримт {item.salesCount}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#1b1d2b] p-4">
                  {selectedShiftHistory ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-violet-300">
                            Дэлгэрэнгүй
                          </p>
                          <h4 className="mt-1 text-xl font-black text-white">
                            {formatReceiptDate(
                              selectedShiftHistory.closedAt ||
                                selectedShiftHistory.openedAt,
                            )}
                          </h4>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Нээсэн: {formatReceiptDate(selectedShiftHistory.openedAt)}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-black text-slate-300">
                          {selectedShiftHistory.branchName} ·{" "}
                          {selectedShiftHistory.registerName || "POS касс"}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["Эхлэх мөнгө", selectedShiftHistory.openingCash],
                          ["Тооцоолсон бэлэн", selectedShiftHistory.expectedCash],
                          ["Тоолсон бэлэн", selectedShiftHistory.closingCash || 0],
                          ["Зөрүү", selectedShiftHistory.cashDifference || 0],
                          ["Орлого", selectedShiftHistory.paidIn],
                          ["Зарлага", selectedShiftHistory.paidOut],
                        ].map(([label, value]) => {
                          const isDifference = label === "Зөрүү";
                          const numericValue = Number(value) || 0;
                          return (
                            <div
                              key={String(label)}
                              className="rounded-xl border border-white/10 bg-[#242735] px-4 py-3"
                            >
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                {label}
                              </p>
                              <p
                                className={`mt-1 text-base font-black tabular-nums ${
                                  isDifference && numericValue !== 0
                                    ? "text-rose-300"
                                    : "text-white"
                                }`}
                              >
                                {formatMoney(numericValue)}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#242735] p-4">
                        <p className="text-sm font-black text-white">
                          Борлуулалтын задаргаа
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[
                            ["Нийт борлуулалт", selectedShiftHistory.totalSales],
                            ["Бэлэн", selectedShiftHistory.cashSales],
                            ["Карт", selectedShiftHistory.cardSales],
                            ["QPay", selectedShiftHistory.qpaySales],
                            ["Зээл", selectedShiftHistory.creditSales],
                            ["Холимог", selectedShiftHistory.mixedSales],
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="font-bold text-slate-400">
                                {label}
                              </span>
                              <span className="font-black text-white">
                                {formatMoney(Number(value) || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedShiftHistory.cashCount?.length ? (
                        <div className="rounded-xl border border-white/10 bg-[#242735] p-4">
                          <p className="text-sm font-black text-white">
                            Дэвсгэртээр тоолсон
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {selectedShiftHistory.cashCount
                              .filter((item) => item.count > 0)
                              .map((item) => (
                                <div
                                  key={item.denomination}
                                  className="flex items-center justify-between rounded-lg bg-slate-950/30 px-3 py-2 text-xs"
                                >
                                  <span className="font-bold text-slate-400">
                                    {formatMoney(item.denomination)} × {item.count}
                                  </span>
                                  <span className="font-black text-white">
                                    {formatMoney(item.total)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}

                      {selectedShiftHistory.note ? (
                        <div className="rounded-xl border border-white/10 bg-[#242735] p-4">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Тэмдэглэл
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {selectedShiftHistory.note}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-500">
                      Сонгосон хаалт алга байна.
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCloseShift && shift ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#242735] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-300">
                  POS ээлж
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Ээлж хаах
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {selectedRegister?.branch.name || shift.branchName || "Салбар"} ·{" "}
                  {selectedRegister?.label || selectedRegister?.name || shift.registerName || "POS касс"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshCashDrawerSummary()}
                  disabled={drawerLoading}
                  className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-black text-slate-200 hover:border-sky-300 hover:text-sky-200 disabled:opacity-60"
                >
                  {drawerLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Шинэчлэх
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseShift(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                  aria-label="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {openTicketCount > 0 ? (
                <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
                  {openTicketCount} чөлөөлөөгүй ширээний ticket байна. Ээлж хаахаас өмнө төлбөрийг дуусгаад ширээг чөлөөлнө үү.
                </div>
              ) : null}

              {setupError || drawerError ? (
                <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">
                  {setupError || drawerError}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Эхлэх мөнгө", drawerSummary?.openingCash ?? shift.openingCash],
                  ["Бэлэн борлуулалт", drawerSummary?.cashSales ?? 0],
                  ["Орлого", drawerSummary?.paidIn ?? 0],
                  ["Зарлага", drawerSummary?.paidOut ?? 0],
                  ["Тооцоолсон", expectedCashPreview],
                  ["Зөрүү", closingDifferencePreview],
                ].map(([label, value]) => {
                  const isDifference = label === "Зөрүү";
                  const numericValue = Number(value) || 0;
                  return (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-white/10 bg-[#1b1d2b] px-4 py-3"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p
                        className={`mt-1 text-lg font-black tabular-nums ${
                          isDifference && numericValue !== 0
                            ? "text-rose-300"
                            : "text-white"
                        }`}
                      >
                        {formatMoney(numericValue)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <section className="rounded-2xl border border-white/10 bg-[#1b1d2b] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        Задгай мөнгө тоолох
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Дэвсгэрт бүрийн ширхэгийг оруулахад тоолсон дүн автоматаар бодогдоно.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500">
                        Тоолсон бэлэн
                      </p>
                      <p className="text-xl font-black text-emerald-300">
                        {formatMoney(countedCashTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                    {CASH_DENOMINATIONS.map((denomination) => (
                      <label
                        key={denomination}
                        className="rounded-xl border border-white/10 bg-[#242735] px-3 py-2"
                      >
                        <span className="block text-[11px] font-black text-slate-400">
                          {formatMoney(denomination)}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={cashCounts[denomination] ?? ""}
                          onChange={(event) =>
                            setCashCounts((current) => ({
                              ...current,
                              [denomination]: Math.max(
                                0,
                                Math.floor(Number(event.target.value) || 0),
                              ),
                            }))
                          }
                          placeholder="0"
                          className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 text-sm font-black tabular-nums text-white outline-none focus:border-emerald-300"
                        />
                      </label>
                    ))}
                  </div>

                  {hasCountedCash ? (
                    <button
                      type="button"
                      onClick={() => setCashCounts({})}
                      className="mt-3 text-xs font-black text-slate-400 underline-offset-4 hover:text-white hover:underline"
                    >
                      Тоололт цэвэрлэх
                    </button>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#1b1d2b] p-4">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-300">
                      Хаалтын бэлэн мөнгө
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={hasCountedCash ? String(countedCashTotal) : closingCash}
                      onChange={(event) => setClosingCash(event.target.value)}
                      disabled={hasCountedCash}
                      className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#242735] px-4 text-lg font-black tabular-nums text-white outline-none focus:border-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                    <span className="mt-2 block text-xs font-semibold text-slate-500">
                      Дэвсгэртээр тоолсон бол энэ дүн автоматаар бөглөгдөнө.
                    </span>
                  </label>

                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/20 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-400">Тооцоолсон</span>
                      <span className="font-black text-white">
                        {formatMoney(expectedCashPreview)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-400">Тоолсон</span>
                      <span className="font-black text-white">
                        {formatMoney(closingCashPreview)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                      <span className="font-black text-slate-300">Зөрүү</span>
                      <span
                        className={`font-black ${
                          closingDifferencePreview !== 0
                            ? "text-rose-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {formatMoney(closingDifferencePreview)}
                      </span>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-bold text-slate-300">
                      Тэмдэглэл
                    </span>
                    <textarea
                      value={shiftNote}
                      onChange={(event) =>
                        setShiftNote(event.target.value.slice(0, 500))
                      }
                      rows={4}
                      placeholder="Зөрүү, тайлбар байвал бичнэ..."
                      className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#242735] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-rose-300"
                    />
                  </label>
                </section>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
              <p className="text-xs font-semibold text-slate-500">
                Хаах үед тооцоог дахин шинэчилж, баталгаажуулсны дараа ээлж хаагдана.
              </p>
              <button
                type="button"
                onClick={() => void handleCloseShift()}
                disabled={shiftSubmitting || drawerLoading || openTicketCount > 0}
                className="flex h-12 min-w-40 items-center justify-center gap-2 rounded-lg bg-rose-300 px-5 font-black text-slate-950 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shiftSubmitting || drawerLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Ээлж хаах
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lastReceipt && receiptPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ReceiptText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                    Амжилттай
                  </p>
                  <h3 className="text-xl font-black">Борлуулалтын баримт</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreviewOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-950"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-semibold text-slate-500">Баримт</span>
                <span className="font-black">{lastReceipt.receiptNo}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4 text-sm">
                <span className="font-semibold text-slate-500">Салбар</span>
                <span className="font-bold">{lastReceipt.branchName}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4 text-sm">
                <span className="font-semibold text-slate-500">Төлбөр</span>
                <span className="font-bold">Бэлэн</span>
              </div>
            </div>

            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
              {lastReceipt.lines.map((line) => (
                <div
                  key={`${lastReceipt.id}-${line.productId}`}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 text-sm"
                >
                  <div>
                    <p className="font-bold">{line.name}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {line.qty} × {formatMoney(line.unitPrice)}
                    </p>
                  </div>
                  <span className="font-black">
                    {formatMoney(line.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t-2 border-slate-950 pt-4">
              <span className="text-sm font-black uppercase">Нийт</span>
              <span className="text-2xl font-black">
                {formatMoney(lastReceipt.grandTotal)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => printReceipt(lastReceipt)}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 font-black text-slate-800 hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" />
                Дахин хэвлэх
              </button>
              <button
                type="button"
                onClick={() => setReceiptPreviewOpen(false)}
                className="h-12 rounded-lg bg-slate-950 font-black text-white hover:bg-slate-800"
              >
                Дуусгах
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DishVisual({
  tone,
  size,
  imageUrl,
  className = "",
}: {
  tone: DishTone;
  size: "sm" | "lg";
  imageUrl?: string;
  className?: string;
}) {
  const sizeClass = size === "lg" ? "h-24 w-24" : "h-11 w-11";
  const innerClass = size === "lg" ? "inset-2.5" : "inset-1.5";

  return (
    <span
      className={`relative block shrink-0 rounded-full bg-slate-200 p-1 shadow-xl shadow-black/20 ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] rounded-full object-cover"
        />
      ) : (
        <>
          <span
            className={`absolute ${innerClass} rounded-full bg-gradient-to-br ${dishToneStyles[tone]}`}
          />
          <span className="absolute inset-[24%] rounded-full bg-white/30 blur-[1px]" />
          <span className="absolute left-[22%] top-[30%] h-[12%] w-[24%] rounded-full bg-white/80" />
          <span className="absolute bottom-[22%] right-[24%] h-[16%] w-[28%] rounded-full bg-emerald-400/80" />
        </>
      )}
    </span>
  );
}

function TotalLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <span
        className={
          strong ? "font-bold text-slate-200" : "font-semibold text-slate-500"
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-base font-black tabular-nums text-white"
            : "font-bold tabular-nums text-slate-100"
        }
      >
        {value}
      </span>
    </div>
  );
}
