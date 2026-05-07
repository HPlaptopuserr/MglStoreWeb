"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  XCircle,
  X,
  Calendar,
  Barcode,
  MapPin,
  Trash2,
  SlidersHorizontal,
  Pencil,
  Save,
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

type EditForm = {
  quantity: string;
  minQuantity: string;
  maxQuantity: string;
  location: string;
  batchNumber: string;
  expiryDate: string;
};

type WarehouseOption = { id: string; name: string };
type StockStatus = "all" | "healthy" | "low" | "out";

const STATUS_CONFIG = {
  healthy: { label: "Хэвийн",  dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  low:     { label: "Дутагдал", dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" },
  out:     { label: "Дууссан",  dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
} as const;

export default function InventoryPage() {
  const [warehouses, setWarehouses]           = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [inventory, setInventory]             = useState<InventoryItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [fetchError, setFetchError]           = useState(false);
  const [retryCount, setRetryCount]           = useState(0);
  const [search, setSearch]                   = useState("");
  const [statusFilter, setStatusFilter]       = useState<StockStatus>("all");
  const [selectedItem, setSelectedItem]       = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm]     = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [editing, setEditing]                 = useState(false);
  const [savingEdit, setSavingEdit]           = useState(false);
  const [editForm, setEditForm]               = useState<EditForm | null>(null);
  const [currentPage, setCurrentPage]         = useState(1);
  const [filterOpen, setFilterOpen]           = useState(false);
  const PAGE_SIZE = 20;

  // Load warehouses
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        const url = user.organizationId
          ? `${API}/warehouses/organization/${user.organizationId}`
          : `${API}/warehouses`;
        const res = await wmsFetch(url);
        if (res.ok) {
          const data = await res.json();
          const list: WarehouseOption[] = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setSelectedWarehouseId(list[0].id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Load inventory
  useEffect(() => {
    if (!selectedWarehouseId) { setLoading(false); return; }
    let cancelled = false;
    const load = async (attempt = 0) => {
      setLoading(true);
      setFetchError(false);
      try {
        let all: InventoryItem[] = [];
        let page = 1;
        let hasMore = true;
        let failed = false;
        while (hasMore && !cancelled) {
          const res = await wmsFetch(
            `${API}/warehouses/${selectedWarehouseId}/detail?invPage=${page}&invLimit=50`
          );
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            all = [...all, ...(data.inventories || [])];
            hasMore = data.pagination && data.pagination.page < data.pagination.totalPages;
            page++;
          } else { failed = true; break; }
        }
        if (cancelled) return;
        if (!failed) { setInventory(all); }
        else if (attempt < 2) { setTimeout(() => { if (!cancelled) load(attempt + 1); }, 1500); return; }
        else { setFetchError(true); }
      } catch {
        if (cancelled) return;
        if (attempt < 2) { setTimeout(() => { if (!cancelled) load(attempt + 1); }, 1500); return; }
        setFetchError(true);
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedWarehouseId, retryCount]);

  const openItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setDeleteConfirm(false);
    setEditing(false);
    setEditForm(null);
  };

  const closeItem = () => {
    setSelectedItem(null);
    setDeleteConfirm(false);
    setEditing(false);
    setEditForm(null);
  };

  const startEdit = () => {
    if (!selectedItem) return;
    setDeleteConfirm(false);
    setEditing(true);
    setEditForm({
      quantity: String(selectedItem.quantity),
      minQuantity: String(selectedItem.minQuantity),
      maxQuantity: selectedItem.maxQuantity == null ? "" : String(selectedItem.maxQuantity),
      location: selectedItem.location || "",
      batchNumber: selectedItem.batchNumber || "",
      expiryDate: selectedItem.expiryDate ? selectedItem.expiryDate.slice(0, 10) : "",
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || !editForm) return;

    const quantity = Number(editForm.quantity);
    const minQuantity = Number(editForm.minQuantity || 0);
    const maxQuantity = editForm.maxQuantity.trim() ? Number(editForm.maxQuantity) : null;

    if (!Number.isInteger(quantity) || quantity < 0) return alert("Нөөцийн тоо буруу байна");
    if (!Number.isInteger(minQuantity) || minQuantity < 0) return alert("Min тоо буруу байна");
    if (maxQuantity !== null && (!Number.isInteger(maxQuantity) || maxQuantity < 0)) return alert("Max тоо буруу байна");

    setSavingEdit(true);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/inventory/${selectedItem.product.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            quantity,
            minQuantity,
            maxQuantity,
            location: editForm.location.trim() || null,
            batchNumber: editForm.batchNumber.trim() || null,
            expiryDate: editForm.expiryDate || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Засахад алдаа гарлаа");
      }

      const updated = await res.json();
      setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedItem(updated);
      setEditing(false);
      setEditForm(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Засахад алдаа гарлаа");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setDeleting(true);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/inventory/${selectedItem.product.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setInventory((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setSelectedItem(null);
        setDeleteConfirm(false);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Устгахад алдаа гарлаа");
      }
    } catch { alert("Устгахад алдаа гарлаа"); }
    finally { setDeleting(false); }
  };

  const getStatus = (item: InventoryItem): "healthy" | "low" | "out" => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= item.minQuantity) return "low";
    return "healthy";
  };

  const counts = useMemo(() => ({
    total:   inventory.length,
    healthy: inventory.filter((i) => getStatus(i) === "healthy").length,
    low:     inventory.filter((i) => getStatus(i) === "low").length,
    out:     inventory.filter((i) => getStatus(i) === "out").length,
  }), [inventory]);

  const filtered = useMemo(() => inventory.filter((item) => {
    if (statusFilter !== "all" && getStatus(item) !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.product.name.toLowerCase().includes(q) ||
        (item.product.sku?.toLowerCase().includes(q) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  }), [inventory, search, statusFilter]);

  useMemo(() => { setCurrentPage(1); }, [search, statusFilter, selectedWarehouseId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const FILTER_TABS = [
    { key: "all",     label: "Бүгд",     count: counts.total },
    { key: "healthy", label: "Хэвийн",   count: counts.healthy },
    { key: "low",     label: "Дутагдал", count: counts.low },
    { key: "out",     label: "Дууссан",  count: counts.out },
  ] as const;

  // ── Body ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Warehouse selector */}
        {warehouses.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:w-auto"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Бараа, SKU, байрлал..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Filter button (mobile) — shows tab bar below */}
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors sm:hidden ${
            statusFilter !== "all"
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {statusFilter !== "all" ? STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG].label : "Шүүлт"}
          {statusFilter !== "all" && (
            <span className="ml-0.5 rounded-full bg-white/30 px-1.5 text-xs font-bold">
              {counts[statusFilter as keyof typeof counts]}
            </span>
          )}
        </button>

        {/* Filter tabs (desktop — always visible) */}
        <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:flex">
          {FILTER_TABS.map((btn) => (
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

      {/* Filter tabs (mobile — collapsible) */}
      {filterOpen && (
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:hidden">
          {FILTER_TABS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => { setStatusFilter(btn.key); setFilterOpen(false); }}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
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
      )}

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {(["healthy", "low", "out"] as const).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
            <span className="text-slate-500">
              {STATUS_CONFIG[s].label}{" "}
              <span className="font-semibold text-slate-800">{counts[s]}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400">Мэдээлэл татаж байна...</p>
        </div>
      ) : fetchError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
          <Package className="h-8 w-8 text-red-300" />
          <p className="text-sm font-medium text-slate-600">Сервертэй холбогдоход алдаа гарлаа</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Loader2 className="h-3.5 w-3.5" /> Дахин оролдох
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-400">
          <Package className="h-8 w-8" />
          <p className="text-sm">Бараа олдсонгүй</p>
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-semibold">Төлөв</th>
                    <th className="px-4 py-3 font-semibold">Бараа</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Байрлал</th>
                    <th className="px-4 py-3 text-right font-semibold">Гар дээрх</th>
                    <th className="px-4 py-3 text-right font-semibold">Min</th>
                    <th className="px-4 py-3 text-right font-semibold">Үнэ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item) => {
                    const status = getStatus(item);
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <tr
                        key={item.id}
                        onClick={() => openItem(item)}
                        className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-blue-50"
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${cfg.badge}`}>
                            {status === "out" && <XCircle className="h-3 w-3" />}
                            {status === "low" && <AlertTriangle className="h-3 w-3" />}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.product.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.product.sku || "—"}</td>
                        <td className="px-4 py-3">
                          {item.location
                            ? <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{item.location}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-base font-bold ${
                            status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-slate-900"
                          }`}>
                            {item.quantity.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{item.minQuantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {Number(item.product.price).toLocaleString()}₮
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setCurrentPage}
            />
          </div>

          {/* ── Mobile card list ──────────────────────────────────────── */}
          <div className="space-y-2 md:hidden">
            {paginated.map((item) => {
              const status = getStatus(item);
              const cfg = STATUS_CONFIG[status];
              return (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all active:scale-[0.99] active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{item.product.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {item.product.sku && (
                          <span className="font-mono text-xs text-slate-400">{item.product.sku}</span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${cfg.badge}`}>
                        {status === "out" && <XCircle className="h-3 w-3" />}
                        {status === "low" && <AlertTriangle className="h-3 w-3" />}
                        {cfg.label}
                      </span>
                      <span className={`text-xl font-black ${
                        status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-slate-900"
                      }`}>
                        {item.quantity.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <span>Min: <span className="font-semibold text-slate-700">{item.minQuantity}</span></span>
                    <span className="font-semibold text-slate-700">{Number(item.product.price).toLocaleString()}₮</span>
                  </div>
                </button>
              );
            })}

            {/* Mobile pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* ── Detail modal (desktop centered / mobile bottom sheet) ─────── */}
      {selectedItem && (() => {
        const status = getStatus(selectedItem);
        const cfg = STATUS_CONFIG[status];
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
            {/* Backdrop tap to close */}
            <div className="absolute inset-0" onClick={closeItem} />

            <div className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl">
              {/* Handle (mobile only) */}
              <div className="sticky top-0 z-10 flex justify-center bg-white pb-2 pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>

              {/* Close (desktop) */}
              <button
                onClick={closeItem}
                className="absolute right-4 top-4 hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:flex"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-5 sm:p-7">
                {/* Header */}
                <div className="mb-5 border-b border-slate-100 pb-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.badge}`}>
                    {status === "out" && <XCircle className="h-3.5 w-3.5" />}
                    {status === "low" && <AlertTriangle className="h-3.5 w-3.5" />}
                    {cfg.label}
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedItem.product.name}</h2>
                </div>

                {editing && editForm ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Гар дээрх тоо">
                        <input type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm((f) => f && { ...f, quantity: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Min тоо">
                        <input type="number" min="0" value={editForm.minQuantity} onChange={(e) => setEditForm((f) => f && { ...f, minQuantity: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Max тоо">
                        <input type="number" min="0" value={editForm.maxQuantity} onChange={(e) => setEditForm((f) => f && { ...f, maxQuantity: e.target.value })} placeholder="Хязгааргүй" className={inputClass} />
                      </Field>
                      <Field label="Байрлал">
                        <input value={editForm.location} onChange={(e) => setEditForm((f) => f && { ...f, location: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Batch №">
                        <input value={editForm.batchNumber} onChange={(e) => setEditForm((f) => f && { ...f, batchNumber: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="Хүчинтэй хугацаа">
                        <input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm((f) => f && { ...f, expiryDate: e.target.value })} className={inputClass} />
                      </Field>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={cancelEdit} disabled={savingEdit} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        Болих
                      </button>
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Хадгалах
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Quantity highlight */}
                <div className="mb-5 rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Гар дээрх тоо</p>
                  <p className={`mt-1 text-5xl font-black ${
                    status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-blue-900"
                  }`}>
                    {selectedItem.quantity.toLocaleString()}
                  </p>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "SKU",           value: selectedItem.product.sku || "—",   mono: true },
                    { label: "Үнэ",           value: `${Number(selectedItem.product.price).toLocaleString()}₮` },
                    { label: "Min тоо",       value: selectedItem.minQuantity },
                    { label: "Max тоо",       value: selectedItem.maxQuantity ?? "Хязгаарлалтгүй" },
                    { label: "Байрлал",       value: selectedItem.location || "—",      mono: true },
                    { label: "Batch №",       value: selectedItem.batchNumber || "—",   mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className={`mt-1 text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
                        {String(value)}
                      </p>
                    </div>
                  ))}

                  {selectedItem.expiryDate && (
                    <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Хүчинтэй хугацаа
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(selectedItem.expiryDate).toLocaleDateString("mn-MN")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!deleteConfirm ? (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={closeItem}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    >
                      Хаах
                    </button>
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-2 rounded-xl bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 active:bg-blue-200"
                    >
                      <Pencil className="h-4 w-4" /> Засах
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 active:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" /> Устгах
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-700">
                      Агуулахаас бүрмөсөн хасагдана. Итгэлтэй байна уу?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        disabled={deleting}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Болих
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                        Устгах
                      </button>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Shared pagination component ─────────────────────────────────────────────
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">
          {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)}
        </span>{" "}
        / {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`e${idx}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
                currentPage === p
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
