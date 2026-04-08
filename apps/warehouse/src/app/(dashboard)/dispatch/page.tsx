"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  PackageMinus,
  AlertTriangle,
  Check,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type InventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
  };
};

type DispatchItem = {
  productId: string;
  name: string;
  sku: string | null;
  available: number;
  quantity: number;
};

type WarehouseOption = { id: string; name: string };

export default function DispatchPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load warehouses
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
          if (list.length > 0) setSelectedWarehouseId(list[0].id);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  // Load inventory when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await wmsFetch(
          `${API}/warehouses/${selectedWarehouseId}/detail`,
        );
        if (res.ok) {
          const data = await res.json();
          setInventory(data.inventories || []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
    setItems([]);
  }, [selectedWarehouseId]);

  const filteredInventory = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return inventory
      .filter(
        (inv) =>
          inv.quantity > 0 &&
          !items.some((i) => i.productId === inv.product.id) &&
          (inv.product.name.toLowerCase().includes(q) ||
            (inv.product.sku?.toLowerCase().includes(q) ?? false)),
      )
      .slice(0, 8);
  }, [inventory, search, items]);

  const addItem = (inv: InventoryItem) => {
    setItems([
      ...items,
      {
        productId: inv.product.id,
        name: inv.product.name,
        sku: inv.product.sku,
        available: inv.quantity,
        quantity: 1,
      },
    ]);
    setSearch("");
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(
      items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const hasError = items.some((i) => i.quantity > i.available);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async () => {
    if (hasError || items.length === 0 || !selectedWarehouseId) return;
    setShowConfirm(false);
    setSaving(true);
    setSaved(false);

    try {
      for (const item of items) {
        await wmsFetch(
          `${API}/warehouses/${selectedWarehouseId}/inventory/${item.productId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              quantity: item.available - item.quantity,
              note: reason
                ? `Гаргалт: ${reason}. ${note}`
                : note || "Бараа гаргалт",
            }),
          },
        );
      }

      setSaved(true);
      setItems([]);
      setReason("");
      setNote("");
      // Refresh inventory
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/detail`,
      );
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventories || []);
      }
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Dispatch failed:", err);
      alert("Гаргахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Агуулахаас бараа гаргах, нөөц хасах
        </p>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Амжилттай гаргагдлаа
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Warehouse + Reason */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              Гаргалтын мэдээлэл
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Агуулах
                </label>
                <div className="relative">
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Шалтгаан
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Захиалга, гэмтэл, шилжүүлэг..."
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Product search */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              Бараа сонгох
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Агуулахын бараанаас хайх..."
                className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
              )}

              {filteredInventory.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredInventory.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => addItem(inv)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-blue-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {inv.product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.product.sku || "—"}
                        </p>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Нөөц: {inv.quantity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item list */}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
                <PackageMinus className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">
                  Гаргах бараагаа сонгоно уу
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <div className="col-span-5">Бараа</div>
                  <div className="col-span-2 text-center">Нөөц</div>
                  <div className="col-span-4 text-center">Гаргах тоо</div>
                  <div className="col-span-1" />
                </div>

                {items.map((item) => {
                  const overStock = item.quantity > item.available;
                  return (
                    <div
                      key={item.productId}
                      className={`grid grid-cols-12 items-center gap-2 rounded-lg border px-3 py-2.5 ${
                        overStock
                          ? "border-red-200 bg-red-50/50"
                          : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.sku || "—"}
                        </p>
                      </div>

                      <div className="col-span-2 text-center">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-600">
                          {item.available}
                        </span>
                      </div>

                      <div className="col-span-4 flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.productId,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className={`h-8 w-16 rounded border text-center text-sm font-semibold outline-none ${
                            overStock
                              ? "border-red-300 text-red-600"
                              : "border-slate-200 focus:border-blue-300"
                          }`}
                        />
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {overStock && (
                        <div className="col-span-12 flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Нөөцөөс хэтэрсэн! Боломжит: {item.available}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Тэмдэглэл
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Нэмэлт тайлбар..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Гаргалтын дүн
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Барааны төрөл</span>
                <span className="font-semibold text-slate-900">
                  {items.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Нийт тоо ширхэг</span>
                <span className="font-semibold text-slate-900">
                  {totalQuantity.toLocaleString()}
                </span>
              </div>
            </div>

            {hasError && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                Нөөцөөс хэтэрсэн бараа байна
              </div>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              disabled={saving || items.length === 0 || hasError}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PackageMinus className="h-4 w-4" />
                  Бараа гаргах
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Гаргалтыг баталгаажуулах
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {items.length} төрлийн {totalQuantity} ширхэг бараа агуулахаас
              гаргах гэж байна. Үргэлжлүүлэх үү?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Цуцлах
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Баталгаажуулах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
