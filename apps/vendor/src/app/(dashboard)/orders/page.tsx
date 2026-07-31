"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  DeliveryPackageDialog,
  type DeliveryPackageDetails,
} from "@mgl/ui";

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  supplyType?: string;
  isPreorder?: boolean;
  preorderLeadTimeDays?: number | null;
  preorderNote?: string | null;
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
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Баталгаажсан",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  PREPARED: {
    label: "Бэлтгэгдсэн",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: ChefHat,
  },
  PREPARING: {
    label: "Бэлтгэж байна",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: ChefHat,
  },
  SHIPPING: {
    label: "Хүргэлтэнд гарсан",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: Truck,
  },
  COMPLETED: {
    label: "Хүлээн авсан",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Цуцалсан",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

const NEXT_ACTION: Record<string, { label: string; color: string }> = {
  CONFIRMED: {
    label: "Бэлтгэж эхлэх",
    color: "bg-orange-600 hover:bg-orange-700",
  },
  PREPARING: {
    label: "Бэлтгэж дууссан",
    color: "bg-purple-600 hover:bg-purple-700",
  },
  PREPARED: {
    label: "Хүргэлтэнд гаргах",
    color: "bg-indigo-600 hover:bg-indigo-700",
  },
};

const FILTER_TABS = [
  { key: "", label: "Бүгд" },
  { key: "CONFIRMED", label: "Шинэ" },
  { key: "PREPARING", label: "Бэлтгэж байна" },
  { key: "PREPARED", label: "Бэлтгэгдсэн" },
  { key: "SHIPPING", label: "Хүргэлтэнд" },
  { key: "COMPLETED", label: "Хүлээн авсан" },
];

const getPreorderItems = (order: VendorOrder) =>
  order.items.filter(
    (item) => item.isPreorder || item.supplyType === "CHINA_PREORDER",
  );

const getPreorderLeadTimeLabel = (item: OrderItem) =>
  `${item.preorderLeadTimeDays ?? 14} хоног`;

type ViewFilter = "all" | "preorder";

const isLocalMockHost = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
};

