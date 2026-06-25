"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrGenerator } from "@mgl/ui";
import {
  ArrowLeft,
  Banknote,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  CreditCard,
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
  clearRestaurantDiningTable,
  closeRestaurantPosShift,
  createRestaurantCashSale,
  createRestaurantQPayInvoice,
  createRestaurantQPaySale,
  getCurrentRestaurantPosShift,
  getRestaurantQPayInvoiceStatus,
  getRestaurantDiningTables,
  getRestaurantPosProducts,
  getRestaurantPosRegisters,
  ensureRestaurantTableQrToken,
  openRestaurantPosShift,
  saveRestaurantTicket,
  sendRestaurantTicketToKitchen,
  type RestaurantDiningTable,
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
import type { PosReceipt, PosShift } from "@mgl/types";

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
type PaymentMethod = "CASH" | "CARD" | "QPAY";

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
    enabled: false,
  },
  {
    value: "QPAY",
    label: "QPay",
    action: "QPay нэхэмжлэх үүсгэх",
    icon: QrCode,
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
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;
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
  const [shiftNote, setShiftNote] = useState("");
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
  const [ticketLines, setTicketLines] = useState<TicketLine[]>([]);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [kitchenSubmitting, setKitchenSubmitting] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [clearSubmitting, setClearSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [qpayCheckout, setQpayCheckout] = useState<PendingQPayCheckout | null>(
    null,
  );
  const [qpayChecking, setQpayChecking] = useState(false);
  const [qpayFinalizing, setQpayFinalizing] = useState(false);
  const [qpayMessage, setQpayMessage] = useState("");
  const [customerDisplaySuccess, setCustomerDisplaySuccess] =
    useState<RestaurantCustomerDisplaySuccess | null>(null);
  const [notice, setNotice] = useState("");
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
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

  const selectedRegister = useMemo(
    () =>
      registers.find((register) => register.id === selectedRegisterId) ?? null,
    [registers, selectedRegisterId],
  );
  const shiftMatchesRegister =
    Boolean(shift?.registerId) && shift?.registerId === selectedRegister?.id;

  const selectedTable =
    diningTables.find((table) => table.id === selectedTableId) ??
    diningTables[0] ??
    EMPTY_DINING_TABLE;
  const activeTables = diningTables.filter(
    (table) => table.status !== "FREE",
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
      );
      const nextItems = products
        .filter(
          (product) =>
            product.isActive &&
            product.isRestaurantMenuItem &&
            product.menuCategory,
        )
        .map((product) => {
          const category = menuCategoryMap[product.menuCategory!];
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
  const qpayPending = qpayCheckout?.invoice.status === "PENDING";
  const qpayPaymentActive = Boolean(qpayCheckout);
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
    paymentMethod !== "CARD" &&
    !qpayPaymentActive &&
    !checkoutSubmitting &&
    !qpayFinalizing &&
    !ticketSaving &&
    !kitchenSubmitting &&
    !clearSubmitting &&
    (orderMode !== "DINE_IN" || !hasUnsentItems);
  const canSendKitchen =
    orderMode === "DINE_IN" &&
    Boolean(selectedTable.currentTicket || ticketLines.length > 0) &&
    Boolean(shiftMatchesRegister) &&
    !selectedTicketPaid &&
    !qpayPaymentActive &&
    hasUnsentItems &&
    !ticketSaving &&
    !kitchenSubmitting &&
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
    if (!customerDisplaySuccess) return;
    const timer = window.setTimeout(
      () => setCustomerDisplaySuccess(null),
      10_000,
    );
    return () => window.clearTimeout(timer);
  }, [customerDisplaySuccess]);

  useEffect(() => {
    const payload: RestaurantCustomerDisplayPayload = {
      organizationName: user.organizationName || "MGL Store Restaurant",
      branchName: selectedRegister?.branch.name || "Салбар сонгогдоогүй",
      registerName:
        selectedRegister?.label || selectedRegister?.name || "Restaurant POS",
      tableLabel: selectedTable.label,
      orderMode,
      paymentMethod,
      lines: ticketLines.map((line) => ({
        id: line.id,
        name: line.name,
        qty: line.qty,
        sentQty: line.sentQty,
        unitPrice: line.price,
        lineTotal: line.price * line.qty,
        note: line.note.trim() || undefined,
        imageUrl: line.imageUrl,
      })),
      totals: {
        subtotal,
        discount,
        total,
      },
      qpay: qpayCheckout
        ? {
            invoiceId: qpayCheckout.invoice.invoiceId,
            amount: qpayCheckout.amount,
            qrText: qpayCheckout.invoice.qrText,
            qrImage: qpayCheckout.invoice.qrImage,
            status: qpayCheckout.invoice.status,
            expiresAt: qpayCheckout.invoice.expiresAt,
            deepLinks: qpayCheckout.invoice.deepLinks,
          }
        : null,
      message: qpayMessage || notice,
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
    const qrMarkup = qrPrintRef.current?.innerHTML || "";
    if (!qrMarkup) {
      window.print();
      return;
    }

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
            @page { size: 90mm 120mm; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #111827;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
              text-align: center;
            }
            .card {
              min-height: 100mm;
              border: 2px solid #111827;
              border-radius: 18px;
              padding: 12mm 6mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 5mm;
            }
            h1 { margin: 0; font-size: 20px; }
            p { margin: 0; font-size: 12px; line-height: 1.45; }
            .table { font-size: 32px; font-weight: 800; }
            .url { max-width: 70mm; overflow-wrap: anywhere; font-size: 9px; color: #4b5563; }
            svg { width: 54mm; height: 54mm; }
          </style>
        </head>
        <body>
          <div class="card">
            <div>
              <h1>${escapeReceiptHtml(user.organizationName || "MGL Store Restaurant")}</h1>
              <p>${escapeReceiptHtml(selectedRegister?.branch.name || "")}</p>
            </div>
            <div class="table">${escapeReceiptHtml(qrSelectedTable.label)}</div>
            <div>${qrMarkup}</div>
            <p>QR уншуулаад менюгээсээ захиална уу</p>
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
    if (!closingCash.trim()) {
      setSetupError("Хаалтын бэлэн мөнгөний дүнг оруулна уу.");
      return;
    }
    const amount = Number(closingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setSetupError("Хаалтын бэлэн мөнгө 0 эсвэл түүнээс их байна.");
      return;
    }

    setShiftSubmitting(true);
    setSetupError("");
    try {
      await closeRestaurantPosShift({
        shiftId: shift.id,
        closingCash: amount,
        note: shiftNote.trim() || undefined,
      });
      setShift(null);
      setShowCloseShift(false);
      setClosingCash("");
      setShiftNote("");
      setNotice("Кассын ээлж амжилттай хаагдлаа.");
      setShowOpenShift(true);
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Ээлж хаахад алдаа гарлаа",
      );
    } finally {
      setShiftSubmitting(false);
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
    if (paymentMethod === "CARD") {
      setCheckoutError("Картын төлбөр дараагийн үе шатанд холбогдоно.");
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
    if (orderMode === "DINE_IN" && hasUnsentItems) {
      setCheckoutError(
        "Заалны захиалгын бүх хоолыг төлбөр авахаас өмнө гал тогоо руу илгээнэ үү.",
      );
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
    if (ticketSaving || selectedTicketPaid || qpayPaymentActive) return;
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
    if (ticketSaving || selectedTicketPaid || qpayPaymentActive) return;
    const target = ticketLines.find((line) => line.id === lineId);
    if (!target) return;

    if (target.sentQty > 0) {
      if (target.qty <= target.sentQty) {
        setNotice(
          `"${target.name}" гал тогоонд ${target.sentQty}ш илгээгдсэн тул сагснаас шууд устгах боломжгүй. Цуцлалт хийх flow дараагийн алхамд хэрэгтэй.`,
        );
        return;
      }

      const nextLines = ticketLines.map((line) =>
        line.id === lineId ? { ...line, qty: line.sentQty } : line,
      );
      setCustomerDisplaySuccess(null);
      setNotice(
        `"${target.name}"-ийн гал тогоонд илгээгдээгүй ${target.qty - target.sentQty}ш хасагдлаа.`,
      );
      try {
        await persistTicketLines(nextLines);
      } catch {
        // Error state and server reload are handled by persistTicketLines.
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
    if (selectedTicketPaid || qpayPaymentActive) return;
    setTicketLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, note } : line)),
    );
  };

  const saveCurrentNotes = async () => {
    if (
      ticketSaving ||
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
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_390px] bg-[#222532] max-xl:grid-cols-1 max-xl:overflow-y-auto">
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
                  onClick={() => setShowCloseShift(true)}
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
              <span className="text-xs font-bold text-slate-500">
                {activeTables} идэвхтэй · {diningTables.length} ширээ
              </span>
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
              <p className="text-sm font-semibold text-slate-500">
                {filteredMenu.length} item
              </p>
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
                  <Link
                    href="/dashboard/products"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-sky-400 px-4 text-sm font-black text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Хоол нэмэх
                  </Link>
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

        <aside className="flex min-h-0 flex-col bg-[#1b1726] px-6 py-5 max-xl:min-h-[660px]">
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {selectedTicketPaid ? "Төлсөн захиалга" : "Идэвхтэй захиалга"}
                </p>
                <h3 className="text-xl font-bold text-white">
                  Ширээ {selectedTable.label}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedTable.zone} · {selectedTable.seats} суудал
                </p>
              </div>
              <span
                className={`rounded-lg px-3 py-1 text-xs font-black ${
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

            <div className="mt-4 grid grid-cols-[1fr_70px_74px] border-b border-white/10 pb-3 text-sm font-bold text-slate-200">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
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
              ticketLines.map((line) => (
                <article key={line.id} className="space-y-3">
                  <div className="grid grid-cols-[1fr_54px_72px] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DishVisual
                        tone={line.tone}
                        size="sm"
                        imageUrl={line.imageUrl}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-100">
                          {line.name}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {formatMoney(line.price)}
                        </p>
                        {line.sentQty > 0 ? (
                          <p className="mt-0.5 text-[10px] font-black text-amber-300">
                            Гал тогоонд {line.sentQty}ш
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex h-12 items-center justify-center gap-1 rounded-lg bg-[#2d3142]">
                      <button
                        type="button"
                        onClick={() => void changeQty(line.id, -1)}
                        disabled={
                          ticketSaving ||
                          selectedTicketPaid ||
                          qpayPaymentActive ||
                          line.qty <= line.sentQty
                        }
                        className="flex h-8 w-5 items-center justify-center text-slate-400 hover:text-white"
                        aria-label={`${line.name} хасах`}
                        title="Хасах"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums text-white">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => void changeQty(line.id, 1)}
                        disabled={
                          ticketSaving ||
                          selectedTicketPaid ||
                          qpayPaymentActive
                        }
                        className="flex h-8 w-5 items-center justify-center text-slate-400 hover:text-white"
                        aria-label={`${line.name} нэмэх`}
                        title="Нэмэх"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-right text-sm font-bold tabular-nums text-white">
                      {formatMoney(line.price * line.qty)}
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_54px] gap-3">
                    <input
                      value={line.note}
                      onChange={(event) =>
                        updateNote(line.id, event.target.value)
                      }
                      onBlur={() => void saveCurrentNotes()}
                      disabled={selectedTicketPaid || qpayPaymentActive}
                      placeholder="Захиалгын тэмдэглэл..."
                      className="h-12 rounded-lg border border-white/5 bg-[#2d3142] px-4 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/70"
                    />
                    <button
                      type="button"
                      onClick={() => void removeLine(line.id)}
                      disabled={
                        ticketSaving || selectedTicketPaid || qpayPaymentActive
                      }
                      className={`flex h-12 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        line.sentQty > 0
                          ? "border-amber-300/50 text-amber-200 hover:bg-amber-300 hover:text-slate-950"
                          : "border-sky-400/70 text-sky-400 hover:bg-sky-400 hover:text-white"
                      }`}
                      aria-label={`${line.name} устгах`}
                      title="Устгах"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 pt-5">
            <TotalLine label="Discount" value={formatMoney(discount)} />
            <TotalLine label="Sub total" value={formatMoney(subtotal)} />
            <TotalLine label="Total" value={formatMoney(total)} strong />

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-slate-500">
                Төлбөрийн хэлбэр
              </p>
              <div className="grid grid-cols-3 gap-2">
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
                          !qpayPaymentActive
                        ) {
                          setPaymentMethod(option.value);
                          setCheckoutError("");
                        }
                      }}
                      disabled={
                        !option.enabled ||
                        selectedTicketPaid ||
                        qpayPaymentActive
                      }
                      title={
                        option.enabled
                          ? option.label
                          : `${option.label} төлбөр дараагийн үе шатанд холбогдоно`
                      }
                      aria-pressed={isActive}
                      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-bold transition ${
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
                      Гал тогоонд идэвхтэй ticket байвал систем цуцлахгүй.
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
                    Төлбөр авахаас өмнө бүх хоолыг гал тогоо руу илгээнэ үү.
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
                    className="flex min-h-72 items-center justify-center rounded-2xl bg-white p-5 text-slate-950"
                  >
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

      {showCloseShift && shift ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#242735] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-300">
                  POS ээлж
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  Ээлж хаах
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Тоолж дууссан бэлэн мөнгөний дүнг оруулна уу.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShift(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-slate-300">
                Хаалтын бэлэн мөнгө
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={closingCash}
                onChange={(event) => setClosingCash(event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#1b1d2b] px-4 text-lg font-black tabular-nums text-white outline-none focus:border-rose-300"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-300">
                Тэмдэглэл
              </span>
              <textarea
                value={shiftNote}
                onChange={(event) => setShiftNote(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#1b1d2b] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-rose-300"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleCloseShift()}
              disabled={shiftSubmitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-rose-300 font-black text-slate-950 hover:bg-rose-200 disabled:opacity-60"
            >
              {shiftSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Ээлж хаах
            </button>
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
