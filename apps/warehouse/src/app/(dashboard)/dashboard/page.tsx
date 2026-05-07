"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  Loader2, TrendingUp, TrendingDown, ArrowLeftRight,
  ArrowRight, Layers, Package, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { API, wmsFetch } from "@/lib/api";
import { RecentMovements, MovementDetailModal, PendingRequests, CategoryModal } from "@/components/dashboard";
import type { WarehouseDetail, Movement, CategoryWithCount } from "@/components/dashboard";

const QUICK_ACTIONS = [
  { href: "/receive",   label: "Бараа хүлээн авах", icon: ArrowDownToLine,  bg: "bg-emerald-500" },
  { href: "/dispatch",  label: "Бараа гаргах",       icon: ArrowUpFromLine,  bg: "bg-blue-500" },
  { href: "/transfers", label: "Шилжүүлэг",          icon: ArrowLeftRight,   bg: "bg-purple-500" },
];

export default function WmsDashboardPage() {
  const [warehouses, setWarehouses]           = useState<WarehouseDetail[]>([]);
  const [movements, setMovements]             = useState<Movement[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseDetail | null>(null);
  const [categories, setCategories]           = useState<CategoryWithCount[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMovement, setSelectedMovement]   = useState<Movement | null>(null);
  const [whDropdownOpen, setWhDropdownOpen]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        const whUrl = user.organizationId
          ? `${API}/warehouses/organization/${user.organizationId}`
          : `${API}/warehouses`;

        const [whRes, catRes, mvRes] = await Promise.all([
          wmsFetch(whUrl),
          wmsFetch(`${API}/business-categories`),
          wmsFetch(`${API}/inventory-ledger?limit=10`),
        ]);

        if (whRes.ok) {
          const whData = await whRes.json();
          const whList = Array.isArray(whData) ? whData : whData.warehouses || [];
          const details: WarehouseDetail[] = [];
          for (const wh of whList.slice(0, 10)) {
            const r = await wmsFetch(`${API}/warehouses/${wh.id}/detail?invPage=1&invLimit=10`);
            if (r.ok) details.push(await r.json());
          }
          setWarehouses(details);
          if (details.length > 0) setSelectedWarehouse(details[0]);
        }
        if (catRes.ok) {
          const d = await catRes.json();
          setCategories(Array.isArray(d) ? d : []);
        }
        if (mvRes.ok) {
          const d = await mvRes.json();
          setMovements(d.entries || []);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Мэдээлэл татаж байна...</p>
      </div>
    );
  }

  const totalProducts   = warehouses.reduce((s, w) => s + (w.summary?.totalProducts  || 0), 0);
  const totalQuantity   = warehouses.reduce((s, w) => s + (w.summary?.totalQuantity  || 0), 0);
  const lowStockItems   = warehouses.reduce((s, w) => s + (w.summary?.lowStockCount  || 0), 0);
  const outOfStockItems = warehouses.reduce((s, w) => s + (w.summary?.outOfStockCount|| 0), 0);

  const lowStockList  = selectedWarehouse?.inventories?.filter((i) => i.quantity > 0 && i.quantity <= i.minQuantity).slice(0, 5) || [];
  const outStockList  = selectedWarehouse?.inventories?.filter((i) => i.quantity === 0).slice(0, 5) || [];
  const alertList     = [...outStockList, ...lowStockList];

  return (
    <div className="space-y-5 pb-6">

      {/* ── KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Categories */}
        <button
          onClick={() => setShowCategoryModal(true)}
          className="flex flex-col rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
        >
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
            <Layers className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <p className="text-xs font-medium text-slate-400">Ангилал</p>
          <p className="mt-0.5 text-3xl font-black text-slate-900">{categories.length}</p>
        </button>

        {/* Total stock */}
        <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-400">Нийт нөөц</p>
          <p className="mt-0.5 text-3xl font-black text-slate-900">{totalProducts}</p>
          <p className="text-[11px] text-slate-400">{totalQuantity.toLocaleString()} нэгж</p>
        </div>

        {/* Low stock */}
        <div className={`flex flex-col rounded-2xl p-4 shadow-sm ring-1 ${
          lowStockItems > 0 ? "bg-amber-50 ring-amber-100" : "bg-white ring-slate-100"
        }`}>
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
            lowStockItems > 0 ? "bg-amber-200" : "bg-slate-100"
          }`}>
            <TrendingDown className={`h-4.5 w-4.5 ${lowStockItems > 0 ? "text-amber-700" : "text-slate-400"}`} />
          </div>
          <p className="text-xs font-medium text-slate-400">Дутагдалтай</p>
          <p className={`mt-0.5 text-3xl font-black ${lowStockItems > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {lowStockItems}
          </p>
        </div>

        {/* Out of stock */}
        <div className={`flex flex-col rounded-2xl p-4 shadow-sm ring-1 ${
          outOfStockItems > 0 ? "bg-red-50 ring-red-100" : "bg-white ring-slate-100"
        }`}>
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
            outOfStockItems > 0 ? "bg-red-200" : "bg-slate-100"
          }`}>
            <AlertTriangle className={`h-4.5 w-4.5 ${outOfStockItems > 0 ? "text-red-700" : "text-slate-400"}`} />
          </div>
          <p className="text-xs font-medium text-slate-400">Дууссан</p>
          <p className={`mt-0.5 text-3xl font-black ${outOfStockItems > 0 ? "text-red-700" : "text-slate-900"}`}>
            {outOfStockItems}
          </p>
        </div>
      </div>

      {/* ── Warehouse picker (only if multiple) ──────────────────────── */}
      {warehouses.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setWhDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm sm:w-auto sm:min-w-[200px]"
          >
            <span>{selectedWarehouse?.name || "Агуулах сонгох"}</span>
            <ChevronDown className={`ml-3 h-4 w-4 text-slate-400 transition-transform ${whDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {whDropdownOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-auto sm:min-w-[200px]">
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  onClick={() => { setSelectedWarehouse(wh); setWhDropdownOpen(false); }}
                  className={`flex w-full items-center px-4 py-3 text-sm transition-colors ${
                    selectedWarehouse?.id === wh.id
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {wh.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main content grid ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Alert list */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-bold text-slate-900">Анхааруулга</h2>
            <Link href="/inventory" className="text-xs font-semibold text-blue-600">
              Бүгд харах →
            </Link>
          </div>

          {alertList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                <Package className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-700">Бүх бараа хэвийн</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {alertList.map((item) => {
                const isOut = item.quantity === 0;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isOut ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      {isOut
                        ? <AlertTriangle className="h-4 w-4 text-red-600" />
                        : <TrendingDown className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.product.sku || "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isOut ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {isOut ? "Дууссан" : `${item.quantity}/${item.minQuantity}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <h2 className="px-5 pb-2 pt-4 font-bold text-slate-900">Шуурхай үйлдэл</h2>
            <div className="divide-y divide-slate-50">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          </div>

          {/* Warehouse info */}
          {selectedWarehouse && (
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="px-5 pb-4 pt-4">
                <h2 className="font-bold text-slate-900">{selectedWarehouse.name}</h2>
                {selectedWarehouse.address && (
                  <p className="mt-0.5 text-xs text-slate-400">{selectedWarehouse.address}</p>
                )}
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Хүчин чадал", value: selectedWarehouse.capacity > 0 ? selectedWarehouse.capacity.toLocaleString() : "—" },
                    { label: "Нийт бараа",  value: selectedWarehouse.summary?.totalProducts || 0 },
                    { label: "Нийт нөөц",  value: (selectedWarehouse.summary?.totalQuantity || 0).toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                  {((selectedWarehouse.summary as any)?.capacityUsed ?? 0) > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Дүүргэлт</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {(selectedWarehouse.summary as any).capacityUsed}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ((selectedWarehouse.summary as any).capacityUsed || 0) > 90 ? "bg-red-500"
                            : ((selectedWarehouse.summary as any).capacityUsed || 0) > 70 ? "bg-amber-500"
                            : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, (selectedWarehouse.summary as any).capacityUsed || 0)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <RecentMovements movements={movements} onSelect={setSelectedMovement} />
      </div>

      {/* Pending requests */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <PendingRequests />
      </div>

      {showCategoryModal && (
        <CategoryModal categories={categories} onClose={() => setShowCategoryModal(false)} />
      )}
      {selectedMovement && (
        <MovementDetailModal movement={selectedMovement} onClose={() => setSelectedMovement(null)} />
      )}
    </div>
  );
}
