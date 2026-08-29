import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ProfileOrder } from "./types";

const STATUS_STEPS = [
  "CONFIRMED",
  "PREPARED",
  "SHIPPING",
  "COMPLETED",
] as const;
const STEP_LABELS = ["Баталгаажсан", "Бэлтгэсэн", "Хүргэлтэнд", "Авсан"];
const ALL_YEARS = "ALL";
const ALL_MONTHS = "ALL";
const TODAY_FILTER = "TODAY";
const CUSTOM_FILTER = "CUSTOM";
const MONTH_LABELS = [
  "1 сар",
  "2 сар",
  "3 сар",
  "4 сар",
  "5 сар",
  "6 сар",
  "7 сар",
  "8 сар",
  "9 сар",
  "10 сар",
  "11 сар",
  "12 сар",
];

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Төлбөр хүлээгдэж буй",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Баталгаажсан",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: CheckCircle2,
  },
  PREPARED: {
    label: "Бэлтгэгдсэн",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    icon: ChefHat,
  },
  SHIPPING: {
    label: "Хүргэлтэнд",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    icon: Truck,
  },
  COMPLETED: {
    label: "Хүлээн авсан",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Цуцалсан",
    className: "bg-red-50 text-red-700 ring-red-200",
    icon: XCircle,
  },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Төлбөр хүлээгдэж байна",
  PAID: "Төлбөр төлөгдсөн",
  FAILED: "Төлбөр амжилтгүй",
  REFUNDED: "Буцаалт хийгдсэн",
  CANCELLED: "Цуцлагдсан",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  BANK_TRANSFER: "Данс",
  QPAY: "QR төлбөр",
  POS: "POS",
};

function formatMnt(value: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrderDateParts(order: ProfileOrder) {
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
  };
}

