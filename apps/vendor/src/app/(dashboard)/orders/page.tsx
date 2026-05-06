"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ChefHat,
  ArrowRight,
  KeyRound,
  User,
  Phone,
  RefreshCw,
  Filter,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  phone: string;
  shippingAddress: string;
  note: string | null;
  deliveryCode: string | null;
  createdAt: string;
  customer: OrderCustomer;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  PENDING: { label: "Хүлээгдэж буй", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  CONFIRMED: { label: "Баталгаажсан", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2 },
  PREPARED: { label: "Бэлтгэгдсэн", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: ChefHat },
  SHIPPING: { label: "Хүргэлтэнд гарсан", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  COMPLETED: { label: "Хүлээн авсан", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  CANCELLED: { label: "Цуцалсан", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

const NEXT_ACTION: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Бэлтгэсэн", color: "bg-purple-600 hover:bg-purple-700" },
  PREPARED: { label: "Хүргэлтэнд гаргах", color: "bg-indigo-600 hover:bg-indigo-700" },
};

const FILTER_TABS = [
  { key: "", label: "Бүгд" },
  { key: "CONFIRMED", label: "Шинэ" },
  { key: "PREPARED", label: "Бэлтгэгдсэн" },
  { key: "SHIPPING", label: "Хүргэлтэнд" },
  { key: "COMPLETED", label: "Хүлээн авсан" },
];

export default function VendorOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null);
  const [deliverCode, setDeliverCode] = useState("");
  const [deliverError, setDeliverError] = useState("");
  const [deliverLoading, setDeliverLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      params.set("limit", "100");

      const res = await authFetch(`${API}/vendor/orders?${params}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа");
        return;
      }

      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    fetchOrders();
  }, [fetchOrders, router]);

  const handleAdvanceStatus = async (orderId: string) => {
    setActionLoading(orderId);

    try {
      const res = await authFetch(`${API}/vendor/orders/${orderId}/status`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Алдаа гарлаа");
        return;
      }

      await fetchOrders();
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliverConfirm = async (orderId: string) => {
    if (deliverCode.length !== 6) {
      setDeliverError("6 оронтой код оруулна уу");
      return;
    }

    setDeliverLoading(true);
    setDeliverError("");

    try {
      const res = await authFetch(`${API}/vendor/orders/${orderId}/deliver`, {
        method: "POST",
        body: JSON.stringify({ code: deliverCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeliverError(data.message || "Алдаа гарлаа");
        return;
      }

      setDeliverOrderId(null);
      setDeliverCode("");
      await fetchOrders();
    } catch {
      setDeliverError("Сүлжээний алдаа");
    } finally {
      setDeliverLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full min-w-0 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Захиалгууд
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Нийт {total} захиалга
            </p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Шинэчлэх
          </button>
        </div>

        {/* Filter tabs */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide sm:mx-0 sm:px-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition ${filter === tab.key
                  ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
            >
              <Filter size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-white">
            <Loader2 size={34} className="animate-spin text-amber-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-white px-5 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
              <Package size={34} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-500">
              {filter
                ? `"${STATUS_CONFIG[filter]?.label}" төлөвтэй захиалга байхгүй`
                : "Захиалга байхгүй байна"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = cfg.icon;
              const nextAction = NEXT_ACTION[order.status];
              const isDelivering = deliverOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${cfg.bg}`}
                      >
                        <StatusIcon size={21} className={cfg.color} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-black text-gray-900">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("mn-MN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${cfg.color} ${cfg.bg}`}
                    >
                      <StatusIcon size={12} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-5 px-4 py-5 sm:px-5">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-gray-700">
                        <User size={15} className="shrink-0 text-gray-400" />
                        <span className="truncate font-semibold">
                          {order.customer?.name || "Зочин"}
                        </span>
                      </div>

                      {(order.phone || order.customer?.phone) && (
                        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-gray-700">
                          <Phone size={15} className="shrink-0 text-gray-400" />
                          <span className="truncate font-semibold">
                            {order.phone || order.customer?.phone}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white">
                      <div className="space-y-2 px-3 pt-3">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <span className="break-words font-semibold text-gray-700">
                                {item.name}
                              </span>
                              <span className="shrink-0 text-gray-400">
                                ×{item.qty}
                              </span>
                            </div>

                            <span className="shrink-0 font-black tabular-nums text-gray-900">
                              ₮{(item.subtotal || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-3 py-3">
                        <span className="text-sm font-bold text-gray-500">
                          Нийт
                        </span>
                        <span className="shrink-0 text-lg font-black tabular-nums text-gray-900">
                          ₮{(order.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {order.status === "SHIPPING" && order.deliveryCode && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <KeyRound
                              size={19}
                              className="mt-0.5 shrink-0 text-amber-600"
                            />
                            <div>
                              <p className="text-sm font-black text-amber-800">
                                Хүргэлтийн код
                              </p>
                              <p className="text-xs font-medium text-amber-600">
                                Захиалагчаас энэ кодыг асууж баталгаажуулна
                              </p>
                            </div>
                          </div>

                          <span className="font-mono text-xl font-black tracking-[0.14em] text-amber-700">
                            {order.deliveryCode}
                          </span>
                        </div>
                      </div>
                    )}

                    {order.status === "SHIPPING" && isDelivering && (
                      <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-black text-green-800">
                          Захиалагчийн кодыг оруулна уу
                        </p>

                        <input
                          type="text"
                          value={deliverCode}
                          onChange={(e) =>
                            setDeliverCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          placeholder="_ _ _ _ _ _"
                          maxLength={6}
                          className="h-12 w-full rounded-2xl border border-green-200 bg-white px-3 text-center font-mono text-lg font-black tracking-[0.25em] text-gray-900 outline-none focus:border-green-400"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDeliverConfirm(order.id)}
                            disabled={deliverLoading || deliverCode.length !== 6}
                            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-green-600 px-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {deliverLoading && (
                              <Loader2 size={16} className="animate-spin" />
                            )}
                            Батлах
                          </button>

                          <button
                            onClick={() => {
                              setDeliverOrderId(null);
                              setDeliverCode("");
                              setDeliverError("");
                            }}
                            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-500 transition hover:bg-gray-50"
                          >
                            Болих
                          </button>
                        </div>

                        {deliverError && (
                          <p className="text-xs font-semibold text-red-600">
                            {deliverError}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                      {nextAction && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id)}
                          disabled={actionLoading === order.id}
                          className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white transition disabled:opacity-50 sm:w-auto ${nextAction.color}`}
                        >
                          {actionLoading === order.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                          {nextAction.label}
                        </button>
                      )}

                      {order.status === "SHIPPING" && !isDelivering && (
                        <button
                          onClick={() => {
                            setDeliverOrderId(order.id);
                            setDeliverCode("");
                            setDeliverError("");
                          }}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 text-sm font-black text-white transition hover:bg-green-700 sm:w-auto"
                        >
                          <CheckCircle2 size={16} />
                          Хүлээн авсан
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}