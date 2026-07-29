"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  Download,
  Globe2,
  Loader2,
  PackageSearch,
  Search,
  Unlink,
} from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

type MasterProductRow = {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  categoryName: string | null;
  linkedProductCount: number;
  organizationCount: number;
  systemStock: number;
  systemSoldQuantity90d: number;
  systemRequestedQuantity90d: number;
  updatedAt: string;
};

type MasterCatalogResponse = {
  items: MasterProductRow[];
  total: number;
  unlinkedProductCount: number;
  page: number;
  hasMore: boolean;
};

export default function MasterProductsPage() {
  const [data, setData] = useState<MasterCatalogResponse | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"excel" | "ai" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/products/master-catalog/admin?limit=100&page=${page}&search=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Нэгдсэн барааны API ажиллахгүй байна",
          ),
        );
      }
      setData((await response.json()) as MasterCatalogResponse);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Нэгдсэн барааны сан ачаалсангүй",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => void load(), [load]);

  const download = async (kind: "excel" | "ai") => {
    setDownloading(kind);
    setError("");
    try {
      const path = kind === "excel" ? "export" : "ai-dataset";
      const response = await adminFetch(
        `${API}/products/master-catalog/admin/${path}?search=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Файл бэлтгэхэд алдаа гарлаа"),
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        kind === "excel" ? "master-products.xlsx" : "master-products-ai.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Файл татаж чадсангүй");
    } finally {
      setDownloading(null);
    }
  };

  const syncUnlinked = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/products/master-catalog/admin/sync`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Нэгдсэн барааны сан шинэчлэхэд алдаа гарлаа",
          ),
        );
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Бараануудыг холбож чадсангүй",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            System catalog
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Нэгдсэн барааны сан
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Бүх байгууллагын барааг canonical бүтээгдэхүүнээр төвлөрүүлсэн
            AI-ready бүртгэл.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => download("ai")}
            disabled={downloading !== null}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {downloading === "ai" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Bot size={17} />
            )}{" "}
            AI dataset
          </button>
          <button
            onClick={() => download("excel")}
            disabled={downloading !== null}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading === "excel" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Download size={17} />
            )}{" "}
            Excel татах
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Canonical бараа"
          value={data?.total ?? 0}
          icon={<PackageSearch size={19} />}
        />
        <Stat
          label="Master холбоосгүй"
          value={data?.unlinkedProductCount ?? 0}
          icon={<Unlink size={19} />}
          warning
        />
        <Stat label="Хугацаа" value="90 хоног" icon={<Bot size={19} />} />
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            <Globe2 size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-black text-slate-950">
              Онлайн худалдаанд оролцох байгууллагууд
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-slate-600">
              Нэгдсэн санд бүртгэх нь website-д автоматаар нийтлэхгүй.
              Байгууллага тус бүрийн “Онлайн шоп / Хүнсний дэлгүүр” сувгийг
              нээсний дараа зөвхөн идэвхтэй, батлагдсан бараа харагдана.
            </p>
          </div>
        </div>
        <Link
          href="/sections/vendor-features"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Байгууллагын суваг тохируулах
        </Link>
      </section>

      {(data?.unlinkedProductCount ?? 0) > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-amber-900">
              Төв сантай холбоогүй бараа байна
            </p>
            <p className="text-sm text-amber-700">
              Нэг удаад 500 барааг barcode, canonical нэр болон alias-аар
              аюулгүй холбоно.
            </p>
          </div>
          <button
            onClick={syncUnlinked}
            disabled={syncing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-amber-950 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Unlink size={16} />
            )}
            Төв санд холбох
          </button>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
        className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Нэр, баркод, alias хайх..."
            className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-3 text-sm outline-none ring-blue-100 focus:ring-2"
          />
        </div>
        <button className="rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
          Хайх
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Бараа</th>
                <th className="px-4 py-3">Баркод</th>
                <th className="px-4 py-3 text-right">Байгууллага</th>
                <th className="px-4 py-3 text-right">Холбоос</th>
                <th className="px-4 py-3 text-right">Үлдэгдэл</th>
                <th className="px-4 py-3 text-right">90 хоногт зарагдсан</th>
                <th className="px-4 py-3 text-right">90 хоногт татсан</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="mx-auto animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : data?.items.length ? (
                data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {item.canonicalName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.brand || item.categoryName || "Ангилагдаагүй"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {item.barcode || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.organizationCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.linkedProductCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.systemStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-violet-700">
                      {item.systemSoldQuantity90d.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700">
                      {item.systemRequestedQuantity90d.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
                    Бараа олдсонгүй
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && data && data.total > 100 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">
              {data.total.toLocaleString()} бараанаас{" "}
              {(data.page - 1) * 100 + 1}–
              {Math.min(data.page * 100, data.total)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={data.page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Өмнөх
              </button>
              <button
                onClick={() => setPage((value) => value + 1)}
                disabled={!data.hasMore}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Дараах
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  warning = false,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${warning ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-950">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
