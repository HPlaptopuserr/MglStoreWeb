"use client";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { money, retailStatus, type RetailOrder } from "./types";
function SharedOrderHistory({
  revision,
  onSelect,
}: {
  revision: number;
  onSelect: (order: RetailOrder) => void;
}) {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    authFetch(`${API}/store/shared-store/orders`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Захиалгыг ачаалж чадсангүй.");
        const payload = (await response.json()) as RetailOrder[];
        if (!controller.signal.aborted) {
          setOrders(payload);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authFetch, revision, refresh]);
  return (
    <section
      id="shared-orders"
      className="mt-8 rounded-3xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Миний захиалгууд</h2>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            setRefresh((value) => value + 1);
          }}
          aria-label="Захиалга шинэчлэх"
          className="flex size-11 items-center justify-center rounded-full hover:bg-slate-50"
        >
          {loading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {!orders.length && !loading && (
        <p className="py-4 text-sm text-slate-400">
          Таны Дундын дэлгүүрийн захиалгууд энд харагдана.
        </p>
      )}
      <div className="divide-y divide-slate-100">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => onSelect(order)}
            className="flex min-h-20 w-full flex-wrap items-center justify-between gap-3 py-4 text-left hover:text-orange-700"
          >
            <span>
              <span className="block text-sm font-bold">
                {order.orderNumber}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {order.items.length} төрлийн бараа ·{" "}
                {order.paymentStatus === "PAID"
                  ? retailStatus[order.status] || order.status
                  : new Date(order.expiresAt) < new Date()
                    ? "Төлбөрийн хугацаа дууссан"
                    : "Төлбөр хүлээж байна"}
              </span>
            </span>
            <strong className="text-sm">{money(order.total)} →</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SharedOrders(props: {
  revision: number;
  onSelect: (order: RetailOrder) => void;
}) {
  const { user } = useAuth();
  return user ? <SharedOrderHistory key={user.id} {...props} /> : null;
}
