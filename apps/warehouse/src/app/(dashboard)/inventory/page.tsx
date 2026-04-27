"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  Package,
  AlertTriangle,
  XCircle,
  Filter,
  X,
  Calendar,
  Barcode,
  MapPin,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type InventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    barcode?: string;
  };
};

type WarehouseOption = {
  id: string;
  name: string;
};

type StockStatus = "all" | "healthy" | "low" | "out";

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

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
  }, [selectedWarehouseId]);

  const getStatus = (item: InventoryItem): StockStatus => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= item.minQuantity) return "low";
    return "healthy";
  };

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && getStatus(item) !== statusFilter) {
        return false;
      }
      // Search
      if (search) {
        const q = search.toLowerCase();
        return (
          item.product.name.toLowerCase().includes(q) ||
          (item.product.sku?.toLowerCase().includes(q) ?? false) ||
          (item.location?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [inventory, search, statusFilter]);

  const counts = useMemo(() => {
    const healthy = inventory.filter((i) => getStatus(i) === "healthy").length;
    const low = inventory.filter((i) => getStatus(i) === "low").length;
    const out = inventory.filter((i) => getStatus(i) === "out").length;
    return { healthy, low, out, total: inventory.length };
  }, [inventory]);

  const getStatusLabel = (item: InventoryItem) => {
    const status = getStatus(item);
    if (status === "out") {
      return { label: "Дууссан", color: "bg-red-100 text-red-700" };
    } else if (status === "low") {
      return { label: "Дутагдал", color: "bg-amber-100 text-amber-700" };
    } else {
      return { label: "Хэвийн", color: "bg-emerald-100 text-emerald-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Warehouse selector */}
        {warehouses.length > 0 && (
          <div className="relative">
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Бараа, SKU, байрлал хайх..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              { key: "all", label: "Бүгд", count: counts.total },
              { key: "healthy", label: "Хэвийн", count: counts.healthy },
              { key: "low", label: "Дутагдал", count: counts.low },
              { key: "out", label: "Дууссан", count: counts.out },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === btn.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {btn.label}
              <span className="ml-1 opacity-70">{btn.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600">
            Хэвийн{" "}
            <span className="font-semibold text-slate-900">
              {counts.healthy}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600">
            Дутагдал{" "}
            <span className="font-semibold text-slate-900">{counts.low}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-slate-600">
            Дууссан{" "}
            <span className="font-semibold text-slate-900">{counts.out}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-8 w-8" />
            <p className="text-sm">Бараа олдсонгүй</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Төлөв</th>
                  <th className="px-4 py-3 font-semibold">Бараа</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Байрлал</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Гар дээрх
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Min
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Үнэ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = getStatus(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="border-b border-slate-50 cursor-pointer transition-colors last:border-0 hover:bg-blue-50"
                    >
                      <td className="px-4 py-3">
                        {status === "out" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                            <XCircle className="h-3 w-3" />
                            Дууссан
                          </span>
                        ) : status === "low" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Дутагдал
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            Хэвийн
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.product.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {item.product.sku || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.location ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                            {item.location}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-base font-bold ${
                            status === "out"
                              ? "text-red-600"
                              : status === "low"
                                ? "text-amber-600"
                                : "text-slate-900"
                          }`}
                        >
                          {item.quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.minQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(item.product.price).toLocaleString()}₮
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal content */}
            <div className="space-y-6 p-8">
              {/* Header */}
              <div className="space-y-2 border-b border-slate-100 pb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedItem.product.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                      getStatusLabel(selectedItem).color
                    }`}
                  >
                    {getStatusLabel(selectedItem).label}
                  </span>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                    </p>
                    <p className="mt-1 font-mono text-base text-slate-900">
                      {selectedItem.product.sku || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Barcode
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-mono text-sm text-slate-700">
                      <Barcode className="h-4 w-4 text-slate-400" />
                      {selectedItem.product.barcode || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Үнэ
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {Number(selectedItem.product.price).toLocaleString()}₮
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Байрлал
                    </p>
                    <p className="mt-1 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedItem.location || "Тодорхойгүй"}
                    </p>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Гар дээрх тоо
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-900">
                      {selectedItem.quantity.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Хамгийн бага тоо
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {selectedItem.minQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Хамгийн их тоо
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {selectedItem.maxQuantity || "Хязгаарлалт байхгүй"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Batch Number
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-700">
                      {selectedItem.batchNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Хүчинтэй болох хугацаа
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {selectedItem.expiryDate
                        ? new Date(selectedItem.expiryDate).toLocaleDateString(
                            "mn-MN",
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-slate-100 pt-6">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
