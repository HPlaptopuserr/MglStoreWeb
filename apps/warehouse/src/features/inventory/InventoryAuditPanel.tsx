"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type AuditIssue =
  | "NEGATIVE_STOCK"
  | "OVER_RESERVED"
  | "MISSING_SKU"
  | "MISSING_BARCODE"
  | "MISSING_LOCATION"
  | "INACTIVE_PRODUCT"
  | "EXPIRED"
  | "EXPIRING_SOON";

type AuditPayload = {
  checkedAt: string;
  summary: {
    totalProducts: number;
    healthyProducts: number;
    productsWithIssues: number;
    criticalProducts: number;
  };
  rows: Array<{
    inventoryId: string;
    product: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
    };
    physicalStock: number;
    reservedStock: number;
    availableStock: number;
    location: string | null;
    expiryDate: string | null;
    issues: AuditIssue[];
  }>;
};

const issueLabels: Record<AuditIssue, string> = {
  NEGATIVE_STOCK: "Сөрөг үлдэгдэл",
  OVER_RESERVED: "Захиалсан тоо гар дээрхээс их",
  MISSING_SKU: "SKU дутуу",
  MISSING_BARCODE: "Баркод дутуу",
  MISSING_LOCATION: "Байрлал дутуу",
  INACTIVE_PRODUCT: "Идэвхгүй бараа",
  EXPIRED: "Хугацаа дууссан",
  EXPIRING_SOON: "30 хоногт хугацаа дуусна",
};

const criticalIssues = new Set<AuditIssue>([
  "NEGATIVE_STOCK",
  "OVER_RESERVED",
  "EXPIRED",
]);

export function InventoryAuditPanel({ warehouseId }: { warehouseId: string }) {
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await wmsFetch(
          `${API}/warehouses/${warehouseId}/inventory-audit`,
          { signal },
        );
        const payload = (await response.json().catch(() => null)) as
          | AuditPayload
          | { message?: string }
          | null;
        if (!response.ok) {
          throw new Error(
            payload && "message" in payload && payload.message
              ? payload.message
              : "Audit хийхэд алдаа гарлаа",
          );
        }
        setData(payload as AuditPayload);
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Audit хийхэд алдаа гарлаа",
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [warehouseId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Нөөцийн өгөгдлийг шалгаж байна…
      </div>
    );
  }

  return (
    <section className="space-y-5" aria-label="Нөөцийн өгөгдлийн audit">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Нөөцийн өгөгдлийн шалгалт
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Нөөц, идэвхтэй захиалга, хугацаа болон үндсэн мэдээллийн зөрүүг нэг
            дор шалгана.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Дахин шалгах
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              label="Нийт шалгасан"
              value={data.summary.totalProducts}
              tone="slate"
            />
            <Metric
              label="Зөрүүгүй"
              value={data.summary.healthyProducts}
              tone="emerald"
            />
            <Metric
              label="Анхаарах"
              value={data.summary.productsWithIssues}
              tone="amber"
            />
            <Metric
              label="Яаралтай засах"
              value={data.summary.criticalProducts}
              tone="red"
            />
          </div>

          {data.rows.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="mb-2 h-9 w-9" />
              <p className="font-semibold">Зөрүү илэрсэнгүй</p>
              <p className="mt-1 text-sm">Нөөцийн мэдээлэл хэвийн байна.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Бараа</th>
                      <th className="px-4 py-3">Баркод</th>
                      <th className="px-4 py-3 text-right">Гар дээр</th>
                      <th className="px-4 py-3 text-right">Захиалгад</th>
                      <th className="px-4 py-3 text-right">Боломжит</th>
                      <th className="px-4 py-3">Илэрсэн зүйл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((row) => (
                      <tr
                        key={row.inventoryId}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {row.product.name}
                          </p>
                          <p className="font-mono text-xs text-slate-400">
                            {row.product.sku || "SKU —"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {row.product.barcode || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {row.physicalStock}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">
                          {row.reservedStock}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${row.availableStock < 0 ? "text-red-600" : "text-emerald-700"}`}
                        >
                          {row.availableStock}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {row.issues.map((issue) => (
                              <span
                                key={issue}
                                className={`rounded-full px-2 py-1 text-xs font-medium ${criticalIssues.has(issue) ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {issueLabels[issue]}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
                Сүүлд шалгасан:{" "}
                {new Date(data.checkedAt).toLocaleString("mn-MN")}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
