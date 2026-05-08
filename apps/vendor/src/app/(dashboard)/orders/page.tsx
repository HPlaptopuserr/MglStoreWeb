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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
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
        setActionLoading(null);
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
        setDeliverLoading(false);
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
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Захиалгууд</h1>
          <p className="text-sm text-gray-500 mt-1">
            Нийт {total} захиалга
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
              filter === tab.key
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20">
          <Package size={40} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">
            {filter ? `"${STATUS_CONFIG[filter]?.label}" төлөвтэй захиалга байхгүй` : "Захиалга байхгүй байна"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;
            const nextAction = NEXT_ACTION[order.status];
            const isDelivering = deliverOrderId === order.id;

            return (
              <div key={order.id} className={`rounded-2xl border overflow-hidden ${cfg.bg}`}>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border`}>
                      <StatusIcon size={20} className={cfg.color} />
                    </div>
                    <div>
                      <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("mn-MN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.color} ${cfg.bg}`}>
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>

                {/* Content */}
                <div className="bg-white px-5 py-4 space-y-4">
                  {/* Customer */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} className="text-gray-400" />
                      <span>{order.customer.name}</span>
                    </div>
                    {(order.phone || order.customer.phone) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} className="text-gray-400" />
                        <span>{order.phone || order.customer.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="text-gray-400">×{item.qty}</span>
                        </div>
                        <span className="font-medium text-gray-900 tabular-nums">
                          ₮{item.subtotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-sm font-medium text-gray-500">Нийт</span>
                      <span className="text-base font-black text-gray-900 tabular-nums">
                        ₮{order.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Delivery code display for SHIPPING orders */}
                  {order.status === "SHIPPING" && order.deliveryCode && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-center gap-3">
                        <KeyRound size={18} className="text-amber-600" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-700">Хүргэлтийн код</p>
                          <p className="text-xs text-amber-600">Захиалагчаас энэ кодыг асууж баталгаажуулна</p>
                        </div>
                        <span className="font-mono text-xl font-black tracking-[0.15em] text-amber-700">
                          {order.deliveryCode}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Delivery code input form */}
                  {order.status === "SHIPPING" && isDelivering && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                      <p className="text-sm font-semibold text-green-800">Захиалагчийн кодыг оруулна уу</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={deliverCode}
                          onChange={(e) => setDeliverCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="_ _ _ _ _ _"
                          maxLength={6}
                          className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-gray-900 outline-none focus:border-green-400"
                        />
                        <button
                          onClick={() => handleDeliverConfirm(order.id)}
                          disabled={deliverLoading || deliverCode.length !== 6}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {deliverLoading ? <Loader2 size={16} className="animate-spin" /> : "Баталгаажуулах"}
                        </button>
                        <button
                          onClick={() => { setDeliverOrderId(null); setDeliverCode(""); setDeliverError(""); }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          Болих
                        </button>
                      </div>
                      {deliverError && <p className="text-xs text-red-600">{deliverError}</p>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {nextAction && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id)}
                        disabled={actionLoading === order.id}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 ${nextAction.color}`}
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
                        onClick={() => { setDeliverOrderId(order.id); setDeliverCode(""); setDeliverError(""); }}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
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
  );
}
