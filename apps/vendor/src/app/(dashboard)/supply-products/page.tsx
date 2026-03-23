"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Бүгд");
  const isLowStockView = searchParams.get("filter") === "low-stock";

  useEffect(() => {
    const load = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (!storedUser.organizationId) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API}/stock-requests/catalog/organization/${storedUser.organizationId}`,
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load supply products:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
            <p className="font-bold">Ирээдүйн POS ба агуулахын урсгалд зориулсан суурь</p>
            <p className="mt-1 text-amber-800">
              Энд харагдаж буй бараанууд нь vendor өөрөө шинээр бүртгэх бараа биш. Энэ бол
              нэгдсэн агуулахаас татаж ажиллуулах барааны жагсаалт бөгөөд цаашид POS борлуулалт
              хийгдэхэд store бүрийн өөрийн үлдэгдлээс хасагдах логиктай уялдана.
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.alertThreshold;

            return (
            <div
              key={item.id}
              className={`rounded-3xl p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isLowStock
                  ? "border-2 border-red-400 bg-gradient-to-b from-red-50 to-white shadow-red-100 md:scale-[1.02]"
                  : "border border-slate-100 bg-white"
              }`}
            >
              {isLowStock && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-100 px-3 py-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Анхааруулга: Үлдэгдэл багассан
                  </p>
                </div>
              )}

              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  {item.product.images[0]?.url ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold text-slate-900">
                    {item.product.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    {item.product.categoryName}
                  </p>
                  {item.product.sku && (
                    <p className="mt-1 text-[11px] font-mono text-slate-400">
                      SKU: {item.product.sku}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-2xl p-3 ${isLowStock ? "bg-red-50" : "bg-slate-50"}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Үлдэгдэл
                  </p>
                  <p className={`mt-1 text-lg font-black ${isLowStock ? "text-red-700" : "text-slate-900"}`}>
                    {item.quantity}
                  </p>
                  <p className={`mt-1 text-[11px] font-bold ${isLowStock ? "text-red-600" : "text-slate-400"}`}>
                    Анхааруулах босго: {item.alertThreshold}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                    Үнэ
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    ₮{Number(item.product.price).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Warehouse size={14} className={isLowStock ? "text-red-600" : "text-amber-600"} />
                  {item.warehouse.name}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.warehouse.city}, {item.warehouse.district}
                </p>
                {item.location && (
                  <p className="mt-1 text-xs text-slate-400">
                    Байршил: {item.location}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Өөрийн бараа биш</span>
                <Link
                  href={`/shipments?warehouseId=${encodeURIComponent(item.warehouse.id)}&productId=${encodeURIComponent(item.product.id)}`}
                  className={`inline-flex items-center gap-1 font-bold hover:underline ${isLowStock ? "text-red-700" : "text-amber-700"}`}
                >
                  Татах хүсэлт <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}