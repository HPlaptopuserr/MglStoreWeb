"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  CheckCircle,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type WarehouseOption = { id: string; name: string };

type InventoryItem = {
  id: string;
  quantity: number;
  product: { id: string; name: string; sku: string | null };
};

type TransferItem = {
  productId: string;
  name: string;
  sku: string | null;
  available: number;
  quantity: number;
};

export default function TransfersPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await wmsFetch(`${API}/warehouses`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length >= 2) {
            setSourceId(list[0].id);
            setDestId(list[1].id);
          } else if (list.length === 1) {
            setSourceId(list[0].id);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load source inventory
  useEffect(() => {
    if (!sourceId) return;
    const load = async () => {
      try {
        const res = await wmsFetch(`${API}/warehouses/${sourceId}/detail`);
        if (res.ok) {
          const data = await res.json();
          setInventory(data.inventories || []);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    setItems([]);
  }, [sourceId]);

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
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const hasError =
    items.some((i) => i.quantity > i.available) ||
    sourceId === destId ||
    !destId;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async () => {
    if (hasError || items.length === 0) return;
    setSaving(true);
    setSaved(false);

    const sourceName =
      warehouses.find((w) => w.id === sourceId)?.name || "Unknown";
    const destName = warehouses.find((w) => w.id === destId)?.name || "Unknown";

    try {
      for (const item of items) {
        // Deduct from source
        const srcInv = inventory.find(
          (inv) => inv.product.id === item.productId,
        );
        if (srcInv) {
          await wmsFetch(
            `${API}/warehouses/${sourceId}/inventory/${item.productId}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                quantity: srcInv.quantity - item.quantity,
                note: `Шилжүүлэг: ${sourceName} → ${destName}. ${note}`,
              }),
            },
          );
        }

        // Add to destination
        await wmsFetch(`${API}/warehouses/${destId}/inventory`, {
          method: "POST",
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            note: `Шилжүүлэг хүлээн авалт: ${sourceName} → ${destName}. ${note}`,
          }),
        });
      }

      setSaved(true);
      setItems([]);
      setNote("");

      // Refresh source inventory
      const res = await wmsFetch(`${API}/warehouses/${sourceId}/detail`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventories || []);
      }
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Transfer failed:", err);
      alert("Шилжүүлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (warehouses.length < 2) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
        <ArrowLeftRight className="h-10 w-10" />
        <p className="text-sm font-medium">
          Шилжүүлэг хийхэд 2-оос дээш агуулах шаардлагатай
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Агуулах хооронд бараа шилжүүлэх
        </p>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Шилжүүлэг амжилттай
          </div>
        )}
      </div>

      {/* Source → Destination */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="h-1 w-1 rounded-full bg-blue-600" />
          Шилжүүлгийн чиглэл
        </h2>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Эх агуулах
            </label>
            <div className="relative">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="h-12 w-full appearance-none rounded-lg border-2 border-emerald-200 bg-emerald-50/30 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
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

          <div className="mt-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <ArrowRight className="h-5 w-5 text-blue-600" />
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-blue-600">
              Очих агуулах
            </label>
            <div className="relative">
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className={`h-12 w-full appearance-none rounded-lg border-2 px-4 text-sm font-semibold text-slate-900 outline-none ${
                  sourceId === destId
                    ? "border-red-200 bg-red-50/30"
                    : "border-blue-200 bg-blue-50/30 focus:border-blue-400"
                }`}
              >
                {warehouses
                  .filter((wh) => wh.id !== sourceId)
                  .map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {sourceId === destId && (
              <p className="mt-1 text-xs text-red-500">
                Ижил агуулах сонгох боломжгүй
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Product search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="h-1 w-1 rounded-full bg-blue-600" />
          Шилжүүлэх бараа
        </h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Эхний агуулахын бараанаас хайх..."
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

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

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
            <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">
              Шилжүүлэх бараагаа хайж сонгоно уу
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const overStock = item.quantity > item.available;
              return (
                <div
                  key={item.productId}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                    overStock
                      ? "border-red-200 bg-red-50/50"
                      : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.sku || "—"} · Нөөц: {item.available}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white"
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
                          : "border-slate-200"
                      }`}
                    />
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {overStock && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note + Submit */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Тэмдэглэл
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Шилжүүлгийн тайлбар..."
            className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || items.length === 0 || hasError}
          className="flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4" />
              Шилжүүлэх ({totalQuantity})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