function isTodayOrder(order: ProfileOrder) {
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function hasOrderDateParts(
  value: ReturnType<typeof getOrderDateParts>,
): value is NonNullable<ReturnType<typeof getOrderDateParts>> {
  return Boolean(value);
}

function StatusStepper({ status }: { status: string }) {
  if (status === "PENDING" || status === "CANCELLED") return null;
  const currentIndex = Math.max(
    STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]),
    0,
  );

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          className="absolute left-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-400 to-emerald-400"
          style={{
            width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
          }}
        />
        {STATUS_STEPS.map((step, index) => {
          const isDone = index <= currentIndex;
          return (
            <span
              key={step}
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ring-4 ring-slate-50 ${
                isDone ? "bg-slate-950 text-white" : "bg-white text-slate-300"
              }`}
            >
              {index + 1}
            </span>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-slate-500">
        {STEP_LABELS.map((label, index) => (
          <span
            key={label}
            className={index <= currentIndex ? "text-slate-900" : ""}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeliveryCode({ code }: { code: string }) {
  const copy = () => navigator.clipboard?.writeText(code).catch(() => {});
  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-orange-800">
        <KeyRound size={16} />
        Хүргэлтийн код
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm"
      >
        <span className="font-mono text-2xl font-black tracking-[0.28em] text-slate-950">
          {code}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700">
          <Copy size={13} />
          Хуулах
        </span>
      </button>
    </div>
  );
}

function PaymentBreakdown({ order }: { order: ProfileOrder }) {
  const payment =
    order.payments?.find((item) => item.status === "PAID") ||
    order.payments?.[0] ||
    null;
  const method = payment?.method || order.paymentMethod || "";
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const discountAmount = Number(order.discountAmount || 0);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ReceiptText size={17} />
          </span>
          <div>
            <p className="text-sm font-black text-slate-950">Юунд төлсөн бэ?</p>
            <p className="text-[11px] font-bold text-slate-400">
              Үйлчилгээ, бараа, хүргэлтийн задаргаа
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
          {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>

      <div className="grid gap-2 text-sm">
        <PaymentLine
          label={`Бараа үйлчилгээ (${itemCount}ш)`}
          value={formatMnt(order.subtotal)}
        />
        {deliveryFee > 0 && (
          <PaymentLine
            label="Хүргэлтийн төлбөр"
            value={formatMnt(deliveryFee)}
          />
        )}
        {discountAmount > 0 && (
          <PaymentLine
            label="Хөнгөлөлт"
            value={`-${formatMnt(discountAmount)}`}
            muted
          />
        )}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
            <CreditCard size={14} />
            Төлсөн хэсэг
          </span>
          <span className="text-sm font-black text-slate-950">
            {method ? PAYMENT_METHOD_LABEL[method] || method : "Тодорхойгүй"}
          </span>
        </div>
        {payment?.providerRef && (
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
            Ref: {payment.providerRef}
          </p>
        )}
        {payment?.paidAt && (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Төлсөн огноо: {formatDate(payment.paidAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentLine({
  label,
  muted,
  value,
}: {
  label: string;
  muted?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bold text-slate-500">{label}</span>
      <span
        className={`shrink-0 font-black ${
          muted ? "text-emerald-600" : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function OrdersPanel({
  orders,
  loading,
  error,
  onRefresh,
}: {
  orders: ProfileOrder[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const [dateMode, setDateMode] = useState(TODAY_FILTER);
  const [selectedYear, setSelectedYear] = useState(ALL_YEARS);
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);

  const yearOptions = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map(getOrderDateParts)
          .filter(hasOrderDateParts)
          .map((date) => date.year),
      ),
    ).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map(getOrderDateParts)
          .filter(hasOrderDateParts)
          .filter(
            (date) => selectedYear === ALL_YEARS || date.year === selectedYear,
          )
          .map((date) => date.month),
      ),
    ).sort((a, b) => Number(a) - Number(b));
  }, [orders, selectedYear]);

  const filteredOrders = useMemo(() => {
    if (dateMode === TODAY_FILTER) {
      return orders.filter(isTodayOrder);
    }

    return orders.filter((order) => {
      const date = getOrderDateParts(order);
      if (!date)
        return selectedYear === ALL_YEARS && selectedMonth === ALL_MONTHS;
      const matchesYear =
        selectedYear === ALL_YEARS || date.year === selectedYear;
      const matchesMonth =
        selectedMonth === ALL_MONTHS || date.month === selectedMonth;
      return matchesYear && matchesMonth;
    });
  }, [dateMode, orders, selectedMonth, selectedYear]);

  const hasActiveFilter =
    dateMode === TODAY_FILTER ||
    selectedYear !== ALL_YEARS ||
    selectedMonth !== ALL_MONTHS;

  const resetFilters = () => {
    setDateMode(CUSTOM_FILTER);
    setSelectedYear(ALL_YEARS);
    setSelectedMonth(ALL_MONTHS);
  };

  const showTodayOrders = () => {
    setDateMode(TODAY_FILTER);
    setSelectedYear(ALL_YEARS);
    setSelectedMonth(ALL_MONTHS);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
            Orders
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Миний захиалгууд
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Барааны захиалга, төлбөр, хүргэлтийн төлөв нэг дор харагдана.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                dateMode === TODAY_FILTER
                  ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {dateMode === TODAY_FILTER
                ? "Одоо: Өнөөдрийн захиалга"
                : "Одоо: Бүх / сонгосон хугацаа"}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {filteredOrders.length.toLocaleString("mn-MN")} захиалга
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={showTodayOrders}
            className={`h-11 rounded-xl border px-3 text-xs font-black transition ${
              dateMode === TODAY_FILTER
                ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            Өнөөдөр
          </button>
          <OrderFilterSelect
            label="Он"
            value={selectedYear}
            onChange={(value) => {
              setDateMode(CUSTOM_FILTER);
              setSelectedYear(value);
              setSelectedMonth(ALL_MONTHS);
            }}
          >
            <option value={ALL_YEARS}>Бүх он</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </OrderFilterSelect>
          <OrderFilterSelect
            label="Сар"
            value={selectedMonth}
            onChange={(value) => {
              setDateMode(CUSTOM_FILTER);
              setSelectedMonth(value);
            }}
          >
            <option value={ALL_MONTHS}>Бүх сар</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {MONTH_LABELS[Number(month) - 1] || `${month} сар`}
              </option>
            ))}
          </OrderFilterSelect>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
            >
              Цэвэрлэх
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Шинэчлэх
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
            <Package size={34} />
          </div>
          <h3 className="mt-5 text-lg font-black text-slate-900">
            Захиалга байхгүй байна
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            Бүтээгдэхүүн захиалсны дараа төлөв, хүргэлтийн код, нийт дүн энд
            харагдана.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-950"
          >
            <ShoppingCart size={16} />
            Дэлгүүр хэсэх
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-orange-300 shadow-sm">
            <Package size={34} />
          </div>
          <h3 className="mt-5 text-lg font-black text-slate-900">
            {dateMode === TODAY_FILTER
              ? "Өнөөдрийн захиалга алга"
              : "Сонгосон хугацаанд захиалга алга"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            {dateMode === TODAY_FILTER
              ? "Өнөөдөр үүссэн захиалга байхгүй байна."
              : "Өөр он эсвэл сар сонгоод дахин шалгана уу."}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-950"
          >
            Бүх захиалгыг харах
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = status.icon;
            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-black tracking-wide text-slate-950">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {formatDate(order.createdAt)}
                      {order.organizationName
                        ? ` · ${order.organizationName}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${status.className}`}
                  >
                    <StatusIcon size={14} />
                    {status.label}
                  </span>
                </div>

                <div className="px-4 py-4">
                  <StatusStepper status={order.status} />
                  {order.status === "SHIPPING" && order.deliveryCode && (
                    <DeliveryCode code={order.deliveryCode} />
                  )}

                  <div className="mt-4 space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={`${order.id}-${item.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-500 shadow-sm">
                            x{item.qty}
                          </span>
                          <span className="truncate text-sm font-bold text-slate-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-black text-slate-950">
                          {formatMnt(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <PaymentBreakdown order={order} />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-4">
                  <span className="text-sm font-black text-slate-500">
                    Нийт дүн
                  </span>
                  <span className="text-xl font-black text-slate-950">
                    {formatMnt(order.total)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function OrderFilterSelect({
  children,
  label,
  value,
  onChange,
}: {
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-500">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-black text-slate-800 outline-none"
      >
        {children}
      </select>
    </label>
  );
}
