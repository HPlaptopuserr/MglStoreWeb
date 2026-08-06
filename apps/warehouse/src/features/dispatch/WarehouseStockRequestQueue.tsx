"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

type RequestItem = {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  product: { id: string; name: string; sku: string | null };
};

type StockRequest = {
  id: string;
  requestNumber: string;
  status: RequestStatus;
  requestedAt: string;
  note: string | null;
  reviewNote: string | null;
  organization: { id: string; name: string };
  warehouse: { id: string; name: string };
  items: RequestItem[];
};

type StatusFilter = RequestStatus | "ALL";

const STATUS = {
  PENDING: { label: "Хүлээгдэж буй", icon: Clock, tone: "amber" },
  APPROVED: { label: "Зөвшөөрөгдсөн", icon: CheckCircle2, tone: "emerald" },
  PROCESSING: { label: "Боловсруулж буй", icon: Truck, tone: "blue" },
  COMPLETED: { label: "Дууссан", icon: Package, tone: "slate" },
  REJECTED: { label: "Татгалзсан", icon: XCircle, tone: "red" },
  CANCELLED: { label: "Цуцлагдсан", icon: XCircle, tone: "slate" },
} satisfies Record<
  RequestStatus,
  { label: string; icon: typeof Clock; tone: string }
>;

const TONE_CLASS: Record<string, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

interface WarehouseStockRequestQueueProps {
  warehouseId: string;
  onDecision: () => void;
}

export function WarehouseStockRequestQueue({
  warehouseId,
  onDecision,
}: WarehouseStockRequestQueueProps) {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StockRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!warehouseId) return;
      silent ? setRefreshing(true) : setLoading(true);
      try {
        setError(null);
        const response = await wmsFetch(
          `${API}/stock-requests?warehouseId=${encodeURIComponent(warehouseId)}`,
        );
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.message || "Бараа татах хүсэлт авахад алдаа гарлаа");
        }
        setRequests(Array.isArray(body) ? body : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Бараа татах хүсэлт авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [warehouseId],
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const counts = useMemo(
    () =>
      requests.reduce<Record<RequestStatus, number>>(
        (result, request) => ({
          ...result,
          [request.status]: result[request.status] + 1,
        }),
        {
          PENDING: 0,
          APPROVED: 0,
          PROCESSING: 0,
          COMPLETED: 0,
          REJECTED: 0,
          CANCELLED: 0,
        },
      ),
    [requests],
  );
  const visible = useMemo(
    () => requests.filter((request) => filter === "ALL" || request.status === filter),
    [filter, requests],
  );

  const open = (request: StockRequest) => {
    setSelected(request);
    setAction(null);
    setNote("");
    setQuantities(
      Object.fromEntries(request.items.map((item) => [item.id, item.quantity])),
    );
  };

  const close = () => {
    if (submitting) return;
    setSelected(null);
    setAction(null);
  };

  const decide = async () => {
    if (!selected || !action) return;
    if (action === "reject" && !note.trim()) {
      setError("Татгалзсан шалтгаан оруулна уу");
      return;
    }
    setSubmitting(true);
    try {
      const response = await wmsFetch(
        `${API}/stock-requests/${selected.id}/${action === "approve" ? "approve" : "reject"}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reviewNote: note.trim() || null,
            ...(action === "approve"
              ? {
                  items: selected.items.map((item) => ({
                    productId: item.productId,
                    approvedQuantity: quantities[item.id] ?? item.quantity,
                  })),
                }
              : {}),
          }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || "Шийдвэр хадгалагдсангүй");
      setSelected(null);
      setAction(null);
      await load();
      onDecision();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Шийдвэр хадгалагдсангүй",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">Бараа татах хүсэлт</h2>
            {counts.PENDING > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                {counts.PENDING} шинэ
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Admin болон агуулах нэг төлөв, нэг шийдвэрлэх урсгал ашиглана.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {(["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"] as const).map(
          (status) => {
            const config = STATUS[status];
            const Icon = config.icon;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(filter === status ? "ALL" : status)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                  filter === status
                    ? `${TONE_CLASS[config.tone]} ring-2 ring-offset-1`
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-lg font-black">{counts[status]}</span>
                  <span className="block truncate text-[11px] font-bold opacity-75">
                    {config.label}
                  </span>
                </span>
              </button>
            );
          },
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
          <Package className="mb-2 h-7 w-7" />
          <p className="text-sm font-semibold">Энэ төлөвт хүсэлт байхгүй</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.slice(0, 20).map((request) => {
            const config = STATUS[request.status];
            const Icon = config.icon;
            return (
              <button
                key={request.id}
                type="button"
                onClick={() => open(request)}
                className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`rounded-lg border p-2 ${TONE_CLASS[config.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{request.requestNumber}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[config.tone]}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {request.organization.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {request.items.length} төрөл · {request.items.reduce((sum, item) => sum + item.quantity, 0)} ширхэг
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-slate-400">
                    {new Date(request.requestedAt).toLocaleDateString("mn-MN")}
                  </span>
                  {request.status === "PENDING" && (
                    <span className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                      Шийдвэрлэх
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h3 className="font-black text-slate-900">{selected.requestNumber}</h3>
                <p className="text-xs text-slate-500">{selected.organization.name}</p>
              </div>
              <button type="button" onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <Package className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{item.product.name}</p>
                      <p className="text-[11px] text-slate-400">{item.product.sku || "SKU байхгүй"}</p>
                    </div>
                    {selected.status === "PENDING" && action === "approve" ? (
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [item.id]: Math.min(item.quantity, Math.max(0, Number(event.target.value) || 0)),
                          }))
                        }
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-bold"
                      />
                    ) : (
                      <span className="text-sm font-black text-slate-700">{item.approvedQuantity ?? item.quantity} ш</span>
                    )}
                  </div>
                ))}
              </div>

              {selected.note && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected.note}</div>
              )}

              {selected.status === "PENDING" && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  {!action ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setAction("reject")} className="rounded-xl border border-red-200 py-3 text-sm font-black text-red-700 hover:bg-red-50">
                        Татгалзах
                      </button>
                      <button type="button" onClick={() => setAction("approve")} className="rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-700">
                        Зөвшөөрөх
                      </button>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={action === "reject" ? "Татгалзсан шалтгаан..." : "Нэмэлт тэмдэглэл (заавал биш)"}
                        className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setAction(null)} disabled={submitting} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600">
                          Буцах
                        </button>
                        <button type="button" onClick={() => void decide()} disabled={submitting} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 ${action === "approve" ? "bg-emerald-600" : "bg-red-600"}`}>
                          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          Баталгаажуулах
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
