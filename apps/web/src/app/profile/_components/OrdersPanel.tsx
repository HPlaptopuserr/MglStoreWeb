import {
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ProfileOrder } from "./types";

const STATUS_STEPS = ["CONFIRMED", "PREPARED", "SHIPPING", "COMPLETED"] as const;
const STEP_LABELS = ["Баталгаажсан", "Бэлтгэсэн", "Хүргэлтэнд", "Авсан"];

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
          <span key={label} className={index <= currentIndex ? "text-slate-900" : ""}>
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
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
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
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
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
                      {order.organizationName ? ` · ${order.organizationName}` : ""}
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
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-4">
                  <span className="text-sm font-black text-slate-500">Нийт дүн</span>
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
