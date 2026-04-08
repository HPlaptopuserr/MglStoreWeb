"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  Download,
  Calendar,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type WarehouseOption = { id: string; name: string };

type InventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
  };
};

type WarehouseDetail = {
  id: string;
  name: string;
  inventories: InventoryItem[];
  _count?: { inventories: number };
};

export default function ReportsPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [detail, setDetail] = useState<WarehouseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        let url = `${API}/warehouses`;
        if (user.organizationId) {
          url = `${API}/warehouses/organization/${user.organizationId}`;
        }
        const res = await wmsFetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setWarehouseId(list[0].id);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const res = await wmsFetch(`${API}/warehouses/${warehouseId}/detail`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const inventories = detail?.inventories || [];
  const totalProducts = inventories.length;
  const totalStock = inventories.reduce((s, i) => s + i.quantity, 0);
  const totalValue = inventories.reduce(
    (s, i) => s + i.quantity * (i.product.price || 0),
    0,
  );
  const lowStockItems = inventories.filter(
    (i) => i.minQuantity && i.quantity > 0 && i.quantity <= i.minQuantity,
  );
  const outOfStockItems = inventories.filter((i) => i.quantity <= 0);
  const healthyItems = inventories.filter(
    (i) => i.quantity > 0 && (!i.minQuantity || i.quantity > i.minQuantity),
  );

  // Top 10 by quantity
  const topByQty = [...inventories]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Top 10 by value
  const topByValue = [...inventories]
    .sort(
      (a, b) =>
        b.quantity * (b.product.price || 0) -
        a.quantity * (a.product.price || 0),
    )
    .slice(0, 10);

  const maxQty = topByQty[0]?.quantity || 1;
  const maxValue =
    topByValue[0]
      ? topByValue[0].quantity * (topByValue[0].product.price || 0)
      : 1;

  const handleExportCSV = () => {
    if (!inventories.length) return;
    const headers = ["Бараа", "SKU", "Тоо ширхэг", "Мин", "Макс", "Үнэ", "Нийт үнэ"];
    const rows = inventories.map((i) => [
      i.product.name,
      i.product.sku || "",
      i.quantity,
      i.minQuantity || "",
      i.maxQuantity || "",
      i.product.price || 0,
      i.quantity * (i.product.price || 0),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !detail) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-sm font-medium outline-none focus:border-blue-500"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          CSV татах
        </button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Package className="h-3.5 w-3.5" />
            Нийт бараа
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalProducts}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <BarChart3 className="h-3.5 w-3.5" />
            Нийт нөөц
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalStock.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
            <TrendingUp className="h-3.5 w-3.5" />
            Нийт үнэ цэнэ
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {(totalValue / 1000).toFixed(0)}K₮
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Дутагдалтай
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {lowStockItems.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
            <TrendingDown className="h-3.5 w-3.5" />
            Дууссан
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {outOfStockItems.length}
          </p>
        </div>
      </div>

      {/* Stock health breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-900">
          Нөөцийн төлөв
        </h3>
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
          {totalProducts > 0 && (
            <>
              <div
                className="bg-emerald-500 transition-all"
                style={{
                  width: `${(healthyItems.length / totalProducts) * 100}%`,
                }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{
                  width: `${(lowStockItems.length / totalProducts) * 100}%`,
                }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{
                  width: `${(outOfStockItems.length / totalProducts) * 100}%`,
                }}
              />
            </>
          )}
        </div>
        <div className="mt-3 flex gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">
              Хэвийн ({healthyItems.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-600">
              Дутагдал ({lowStockItems.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-slate-600">
              Дууссан ({outOfStockItems.length})
            </span>
          </div>
        </div>
      </div>

      {/* Two column charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top by quantity */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-900">
            Тоо ширхэгээр Топ 10
          </h3>
          <div className="space-y-2.5">
            {topByQty.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-bold text-slate-300">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                      {item.product.name}
                    </p>
                    <span className="text-xs font-bold text-slate-900">
                      {item.quantity.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(item.quantity / maxQty) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {topByQty.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Мэдээлэл байхгүй
              </p>
            )}
          </div>
        </div>

        {/* Top by value */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-900">
            Үнэ цэнээрээ Топ 10
          </h3>
          <div className="space-y-2.5">
            {topByValue.map((item, idx) => {
              const value = item.quantity * (item.product.price || 0);
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-bold text-slate-300">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                        {item.product.name}
                      </p>
                      <span className="text-xs font-bold text-slate-900">
                        {(value / 1000).toFixed(0)}K₮
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${(value / maxValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {topByValue.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Мэдээлэл байхгүй
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alert table */}
      {lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Дутагдалтай бараа ({lowStockItems.length})
          </h3>
          <div className="space-y-1.5">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.product.sku || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-600">
                    {item.quantity} / {item.minQuantity}
                  </p>
                  <p className="text-[10px] text-slate-400">одоо / шаардлага</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Out of stock */}
      {outOfStockItems.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-800">
            <TrendingDown className="h-4 w-4" />
            Дууссан бараа ({outOfStockItems.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {outOfStockItems.map((item) => (
              <span
                key={item.id}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700"
              >
                {item.product.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
