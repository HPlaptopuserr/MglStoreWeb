"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
interface RetailOrder {
  id: string;
  orderNumber: string;
  phone: string;
  shippingAddress: string;
  note: string | null;
  status: string;
  paymentStatus: string;
  total: number | string;
  createdAt: string;
  fulfillmentIssue: string | null;
  items: { id: string; productName: string; quantity: number }[];
}
const statuses: Record<string, string> = {
  PENDING: "Шалгах шаардлагатай",
  CONFIRMED: "Шинэ",
  PREPARING: "Бэлтгэж байна",
  PREPARED: "Бэлтгэгдсэн",
  SHIPPING: "Хүргэлтэд",
  COMPLETED: "Дууссан",
};
const actions: Record<string, string> = {
  CONFIRMED: "Бэлтгэж эхлэх",
  PREPARING: "Бэлтгэж дуусгах",
  PREPARED: "Хүргэлтэд гаргах",
  SHIPPING: "Хүлээлгэн өгсөн",
};
export function RetailOrdersPanel({
  warehouseId,
  includePending = false,
  onCountChange,
}: {
  warehouseId: string;
  includePending?: boolean;
  onCountChange?: (count: number | null) => void;
}) {
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!warehouseId) return;
      setLoading(true);
      setError("");
      try {
        const response = await wmsFetch(
          `${API}/warehouse-retail-orders?warehouseId=${encodeURIComponent(warehouseId)}${includePending ? "&view=incoming" : ""}`,
          { signal },
        );
        if (!response.ok) throw new Error("Аппын захиалгыг ачаалж чадсангүй.");
        const payload = (await response.json()) as RetailOrder[];
        if (!signal?.aborted) setOrders(payload);
      } catch (cause: unknown) {
        if (!signal?.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [warehouseId, includePending],
  );
  useEffect(() => {
    setOrders([]);
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => void load(controller.signal), 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [load]);
  useEffect(() => {
    if (!loading)
      onCountChange?.(
        error
          ? null
          : orders.filter(
              (order) =>
                order.status === "PENDING" ||
                order.status === "CONFIRMED" ||
                (order.paymentStatus === "PAID" && !!order.fulfillmentIssue),
            ).length,
      );
  }, [orders, error, loading, onCountChange]);
  async function advance(id: string) {
    setPending(id);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/warehouse-retail-orders/${id}/status`,
        { method: "PATCH" },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "Төлөв өөрчилж чадсангүй.");
      }
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setPending("");
    }
  }
  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <ShoppingBag size={19} className="text-orange-600" />
            Аппаас ирсэн захиалга
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Хэрэглэгчийн захиалга · төлбөр, бараа, хүргэх хаяг
          </p>
        </div>
        <button
          disabled={loading}
          onClick={() => void load()}
          aria-label="Аппын захиалга шинэчлэх"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading && !orders.length && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Захиалга ачаалж байна…
        </p>
      )}
      {!orders.length && !loading && !error && (
        <p className="py-8 text-center text-sm text-slate-400">
          Аппаас ирсэн захиалга одоогоор алга.
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{order.orderNumber}</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${order.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
              >
                {order.paymentStatus === "PAID"
                  ? statuses[order.status] || order.status
                  : "Төлбөр хүлээж байна"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {new Date(order.createdAt).toLocaleString("mn-MN")}
            </p>
            <ul className="my-4 space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>{item.productName}</span>
                  <strong className="shrink-0">× {item.quantity}</strong>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <a
                href={`tel:${order.phone}`}
                className="font-bold text-slate-900"
              >
                {order.phone}
              </a>
              <p>{order.shippingAddress}</p>
              {order.note && <p>{order.note}</p>}
              <p className="text-lg font-black text-slate-950">
                {Number(order.total).toLocaleString("mn-MN")}₮{" "}
                <span
                  className={`text-xs font-semibold ${order.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-700"}`}
                >
                  {order.paymentStatus === "PAID" ? "Төлөгдсөн" : "Төлөгдөөгүй"}
                </span>
              </p>
            </div>
            {order.paymentStatus !== "PAID" && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Төлбөр баталгаажсаны дараа захиалгыг бэлтгэнэ.
              </p>
            )}
            {order.fulfillmentIssue ? (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
              >
                {order.fulfillmentIssue}
              </p>
            ) : (
              order.paymentStatus === "PAID" &&
              actions[order.status] && (
                <button
                  disabled={pending === order.id}
                  onClick={() => void advance(order.id)}
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {pending === order.id && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {actions[order.status]}
                </button>
              )
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
