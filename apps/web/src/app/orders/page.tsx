"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ChefHat,
  KeyRound,
  Copy,
  Check,
  CreditCard,
  ReceiptText,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  reviewScore?: number | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  total: number;
  subtotal: number;
  deliveryFee?: number;
  discountAmount?: number;
  deliveryCode: string | null;
  createdAt: string;
  items: OrderItem[];
  requiresReview?: boolean;
  payments?: OrderPayment[];
}

interface OrderPayment {
  id: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

/* ── Status config ───────────────────────────────────── */
const STATUS_STEPS = [
  "CONFIRMED",
  "PREPARED",
  "SHIPPING",
  "COMPLETED",
] as const;
const STEP_LABELS = ["Баталгаажсан", "Бэлтгэсэн", "Хүргэлтэнд", "Хүлээн авсан"];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Төлбөр хүлээгдэж буй",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Баталгаажсан",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  PREPARED: {
    label: "Бэлтгэгдсэн",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    icon: ChefHat,
  },
  SHIPPING: {
    label: "Хүргэлтэнд гарсан",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    icon: Truck,
  },
  COMPLETED: {
    label: "Хүлээн авсан",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Цуцалсан",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
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
  QPAY: "QPay",
  POS: "POS",
};

const ORDER_FILTERS = [
  { label: "Бүгд", value: "ALL" },
  { label: "Хүлээгдэж буй", value: "PENDING" },
  { label: "Баталгаажсан", value: "CONFIRMED" },
  { label: "Хүргэлтэнд", value: "SHIPPING" },
  { label: "Дууссан", value: "COMPLETED" },
  { label: "Цуцалсан", value: "CANCELLED" },
] as const;

type OrderFilter = (typeof ORDER_FILTERS)[number]["value"];

function formatMnt(value: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

/* ── Minimal status stepper ──────────────────────────── */
function StatusStepper({ status }: { status: string }) {
  if (status === "PENDING" || status === "CANCELLED") return null;
  const currentIdx = STATUS_STEPS.indexOf(
    status as (typeof STATUS_STEPS)[number],
  );

  return (
    <div className="px-4 py-4">
      {/* Progress bar */}
      <div className="relative flex items-center justify-between mb-2">
        {/* Background line */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[3px] bg-gray-100 rounded-full" />
        {/* Filled line */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
          style={{
            width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%`,
          }}
        />
        {/* Dots */}
        {STATUS_STEPS.map((step, i) => {
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                  isDone
                    ? isCurrent
                      ? "border-amber-400 bg-amber-500 text-white scale-110 shadow-md shadow-amber-500/30"
                      : "border-green-400 bg-green-500 text-white"
                    : "border-gray-200 bg-white text-gray-300"
                }`}
              >
                {isDone && !isCurrent ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span className="text-[9px] font-black">{i + 1}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex items-start justify-between">
        {STATUS_STEPS.map((step, i) => {
          const isDone = i <= currentIdx;
          return (
            <span
              key={step}
              className={`w-[60px] text-center text-[10px] leading-tight ${
                isDone ? "font-bold text-gray-800" : "font-medium text-gray-400"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Delivery code display ───────────────────────────── */
function DeliveryCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
          <KeyRound size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-800">Хүргэлтийн код</p>
          <p className="text-[10px] text-amber-600">
            Хүргэгчид энэ кодыг хэлнэ үү
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-amber-100">
        <span className="font-mono text-2xl font-black tracking-[0.25em] text-gray-900 pl-1">
          {code}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95"
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Хуулсан" : "Хуулах"}
        </button>
      </div>
    </div>
  );
}

/* ── Delivery confirm form ───────────────────────────── */
function DeliveryConfirmForm({
  orderId,
  onConfirmed,
}: {
  orderId: string;
  onConfirmed: () => void;
}) {
  const { authFetch } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("6 оронтой код оруулна уу");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API}/vendor/orders/${orderId}/deliver`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа");
        setLoading(false);
        return;
      }
      onConfirmed();
    } catch {
      setError("Сүлжээний алдаа");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mb-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
          <KeyRound size={16} className="text-green-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-green-800">
            Хүлээн авсныг баталгаажуулах
          </p>
          <p className="text-[10px] text-green-600">
            Хүргэгчээс авсан 6 оронтой код
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          maxLength={6}
          className="flex-1 rounded-xl border border-green-200 bg-white px-4 py-3 text-center font-mono text-xl font-black tracking-[0.3em] text-gray-900 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
        />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin mx-auto" />
          ) : (
            "Баталгаажуулах"
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      )}
    </form>
  );
}

function PaymentBreakdown({ order }: { order: Order }) {
  const payment =
    order.payments?.find((item) => item.status === "PAID") ||
    order.payments?.[0] ||
    null;
  const method = payment?.method || order.paymentMethod || "";
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const discountAmount = Number(order.discountAmount || 0);

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-white">
            <ReceiptText size={15} />
          </span>
          <div>
            <p className="text-xs font-black text-gray-900">Юунд төлсөн бэ?</p>
            <p className="text-[10px] font-medium text-gray-400">
              Бараа, хүргэлт, төлбөрийн суваг
            </p>
          </div>
        </div>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black text-green-700">
          {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
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

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
          <CreditCard size={13} />
          Төлсөн хэсэг
        </span>
        <span className="text-xs font-black text-gray-900">
          {method ? PAYMENT_METHOD_LABEL[method] || method : "Тодорхойгүй"}
        </span>
      </div>
      {payment?.providerRef && (
        <p className="mt-2 truncate text-[10px] font-medium text-gray-400">
          Ref: {payment.providerRef}
        </p>
      )}
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
      <span className="font-medium text-gray-500">{label}</span>
      <span
        className={`shrink-0 font-black ${muted ? "text-green-600" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Helper: relative time ───────────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${month}, ${time}`;
}

function OrderRatingForm({
  order,
  onSubmit,
}: {
  order: Order;
  onSubmit: (score: number, comment: string) => Promise<void>;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!score || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(score, comment);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Үнэлгээ хадгалахад алдаа гарлаа",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-4 my-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <Star size={18} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-black text-gray-900">
            Захиалгаа нэг удаа үнэлнэ үү
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-gray-500">
            Сонгосон оноо захиалгын {order.items.length} бараа тус бүрд ижил
            оноогоор бүртгэгдэнэ.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-black text-gray-800">
            1 муу · 10 маш сайн
          </span>
          <span className="shrink-0 text-xs font-black text-amber-600">
            {score ? `${score}/10` : "Оноо сонгоно уу"}
          </span>
        </div>
        <div
          className="grid grid-cols-10 gap-1"
          role="radiogroup"
          aria-label="Захиалгын үнэлгээ"
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={score === value}
              onClick={() => setScore(value)}
              className={`aspect-square rounded-lg text-[11px] font-black transition ${
                score === value
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white text-gray-500 ring-1 ring-amber-100 hover:bg-amber-100"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        maxLength={500}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Нэмэлт сэтгэгдэл (заавал биш)"
        className="mt-4 min-h-20 w-full resize-y rounded-xl border border-amber-100 bg-white p-3 text-xs font-semibold outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
      />
      {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!score || submitting}
        onClick={submit}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-gray-950 text-xs font-black text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : score ? (
          "Үнэлгээг хадгалах"
        ) : (
          "1–10 онооноос сонгоно уу"
        )}
      </button>
    </section>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function OrdersPage() {
  const router = useRouter();
  const { user, authFetch, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("ALL");
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      order.orderNumber.toLowerCase().includes(normalizedQuery) ||
      order.items.some((item) =>
        item.name.toLowerCase().includes(normalizedQuery),
      );

    return matchesStatus && matchesQuery;
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API}/store/orders`);
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Захиалгууд ачаалахад алдаа гарлаа");
        return;
      }
      setOrders(data.orders || []);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [authFetch, router]);

  const submitRatings = useCallback(
    async (orderId: string, score: number, comment: string) => {
      const response = await authFetch(
        `${API}/store/orders/${orderId}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, comment }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Үнэлгээ хадгалахад алдаа гарлаа");
      }
      await fetchOrders();
    },
    [authFetch, fetchOrders],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }
    fetchOrders();
  }, [user, authLoading, router, fetchOrders]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Loader2 size={28} className="animate-spin text-amber-500" />
        <p className="text-sm text-gray-400">Ачааллаж байна...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-5 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Миний захиалгууд
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length > 0 ? `${orders.length} захиалга` : ""}
          </p>
        </div>
        {orders.length > 0 && (
          <button
            onClick={fetchOrders}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors active:scale-95"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
            <Package size={36} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-700">
              Захиалга байхгүй
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Та дэлгүүрээс бараа захиалаарай
            </p>
          </div>
          <button
            onClick={() => router.push("/products")}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors active:scale-[0.98]"
          >
            <ShoppingCart size={16} />
            Дэлгүүр хэсэх
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex min-h-12 items-center gap-3 rounded-xl bg-gray-50 px-3 ring-1 ring-gray-100">
              <Search size={18} className="shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Захиалгын дугаар, барааны нэр хайх..."
                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-black text-gray-600 transition hover:bg-gray-300"
                >
                  Арилгах
                </button>
              )}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ORDER_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
                    statusFilter === filter.value
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <p className="text-sm font-black text-gray-800">
                Энэ шүүлтэд тохирох захиалга алга
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-400">
                Хайх үгээ эсвэл төлөв filter-ээ өөрчлөөд үзнэ үү.
              </p>
            </div>
          ) : null}

          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                {/* Card header — order number + status badge */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-bold text-gray-900 tracking-wide">
                      {order.orderNumber}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}
                  >
                    <StatusIcon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Status stepper */}
                <StatusStepper status={order.status} />

                {/* Delivery code — when SHIPPING */}
                {order.status === "SHIPPING" && order.deliveryCode && (
                  <DeliveryCodeCard code={order.deliveryCode} />
                )}

                {order.requiresReview && (
                  <OrderRatingForm
                    order={order}
                    onSubmit={(score, comment) =>
                      submitRatings(order.id, score, comment)
                    }
                  />
                )}

                {/* Items list */}
                <div className="px-4 py-3 space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-[10px] font-bold text-gray-400">
                          ×{item.qty}
                        </div>
                        <span className="text-sm text-gray-700 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0 ml-3">
                        ₮{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <PaymentBreakdown order={order} />

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">
                    Нийт дүн
                  </span>
                  <span className="text-base font-black text-gray-900 tabular-nums">
                    ₮{order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
