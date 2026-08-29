"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type IncomingOrderItem = {
  name: string;
  qty: number;
  subtotal: number;
  isPreorder?: boolean;
  supplyType?: string;
  preorderLeadTimeDays?: number | null;
};

type IncomingOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  phone: string;
  shippingAddress: string;
  customer: { name: string; phone?: string | null };
  items: IncomingOrderItem[];
};

type OrdersResponse = {
  orders?: IncomingOrder[];
  total?: number;
  message?: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  CONFIRMED: "Шинэ захиалга",
  PREPARING: "Бэлтгэж байна",
  PREPARED: "Бэлтгэгдсэн",
  SHIPPING: "Хүргэлтэнд",
  COMPLETED: "Хүлээн авсан",
  CANCELLED: "Цуцалсан",
};

const isPreorder = (item: IncomingOrderItem) =>
  item.isPreorder || item.supplyType === "CHINA_PREORDER";

export function IncomingOrdersPanel({
  initialOrderId,
  organizationName,
  organizationId,
}: {
  initialOrderId?: string;
  organizationName: string;
  organizationId: string;
}) {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preorderOnly, setPreorderOnly] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100", organizationId });
      const response = await authFetch(`${API}/vendor/orders?${params}`);
      const payload = (await response
        .json()
        .catch(() => ({}))) as OrdersResponse;
      if (!response.ok) {
        throw new Error(payload.message || "Захиалга авахад алдаа гарлаа");
      }
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Захиалга авахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, organizationId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const preorderCount = useMemo(
    () => orders.filter((order) => order.items.some(isPreorder)).length,
    [orders],
  );
  const visibleOrders = preorderOnly
    ? orders.filter((order) => order.items.some(isPreorder))
    : orders;

  return (
    <section className="flex max-h-[82vh] min-h-[420px] flex-col overflow-hidden rounded-[26px] bg-white">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
            Байгууллагын борлуулалт
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Ирсэн захиалга
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {organizationName} · Энд болон Vendor-ийн захиалгын хэсэгт ижил
            мэдээлэл харагдана.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Шинэчлэх
        </button>
      </header>

      <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={() => setPreorderOnly(false)}
          className={`rounded-full px-4 py-2 text-xs font-black transition ${
            !preorderOnly
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Бүгд · {orders.length}
        </button>
        <button
          type="button"
          onClick={() => setPreorderOnly(true)}
          className={`rounded-full px-4 py-2 text-xs font-black transition ${
            preorderOnly
              ? "bg-blue-600 text-white"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          Захиалгын бараа · {preorderCount}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {loading ? (
          <div className="grid min-h-72 place-items-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <div>
              <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                Одоогоор ирсэн захиалга алга
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => {
              const preorderItems = order.items.filter(isPreorder);
              return (
                <article
                  key={order.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                    order.id === initialOrderId
                      ? "border-orange-400 ring-4 ring-orange-100"
                      : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(order.createdAt).toLocaleString("mn-MN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-700">
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <p className="mt-2 text-lg font-black text-slate-950">
                        {Number(order.total).toLocaleString("mn-MN")}₮
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      {order.customer?.name || "Хэрэглэгч"} · {order.phone}
                    </p>
                    <p className="flex items-center gap-2 sm:justify-end">
                      <PackageCheck className="h-4 w-4 text-slate-400" />
                      {order.items.length} төрлийн бараа
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={`${order.id}-${item.name}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-800">
                            {item.name} × {item.qty}
                          </p>
                          {isPreorder(item) && (
                            <p className="mt-0.5 text-[11px] font-black text-blue-600">
                              Захиалгын бараа ·{" "}
                              {item.preorderLeadTimeDays ?? 14} хоног
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 font-black text-slate-950">
                          {Number(item.subtotal).toLocaleString("mn-MN")}₮
                        </p>
                      </div>
                    ))}
                  </div>
                  {preorderItems.length > 0 && (
                    <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                      Энэ захиалгад {preorderItems.length} захиалгын бараа
                      байна.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
