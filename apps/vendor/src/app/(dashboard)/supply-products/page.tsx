"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Boxes,
  FolderTree,
  Loader2,
  Package,
  Search,
  Warehouse,
  ChevronRight,
  Info,
  AlertTriangle,
} from "lucide-react";
import { API } from "@/lib/api";

type CatalogCategory = {
  name: string;
  itemCount: number;
  totalQuantity: number;
};

type CatalogWarehouse = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type CatalogItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  alertThreshold: number;
  isLowStock: boolean;
  location: string | null;
  source?: "warehouse" | "own";
  warehouse: CatalogWarehouse;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string | number;
    stock: number;
    images: { url: string }[];
    categoryName: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

type CatalogResponse = {
  organizationId: string;
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalCategories: number;
    totalWarehouses: number;
    lowStockItems: number;
  };
  categories: CatalogCategory[];
  warehouses: CatalogWarehouse[];
  items: CatalogItem[];
};

export default function SupplyProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Бүгд");
  const isLowStockView = searchParams.get("filter") === "low-stock";

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (!storedUser.organizationId) {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("vendor_token");
        const res = await fetch(
          `${API}/stock-requests/catalog/organization/${storedUser.organizationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (res.status === 401) {
          localStorage.removeItem("vendor_token");
          localStorage.removeItem("vendor_user");
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load supply products:", err);
        setError("Нэгдсэн барааны жагсаалт авахад алдаа гарлаа. Дахин оролдоно уу.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [retryKey]);

  const filteredItems = useMemo(() => {
    const list = data?.items || [];
    return list.filter((item) => {
      const categoryMatch =
        activeCategory === "Бүгд" || item.product.categoryName === activeCategory;
      const stockMatch = !isLowStockView || item.quantity <= item.alertThreshold;
      const searchLower = search.toLowerCase();
      const searchMatch =
        !searchLower ||
        item.product.name.toLowerCase().includes(searchLower) ||
        item.product.sku?.toLowerCase().includes(searchLower) ||
        item.warehouse.name.toLowerCase().includes(searchLower);
      return categoryMatch && stockMatch && searchMatch;
    });
  }, [activeCategory, data?.items, isLowStockView, search]);

  const categories = useMemo(() => {
    return [
      { name: "Бүгд", itemCount: data?.summary.totalItems || 0, totalQuantity: data?.summary.totalQuantity || 0 },
      ...(data?.categories || []),
    ];
  }, [data]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Нэгдсэн бараа
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isLowStockView
              ? "Үлдэгдэл нь анхааруулах түвшинд хүрсэн нэгдсэн бараанууд"
              : "Агуулахаас нэгдсэн журмаар татах боломжтой бараанууд"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="shrink-0 rounded-xl bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200"
            >
              Дахин оролдох
            </button>
          </div>
        </div>
      )}

      {isLowStockView && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-bold">Үлдэгдэл багассан барааны анхааруулга</p>
          <p className="mt-1 text-red-800">
            Одоогоор {data?.summary.lowStockItems ?? 0} бараа анхааруулах түвшинд хүрсэн байна.
            Эдгээр барааг түрүүлж шалгаж, таталтын хүсэлтээ үүсгэнэ үү.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Зөвхөн татагдсан барааны жагсаалт</p>
            <p className="mt-1 text-amber-800">
              Энэ хэсэгт зөвхөн агуулахаас танай байгууллагад хүргэгдэж дууссан
              (татагдсан) бараанууд харагдана.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Нийт төрөл", value: data?.summary.totalItems ?? 0, icon: Boxes },
          { label: "Нийт үлдэгдэл", value: data?.summary.totalQuantity ?? 0, icon: Package },
          { label: "Ангилал", value: data?.summary.totalCategories ?? 0, icon: FolderTree },
          isLowStockView
            ? { label: "Анхааруулга", value: data?.summary.lowStockItems ?? 0, icon: Warehouse }
            : { label: "Агуулах", value: data?.summary.totalWarehouses ?? 0, icon: Warehouse },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Бараа, SKU, агуулах хайх..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                {category.name} ({category.totalQuantity})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
          <Boxes size={36} className="mx-auto mb-4 text-slate-300" />
          <p className="text-base font-bold text-slate-800">Нэгдсэн бараа олдсонгүй</p>
          <p className="mt-1 text-sm text-slate-500">
            Хуваарилагдсан агуулах эсвэл үлдэгдэлтэй бараа байхгүй байна.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Бараа</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Ангилал</th>
                  <th className="px-4 py-3 font-semibold">Агуулах</th>
                  <th className="px-4 py-3 text-right font-semibold">Үлдэгдэл</th>
                  <th className="px-4 py-3 text-right font-semibold">Босго</th>
                  <th className="px-4 py-3 text-right font-semibold">Үнэ</th>
                  <th className="px-4 py-3 font-semibold">Төлөв</th>
                  <th className="px-4 py-3 text-right font-semibold">Дэлгэрэнгүй</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.alertThreshold;
                  const isOwnProduct = item.source === "own";

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50 ${
                        isLowStock ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {item.product.images[0]?.url ? (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{item.product.name}</p>
                            <p className="text-xs text-slate-400">
                              {isOwnProduct ? "Өөрийн бараа" : "Татагдсан бараа"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {item.product.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.product.categoryName}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">
                          <p className="font-medium">{item.warehouse.name}</p>
                          <p className="text-xs text-slate-400">
                            {item.warehouse.city}, {item.warehouse.district}
                          </p>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${isLowStock ? "text-red-700" : "text-slate-800"}`}>
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{item.alertThreshold}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ₮{Number(item.product.price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <AlertTriangle size={12} />
                            Дутагдал
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Хэвийн
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/shipments?warehouseId=${encodeURIComponent(item.warehouse.id)}&productId=${encodeURIComponent(item.product.id)}`}
                          className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                            isLowStock ? "text-red-700" : "text-amber-700"
                          }`}
                        >
                          Түүх <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}