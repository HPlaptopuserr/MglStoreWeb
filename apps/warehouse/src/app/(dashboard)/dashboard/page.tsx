"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { API, wmsFetch } from "@/lib/api";
import {
  KpiCard,
  RecentMovements,
  MovementDetailModal,
  PendingRequests,
  CategoryModal,
} from "@/components/dashboard";
import type { WarehouseDetail, Movement, CategoryWithCount } from "@/components/dashboard";

export default function WmsDashboardPage() {
  const [warehouses, setWarehouses] = useState<WarehouseDetail[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseDetail | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(
          localStorage.getItem("wms_user") || "{}",
        );

        // Fetch warehouses
        let url = `${API}/warehouses`;
        if (user.organizationId) {
          url = `${API}/warehouses/organization/${user.organizationId}`;
        }

        const whRes = await wmsFetch(url);
        if (whRes.ok) {
          const whData = await whRes.json();
          const whList = Array.isArray(whData)
            ? whData
            : whData.warehouses || [];

          // Fetch details for each warehouse
          const details: WarehouseDetail[] = [];
          for (const wh of whList.slice(0, 10)) {
            let mergedDetail: any = null;
            let page = 1;
            let hasMore = true;

            while (hasMore) {
              const detailRes = await wmsFetch(
                `${API}/warehouses/${wh.id}/detail?invPage=${page}&invLimit=200`,
              );
              if (detailRes.ok) {
                const data = await detailRes.json();
                if (!mergedDetail) {
                  mergedDetail = data;
                } else {
                  mergedDetail.inventories = [...mergedDetail.inventories, ...(data.inventories || [])];
                }
                if (data.pagination && data.pagination.page < data.pagination.totalPages) {
                  page++;
                } else {
                  hasMore = false;
                }
              } else {
                break;
              }
            }
            if (mergedDetail) {
              details.push(mergedDetail);
            }
          }
          setWarehouses(details);
          if (details.length > 0) setSelectedWarehouse(details[0]);
        }

        // Fetch categories
        const catRes = await wmsFetch(`${API}/business-categories`);
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : []);
        }

        // Fetch recent movements
        const mvRes = await wmsFetch(`${API}/inventory-ledger?limit=10`);
        if (mvRes.ok) {
          const mvData = await mvRes.json();
          setMovements(mvData.entries || []);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Aggregate stats across all warehouses
  const totalProducts = warehouses.reduce(
    (sum, w) => sum + (w.summary?.totalProducts || 0),
    0,
  );
  const totalStock = warehouses.reduce(
    (sum, w) => sum + (w.summary?.totalQuantity || 0),
    0,
  );
  const lowStockItems = warehouses.reduce(
    (sum, w) => sum + (w.summary?.lowStockCount || 0),
    0,
  );
  const outOfStockItems = warehouses.reduce(
    (sum, w) => sum + (w.summary?.outOfStockCount || 0),
    0,
  );

  // Build low stock items from selected warehouse
  const lowStockList =
    selectedWarehouse?.inventories
      ?.filter((inv) => inv.quantity <= inv.minQuantity && inv.quantity > 0)
      .slice(0, 5) || [];

  const outOfStockList =
    selectedWarehouse?.inventories
      ?.filter((inv) => inv.quantity === 0)
      .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Ангилал"
          value={categories.length.toString()}
          icon={<Layers className="h-5 w-5 text-blue-600" />}
          color="blue"
          onClick={() => setShowCategoryModal(true)}
        />
        <KpiCard
          label="Нийт нөөц"
          value={totalProducts.toLocaleString()}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          color="emerald"
          sub="нэгж"
        />
        <KpiCard
          label="Дутагдалтай"
          value={lowStockItems.toString()}
          icon={<TrendingDown className="h-5 w-5 text-amber-600" />}
          color="amber"
          alert={lowStockItems > 0}
        />
        <KpiCard
          label="Дууссан"
          value={outOfStockItems.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          color="red"
          alert={outOfStockItems > 0}
        />
      </div>

      {/* Warehouse selector */}
      {warehouses.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Агуулах:</span>
          <div className="flex gap-2">
            {warehouses.map((wh) => (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouse(wh)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedWarehouse?.id === wh.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {wh.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Low stock alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Дутагдалтай бараа
            </h2>
            <Link
              href="/inventory?status=low"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Бүгдийг харах →
            </Link>
          </div>

          {lowStockList.length === 0 && outOfStockList.length === 0 ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Дутагдалтай бараа байхгүй
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {outOfStockList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.product.sku || "SKU байхгүй"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      ДУУССАН
                    </span>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Min: {item.minQuantity}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.product.sku || "SKU байхгүй"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      {item.quantity} / {item.minQuantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-900">
              Шуурхай үйлдэл
            </h2>
            <div className="space-y-2">
              <Link
                href="/receive"
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Бараа хүлээн авах
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href="/dispatch"
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                    <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Бараа гаргах
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href="/transfers"
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Шилжүүлэг
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>
            </div>
          </div>

          {/* Warehouse info */}
          {selectedWarehouse && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-900">
                {selectedWarehouse.name}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedWarehouse.address}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Хүчин чадал</span>
                  <span className="font-medium text-slate-900">
                    {selectedWarehouse.capacity > 0
                      ? selectedWarehouse.capacity.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Нийт бараа</span>
                  <span className="font-medium text-slate-900">
                    {selectedWarehouse.summary?.totalProducts || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Нийт нөөц</span>
                  <span className="font-medium text-slate-900">
                    {(
                      selectedWarehouse.summary?.totalQuantity || 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <RecentMovements movements={movements} onSelect={setSelectedMovement} />

      {/* Pending stock requests */}
      <PendingRequests />

      {/* Category modal */}
      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* Movement detail modal */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
        />
      )}
    </div>
  );
}