const getLocalMockOrders = (): VendorOrder[] => [
  {
    id: "local-preorder-1",
    orderNumber: "LOCAL-PO-1001",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    total: 248000,
    subtotal: 248000,
    phone: "99112233",
    shippingAddress: "Улаанбаатар, Хан-Уул дүүрэг",
    note: "Local mock preorder захиалга",
    deliveryCode: null,
    createdAt: new Date().toISOString(),
    customer: {
      id: "local-customer-1",
      name: "Local Test Customer",
      email: "local.customer@example.test",
      phone: "99112233",
    },
    items: [
      {
        name: "Wireless ergonomic keyboard",
        qty: 1,
        price: 189000,
        subtotal: 189000,
        supplyType: "CHINA_PREORDER",
        isPreorder: true,
        preorderLeadTimeDays: 14,
        preorderNote: "Хятадаас 14-21 хоногт ирнэ",
      },
      {
        name: "USB-C cable",
        qty: 2,
        price: 29500,
        subtotal: 59000,
        supplyType: "IN_STOCK",
        isPreorder: false,
      },
    ],
  },
  {
    id: "local-stock-1",
    orderNumber: "LOCAL-ST-1002",
    status: "PREPARED",
    paymentStatus: "PAID",
    total: 86500,
    subtotal: 86500,
    phone: "99001122",
    shippingAddress: "Улаанбаатар, Баянзүрх дүүрэг",
    note: null,
    deliveryCode: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    customer: {
      id: "local-customer-2",
      name: "Local Stock Customer",
      email: "stock.customer@example.test",
      phone: "99001122",
    },
    items: [
      {
        name: "Бэлэн нөөцтэй бараа",
        qty: 1,
        price: 86500,
        subtotal: 86500,
        supplyType: "IN_STOCK",
        isPreorder: false,
      },
    ],
  },
];

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [packageOrder, setPackageOrder] = useState<VendorOrder | null>(null);
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null);
  const [deliverCode, setDeliverCode] = useState("");
  const [deliverError, setDeliverError] = useState("");
  const [deliverLoading, setDeliverLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    const useLocalMock = isLocalMockHost();
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
      const nextOrders = data.orders || [];
      if (useLocalMock && nextOrders.length === 0) {
        const mockOrders = getLocalMockOrders();
        setOrders(mockOrders);
        setTotal(mockOrders.length);
        return;
      }
      setOrders(nextOrders);
      setTotal(data.total || 0);
    } catch {
      if (useLocalMock) {
        const mockOrders = getLocalMockOrders();
        setOrders(mockOrders);
        setTotal(mockOrders.length);
        setError("");
        return;
      }
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");
    if (!token) {
      if (isLocalMockHost()) {
        const mockOrders = getLocalMockOrders();
        setOrders(mockOrders);
        setTotal(mockOrders.length);
        setLoading(false);
        return;
      }
      router.replace("/login");
      return;
    }
    fetchOrders();
  }, [fetchOrders, router]);

  const handleAdvanceStatus = async (
    orderId: string,
    packageDetails?: DeliveryPackageDetails,
  ) => {
    setActionLoading(orderId);
    try {
      const res = await authFetch(`${API}/vendor/orders/${orderId}/status`, {
        method: "PATCH",
        body: packageDetails ? JSON.stringify(packageDetails) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Алдаа гарлаа");
        setActionLoading(null);
        return;
      }
      setPackageOrder(null);
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

  const orderStats = useMemo(() => {
    const preorderOrders = orders.filter(
      (order) => getPreorderItems(order).length > 0,
    );
    const preorderItemCount = preorderOrders.reduce(
      (sum, order) => sum + getPreorderItems(order).length,
      0,
    );

    return {
      visibleOrders: orders.length,
      preorderOrders: preorderOrders.length,
      preorderItemCount,
      stockOnlyOrders: orders.length - preorderOrders.length,
    };
  }, [orders]);

  const displayedOrders = useMemo(
    () =>
      viewFilter === "preorder"
        ? orders.filter((order) => getPreorderItems(order).length > 0)
        : orders,
    [orders, viewFilter],
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900">Захиалгууд</h1>
          <p className="text-sm text-gray-500 mt-1">Нийт {total} захиалга</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setViewFilter("all")}
          className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
            viewFilter === "all"
              ? "border-amber-300 ring-2 ring-amber-100"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Нэгдсэн
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {orderStats.visibleOrders}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Одоогийн төлөвийн бүх захиалга
          </p>
        </button>
        <button
          type="button"
          onClick={() => setViewFilter("preorder")}
          className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
            viewFilter === "preorder"
              ? "border-blue-300 ring-2 ring-blue-100"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
            Захиалгын бараатай
          </p>
          <p className="mt-2 text-2xl font-black text-blue-700">
            {orderStats.preorderOrders}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-600">
            {orderStats.preorderItemCount} preorder item
          </p>
        </button>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Бэлэн нөөцтэй
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {orderStats.stockOnlyOrders}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Preorder ороогүй захиалга
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
            Тайлбар
          </p>
          <p className="mt-2 text-sm font-bold text-blue-800">
            Preorder бараа нөөцөөс шууд хасагдахгүй
          </p>
          <p className="mt-1 text-xs font-medium text-blue-700">
            Ирэх хугацааг item бүр дээр харуулна
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 flex max-w-full min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
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
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="flex min-w-0 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center sm:py-20">
          <Package size={40} className="text-gray-300" />
          <p className="max-w-full break-words text-sm font-semibold text-gray-500">
            {viewFilter === "preorder"
              ? "Захиалгын бараатай захиалга байхгүй"
              : filter
                ? `"${STATUS_CONFIG[filter]?.label}" төлөвтэй захиалга байхгүй`
                : "Захиалга байхгүй байна"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;
            const nextAction = NEXT_ACTION[order.status];
            const isDelivering = deliverOrderId === order.id;
            const preorderItems = getPreorderItems(order);
            const hasPreorderItems = preorderItems.length > 0;

            return (
              <div key={order.id} className="space-y-3">
    <div
                  className={`overflow-hidden rounded-2xl border shadow-sm sm:hidden ${cfg.bg}`}
                >
                  <div className="space-y-3 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-black text-gray-900">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString(
                            "mn-MN",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.color} ${cfg.bg}`}
                      >
                        <StatusIcon size={11} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2 text-gray-700">
                        <User size={14} className="shrink-0 text-gray-400" />
                        <span className="truncate">{order.customer.name}</span>
                      </div>
                      {(order.phone || order.customer.phone) && (
                        <div className="mt-2 flex min-w-0 items-center gap-2 text-gray-600">
                          <Phone size={14} className="shrink-0 text-gray-400" />
                          <span className="truncate">
                            {order.phone || order.customer.phone}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <p className="break-words text-gray-700">
                                {item.name}
                              </p>
                              {item.isPreorder && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  Захиалгын бараа
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">×{item.qty}</p>
                            {item.isPreorder && (
                              <p className="mt-1 text-[11px] font-medium text-blue-600">
                                Ирэх хугацаа: {getPreorderLeadTimeLabel(item)}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                            ₮{item.subtotal.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs font-medium text-gray-400">
                          +{order.items.length - 3} бараа
                        </p>
                      )}
                    </div>

                    {hasPreorderItems && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                        <p className="font-bold">
                          Энэ захиалга захиалгын бараатай
                        </p>
                        <p className="mt-1">
                          {preorderItems.length} бараа нөөцөөс шууд хасагдахгүй,
                          ирэх хугацааг захиалагчид мэдэгдэнэ.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-sm font-medium text-gray-500">
                        Нийт
                      </span>
                      <span className="text-lg font-black tabular-nums text-gray-900">
                        ₮{order.total.toLocaleString()}
                      </span>
                    </div>

                    {order.status === "SHIPPING" && order.deliveryCode && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-700">
                          Хүргэлтийн код
                        </p>
                        <p className="mt-1 font-mono text-xl font-black tracking-[0.15em] text-amber-700">
                          {order.deliveryCode}
                        </p>
                      </div>
                    )}

                    {order.status === "SHIPPING" && isDelivering && (
                      <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
                        <p className="text-sm font-semibold text-green-800">
                          Захиалагчийн код
                        </p>
                        <input
                          type="text"
                          value={deliverCode}
                          onChange={(e) =>
                            setDeliverCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="_ _ _ _ _ _"
                          maxLength={6}
                          className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-gray-900 outline-none focus:border-green-400"
                        />
                        {deliverError && (
                          <p className="text-xs text-red-600">{deliverError}</p>
                        )}
                      </div>
                    )}

                    <div className="grid gap-2">
                      {nextAction && (
                        <button
                          onClick={() =>
                            order.status === "PREPARED"
                              ? setPackageOrder(order)
                              : void handleAdvanceStatus(order.id)
                          }
                          disabled={actionLoading === order.id}
                          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${nextAction.color}`}
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
                          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
                        >
                          <CheckCircle2 size={16} />
                          Хүлээн авсан
                        </button>
                      )}

                      {order.status === "SHIPPING" && isDelivering && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDeliverConfirm(order.id)}
                            disabled={
                              deliverLoading || deliverCode.length !== 6
                            }
                            className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                          >
                            {deliverLoading ? (
                              <Loader2
                                size={16}
                                className="mx-auto animate-spin"
                              />
                            ) : (
                              "Баталгаажуулах"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setDeliverOrderId(null);
                              setDeliverCode("");
                              setDeliverError("");
                            }}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                          >
                            Болих
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`hidden rounded-2xl border overflow-hidden sm:block ${cfg.bg}`}
                >
                  {/* Header */}
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border`}
                      >
                        <StatusIcon size={20} className={cfg.color} />
                      </div>
                      <div>
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {order.orderNumber}
                        </span>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString(
                            "mn-MN",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.color} ${cfg.bg}`}
                    >
                      <StatusIcon size={12} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="bg-white px-4 py-4 space-y-4 sm:px-5">
                    {/* Customer */}
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
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
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <span className="break-words text-gray-700">
                                  {item.name}
                                </span>
                                {item.isPreorder && (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    Захиалгын бараа
                                  </span>
                                )}
                              </div>
                              {item.isPreorder && (
                                <p className="mt-1 text-xs font-medium text-blue-600">
                                  Ирэх хугацаа: {getPreorderLeadTimeLabel(item)}
                                  {item.preorderNote
                                    ? ` · ${item.preorderNote}`
                                    : ""}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-gray-400">
                              ×{item.qty}
                            </span>
                          </div>
                          <span className="shrink-0 font-medium text-gray-900 tabular-nums">
                            ₮{item.subtotal.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                        <span className="text-sm font-medium text-gray-500">
                          Нийт
                        </span>
                        <span className="text-base font-black text-gray-900 tabular-nums">
                          ₮{order.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {hasPreorderItems && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-start gap-3">
                          <Clock
                            size={18}
                            className="mt-0.5 shrink-0 text-blue-600"
                          />
                          <div className="text-sm text-blue-800">
                            <p className="font-bold">
                              Захиалгын бараа орсон байна
                            </p>
                            <p className="mt-1 text-xs text-blue-700">
                              {preorderItems.length} бараа нөөцөөс шууд
                              хасагдахгүй. Ирэх хугацааг item дээрээс шалгаж
                              бэлтгэлээ төлөвлөнө.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery code display for SHIPPING orders */}
                    {order.status === "SHIPPING" && order.deliveryCode && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <KeyRound size={18} className="text-amber-600" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-amber-700">
                              Хүргэлтийн код
                            </p>
                            <p className="text-xs text-amber-600">
                              Захиалагчаас энэ кодыг асууж баталгаажуулна
                            </p>
                          </div>
                          <span className="self-start font-mono text-xl font-black tracking-[0.15em] text-amber-700 sm:self-auto">
                            {order.deliveryCode}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Delivery code input form */}
                    {order.status === "SHIPPING" && isDelivering && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                        <p className="text-sm font-semibold text-green-800">
                          Захиалагчийн кодыг оруулна уу
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={deliverCode}
                            onChange={(e) =>
                              setDeliverCode(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            placeholder="_ _ _ _ _ _"
                            maxLength={6}
                            className="w-full flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-gray-900 outline-none focus:border-green-400"
                          />
                          <button
                            onClick={() => handleDeliverConfirm(order.id)}
                            disabled={
                              deliverLoading || deliverCode.length !== 6
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {deliverLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              "Баталгаажуулах"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setDeliverOrderId(null);
                              setDeliverCode("");
                              setDeliverError("");
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            Болих
                          </button>
                        </div>
                        {deliverError && (
                          <p className="text-xs text-red-600">{deliverError}</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                      {nextAction && (
                        <button
                          onClick={() =>
                            order.status === "PREPARED"
                              ? setPackageOrder(order)
                              : void handleAdvanceStatus(order.id)
                          }
                          disabled={actionLoading === order.id}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 sm:w-auto ${nextAction.color}`}
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
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors sm:w-auto"
                        >
                          <CheckCircle2 size={16} />
                          Хүлээн авсан
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {packageOrder && (
        <DeliveryPackageDialog
          orderNumber={packageOrder.orderNumber}
          submitting={actionLoading === packageOrder.id}
          onClose={() => {
            if (!actionLoading) setPackageOrder(null);
          }}
          onSubmit={(details) =>
            handleAdvanceStatus(packageOrder.id, details)
          }
        />
      )}
    </div>
  );
}
