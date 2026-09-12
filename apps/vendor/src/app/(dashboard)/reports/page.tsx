"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import type { Product } from "@/features/products";
import {
  BestSellingProducts,
  type BestSellingProduct,
  calculateMarginPercent,
  calculateProductReportTotals,
  exportProductReportToPdf,
  ProductReportSummary,
} from "@/features/reports";

type StatusFilter = "all" | "active" | "inactive";

interface VendorSession {
  organizationId?: string;
  organizationName?: string;
}

const money = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")} ₮`;

function readVendorSession(): VendorSession {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("vendor_user") || "{}",
    );
    return value && typeof value === "object" ? (value as VendorSession) : {};
  } catch {
    return {};
  }
}

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [bestSellingProducts, setBestSellingProducts] = useState<
    BestSellingProduct[]
  >([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const loadProducts = useCallback(async () => {
    const session = readVendorSession();
    if (!session.organizationId) {
      setError("Байгууллагын мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.");
      setLoading(false);
      return;
    }

    setOrganizationName(session.organizationName || "");
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        organizationId: session.organizationId,
        includeExpiredInventory: "1",
        includeInactive: "1",
      });
      const response = await authFetch(`${API}/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          body.message || "Бүтээгдэхүүний тайлан ачаалж чадсангүй",
        );
      }
      const data: unknown = await response.json();
      const rows = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            "products" in data &&
            Array.isArray(data.products)
          ? data.products
          : [];
      setProducts(rows as Product[]);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Тайлан ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const loadBestSellingProducts = useCallback(async () => {
    const session = readVendorSession();
    if (!session.organizationId) return;
    setSalesLoading(true);
    setSalesError(null);
    try {
      const params = new URLSearchParams({
        organizationId: session.organizationId,
        from: `${fromDate}T00:00:00.000Z`,
        to: `${toDate}T23:59:59.999Z`,
        limit: "10",
      });
      const response = await authFetch(
        `${API}/pos/reports/top-products?${params.toString()}`,
        { cache: "no-store" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        products?: BestSellingProduct[];
      };
      if (!response.ok) {
        const message =
          response.status === 404
            ? "Борлуулалтын тайлангийн API олдсонгүй. API сервер хуучин хувилбараар ажиллаж байна — серверийг restart хийгээд дахин оролдоно уу."
            : response.status === 401
              ? "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрч тайлангаа нээнэ үү."
              : response.status === 403
                ? "Энэ борлуулалтын тайланг харах эрх таны хэрэглэгчид олгогдоогүй байна."
                : response.status >= 500
                  ? "API сервер борлуулалтын тайланг боловсруулж чадсангүй. Серверийн log-ийг шалгаад дахин оролдоно уу."
                  : body.message ||
                    `Борлуулалтын тайлан ачаалж чадсангүй (HTTP ${response.status}).`;
        throw new Error(message);
      }
      setBestSellingProducts(Array.isArray(body.products) ? body.products : []);
    } catch (salesError: unknown) {
      setSalesError(
        salesError instanceof Error
          ? salesError.message
          : "Борлуулалтын тайлан ачаалахад алдаа гарлаа",
      );
      setBestSellingProducts([]);
    } finally {
      setSalesLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadBestSellingProducts();
  }, [loadBestSellingProducts]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.businessCategory?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b, "mn")),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("mn");
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLocaleLowerCase("mn").includes(query) ||
        (product.sku || "").toLocaleLowerCase("mn").includes(query) ||
        (product.barcode || "").toLocaleLowerCase("mn").includes(query);
      const matchesStatus =
        status === "all" ||
        (status === "active" && product.isActive) ||
        (status === "inactive" && !product.isActive);
      const matchesCategory =
        category === "all" || product.businessCategory?.name === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, products, search, status]);

  const totals = useMemo(
    () => calculateProductReportTotals(filteredProducts),
    [filteredProducts],
  );

  const handleExport = () => {
    try {
      const filters = [
        status === "active"
          ? "Идэвхтэй"
          : status === "inactive"
            ? "Идэвхгүй"
            : "Бүх төлөв",
        category === "all" ? "Бүх ангилал" : category,
        search.trim() ? `Хайлт: ${search.trim()}` : null,
      ].filter((value): value is string => Boolean(value));
      exportProductReportToPdf({
        organizationName,
        products: filteredProducts,
        filterDescription: filters.join(" · "),
        bestSellingProducts,
        salesPeriodDescription: `${fromDate} - ${toDate}`,
      });
    } catch (exportError: unknown) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "PDF тайлан нээж чадсангүй",
      );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-indigo-600">
            <FileText size={18} />
            <span className="text-xs font-black uppercase tracking-[0.16em]">
              Бүтээгдэхүүний шинжилгээ
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Тайлан
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Авсан үнэ, зарах үнэ, үлдэгдэл болон боломжит ашгийн тайлан
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void loadProducts();
              void loadBestSellingProducts();
            }}
            disabled={loading || salesLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading || salesLoading ? "animate-spin" : ""}
            />
            Шинэчлэх
          </button>
          <button
            data-tour="report-pdf"
            type="button"
            onClick={handleExport}
            disabled={loading || filteredProducts.length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Download size={16} />
            PDF тайлан
          </button>
        </div>
      </header>

      <section
        data-tour="report-filters"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Тайлан шүүх"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <SlidersHorizontal size={17} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Шүүлтүүр</h2>
              <p className="text-xs text-slate-500">
                {filteredProducts.length.toLocaleString("mn-MN")} бүтээгдэхүүн
                харагдаж байна
              </p>
            </div>
          </div>
          {(search || status !== "all" || category !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setCategory("all");
              }}
              className="inline-flex h-9 w-fit items-center gap-2 rounded-lg px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw size={14} /> Цэвэрлэх
            </button>
          )}
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">
              Бүтээгдэхүүн хайх
            </span>
            <span className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Нэр, SKU эсвэл баркод"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-600">Төлөв</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">Бүх төлөв</option>
              <option value="active">Идэвхтэй</option>
              <option value="inactive">Идэвхгүй</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-600">Ангилал</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">Бүх ангилал</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-[1fr_1fr_1.25fr] lg:items-end">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            Эхлэх огноо
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            Дуусах огноо
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <div className="flex min-h-11 items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs leading-5 text-indigo-700 sm:col-span-2 lg:col-span-1">
            <CalendarDays size={17} className="shrink-0" />
            Энэ хугацаа хамгийн их зарагдсан барааны тооцоонд үйлчилнэ.
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}
      <ProductReportSummary totals={totals} />
      <BestSellingProducts
        products={bestSellingProducts}
        loading={salesLoading}
        error={salesError}
        onRetry={() => void loadBestSellingProducts()}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-black text-slate-800">
            Бүтээгдэхүүний задаргаа
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {filteredProducts.length} мөр
          </span>
        </div>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            Тайлан ачаалж байна...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <FileText className="mb-3 h-9 w-9 text-slate-300" />
            <p className="font-bold text-slate-600">
              Тохирох бүтээгдэхүүн олдсонгүй
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Хайлт эсвэл шүүлтүүрээ өөрчилнө үү.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Бүтээгдэхүүн</th>
                  <th className="px-4 py-3">Ангилал</th>
                  <th className="px-4 py-3 text-right">Авсан үнэ</th>
                  <th className="px-4 py-3 text-right">Зарах үнэ</th>
                  <th className="px-4 py-3 text-right">Бөөний үнэ</th>
                  <th className="px-4 py-3 text-right">Үлдэгдэл</th>
                  <th className="px-4 py-3 text-right">Ашгийн хувь</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const margin = calculateMarginPercent(product);
                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {product.sku || product.barcode || "Кодгүй"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.businessCategory?.name || "Ангилалгүй"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {product.costPrice == null
                          ? "—"
                          : money(product.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {money(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {product.wholesalePrice == null
                          ? "—"
                          : money(product.wholesalePrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {product.stock.toLocaleString("mn-MN")}{" "}
                        {product.unit === "kg" ? "кг" : "ш"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${margin != null && margin < 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {margin == null ? "—" : `${margin.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-slate-400">
        Боломжит ашиг гэдэг нь одоогийн үлдэгдлийг бүгдийг нь зарах үнээр
        борлуулсны дараах урьдчилсан ашиг юм. Авсан үнэ бүртгээгүй барааны
        өртгийг 0 ₮ гэж үзэх тул ашиг бодит хэмжээнээс өндөр харагдаж болно.
      </p>
    </div>
  );
}
