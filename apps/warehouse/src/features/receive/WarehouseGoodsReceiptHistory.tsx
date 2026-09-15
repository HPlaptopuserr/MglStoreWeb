"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  PackageOpen,
  Printer,
  Search,
} from "lucide-react";
import Link from "next/link";
import { API, API_BASE, wmsFetch } from "@/lib/api";

type ReceiptStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

type Receipt = {
  id: string;
  receiptNumber: string;
  supplierName: string;
  supplierDocumentNumber: string | null;
  documentDate: string | null;
  status: ReceiptStatus;
  note: string | null;
  createdAt: string;
  cancellationReason: string | null;
  attachments: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
  }>;
  items: Array<{
    id: string;
    quantity: number;
    unitCost: string | number;
    batchNumber: string | null;
    expiryDate: string | null;
    location: string | null;
    product: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      unit: string | null;
    };
  }>;
};

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  DRAFT: "Ноорог",
  CONFIRMED: "Баталгаажсан",
  CANCELLED: "Цуцлагдсан",
};

export function WarehouseGoodsReceiptHistory({
  warehouseId,
  refreshKey,
}: {
  warehouseId: string;
  refreshKey: number;
}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [status, setStatus] = useState<"" | ReceiptStatus>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!warehouseId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ warehouseId, limit: "100" });
        if (status) params.set("status", status);
        if (debouncedSearch) params.set("search", debouncedSearch);
        const response = await wmsFetch(
          `${API}/warehouse-goods-receipts?${params}`,
          { signal: controller.signal },
        );
        const result = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            result?.message || "Падааны түүх авахад алдаа гарлаа",
          );
        setReceipts(Array.isArray(result?.receipts) ? result.receipts : []);
      } catch (loadError) {
        if (!controller.signal.aborted)
          setError(
            loadError instanceof Error ? loadError.message : "Алдаа гарлаа",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [warehouseId, status, debouncedSearch, refreshKey]);

  const totals = useMemo(
    () =>
      new Map(
        receipts.map((receipt) => [
          receipt.id,
          {
            quantity: receipt.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
            amount: receipt.items.reduce(
              (sum, item) => sum + item.quantity * Number(item.unitCost),
              0,
            ),
          },
        ]),
      ),
    [receipts],
  );

  const runAction = async (receipt: Receipt, action: "confirm" | "cancel") => {
    setActionId(receipt.id);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/warehouse-goods-receipts/${receipt.id}/${action}`,
        {
          method: "PATCH",
          body:
            action === "cancel"
              ? JSON.stringify({ reason: cancelReason })
              : undefined,
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.message || "Үйлдэл амжилтгүй боллоо");
      setReceipts((current) =>
        current.map((item) => (item.id === receipt.id ? result : item)),
      );
      setCancelId(null);
      setCancelReason("");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Алдаа гарлаа",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Орлогын падааны түүх">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="GRN, нийлүүлэгч, падааны дугаар, бараа, SKU, баркод..."
            className="h-10 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "" | ReceiptStatus)
          }
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          aria-label="Падааны төлөв"
        >
          <option value="">Бүх төлөв</option>
          <option value="DRAFT">Ноорог</option>
          <option value="CONFIRMED">Баталгаажсан</option>
          <option value="CANCELLED">Цуцлагдсан</option>
        </select>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-400">
          <PackageOpen className="mb-2 h-8 w-8" />
          <p className="text-sm">Падаан олдсонгүй</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {receipts.map((receipt) => {
            const total = totals.get(receipt.id)!;
            const expanded = expandedId === receipt.id;
            return (
              <div
                key={receipt.id}
                className="border-b border-slate-100 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : receipt.id)}
                  className="grid w-full grid-cols-2 gap-3 px-4 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[1.2fr_1.5fr_1fr_.7fr_1fr_auto]"
                >
                  <span className="font-semibold text-slate-900">
                    {receipt.receiptNumber}
                  </span>
                  <span className="text-sm text-slate-700">
                    {receipt.supplierName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {receipt.supplierDocumentNumber || "Падааны дугааргүй"}
                  </span>
                  <span className="text-sm text-slate-600">
                    {total.quantity} ш
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {total.amount.toLocaleString()}₮
                  </span>
                  <span className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    {STATUS_LABEL[receipt.status]}
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>
                {expanded && (
                  <div className="space-y-3 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        Падааны огноо:{" "}
                        {receipt.documentDate
                          ? new Date(receipt.documentDate).toLocaleDateString(
                              "mn-MN",
                            )
                          : "—"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {receipt.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={
                              attachment.url.startsWith("/")
                                ? `${API_BASE}${attachment.url}`
                                : attachment.url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-blue-200 bg-white px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                          >
                            {attachment.name}
                          </a>
                        ))}
                      </div>
                    </div>
                    {receipt.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-lg bg-white p-3 text-sm md:grid-cols-[2fr_1fr_1fr_1fr]"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-slate-400">
                            {item.product.sku || "—"} ·{" "}
                            {item.product.barcode || "баркодгүй"}
                          </p>
                        </div>
                        <span>
                          {item.quantity} {item.product.unit || "ш"}
                        </span>
                        <span>{Number(item.unitCost).toLocaleString()}₮</span>
                        <span className="text-xs text-slate-500">
                          {item.batchNumber || "batch —"}
                          <br />
                          {item.expiryDate
                            ? new Date(item.expiryDate).toLocaleDateString(
                                "mn-MN",
                              )
                            : "хугацаа —"}
                        </span>
                      </div>
                    ))}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/receive/${receipt.id}/print`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Printer className="h-4 w-4" />
                        Хэвлэх
                      </Link>
                      {receipt.status === "DRAFT" && (
                        <button
                          disabled={actionId === receipt.id}
                          onClick={() => void runAction(receipt, "confirm")}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Баталгаажуулах
                        </button>
                      )}
                      {receipt.status !== "CANCELLED" && (
                        <button
                          onClick={() => setCancelId(receipt.id)}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Цуцлах
                        </button>
                      )}
                    </div>
                    {cancelId === receipt.id && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <label className="mb-1 block text-xs font-semibold text-red-800">
                          Цуцлах шалтгаан
                        </label>
                        <textarea
                          value={cancelReason}
                          onChange={(event) =>
                            setCancelReason(event.target.value)
                          }
                          className="w-full rounded border border-red-200 bg-white p-2 text-sm"
                          rows={2}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={() => setCancelId(null)}
                            className="px-3 py-1.5 text-sm"
                          >
                            Болих
                          </button>
                          <button
                            disabled={
                              !cancelReason.trim() || actionId === receipt.id
                            }
                            onClick={() => void runAction(receipt, "cancel")}
                            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Цуцлалтыг батлах
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
