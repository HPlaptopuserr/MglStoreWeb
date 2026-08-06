"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  X,
  Calendar,
  Barcode,
  MapPin,
  Trash2,
  Edit3,
  Save,
  BarChart3,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import { WarehouseCategoryPicker } from "@/features/categories";
import {
  ProductImageEditor,
  WarehouseInventoryCatalog,
} from "@/features/inventory";

type InventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  note?: string | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string | null;
    price: string;
    costPrice: string | null;
    businessCategoryId: string | null;
    supplyType: string;
    preorderLeadTimeDays: number | null;
    preorderNote: string | null;
    isActive: boolean;
    images: { id: string; url: string }[];
  };
};

type WarehouseOption = {
  id: string;
  name: string;
};

type StockStatus = "all" | "healthy" | "low" | "out";

type InventorySummary = {
  total: number;
  healthy: number;
  low: number;
  out: number;
  totalStock: number;
  located: number;
};

type EditInventoryForm = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  unit: string;
  price: string;
  costPrice: string;
  businessCategoryId: string;
  supplyType: string;
  preorderLeadTimeDays: string;
  preorderNote: string;
  isActive: boolean;
  quantity: string;
  minQuantity: string;
  maxQuantity: string;
  location: string;
  batchNumber: string;
  expiryDate: string;
  note: string;
  images: string[];
};

const toDateInputValue = (value: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<EditInventoryForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<InventorySummary>({
    total: 0,
    healthy: 0,
    low: 0,
    out: 0,
    totalStock: 0,
    located: 0,
  });
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Load warehouses
  useEffect(() => {
    const load = async () => {
      try {
        const res = await wmsFetch(`${API}/warehouses`);
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

  // Load inventory when warehouse changes. A failed request is surfaced
  // immediately instead of keeping the screen in a long retry spinner.
  useEffect(() => {
    if (!selectedWarehouseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFetchError(false);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
          status: statusFilter,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const res = await wmsFetch(
          `${API}/warehouses/${selectedWarehouseId}/inventory?${params.toString()}`,
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setInventory(data.inventory || []);
          setTotalItems(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
          setSummary(
            data.summary || {
              total: 0,
              healthy: 0,
              low: 0,
              out: 0,
              totalStock: 0,
              located: 0,
            },
          );
        } else {
          setInventory([]);
          setFetchError(true);
        }
      } catch {
        if (cancelled) return;
        setInventory([]);
        setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedWarehouseId, currentPage, debouncedSearch, statusFilter, retryCount]);

  const handleDelete = async () => {
    if (!selectedItem) return;
    setDeleting(true);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/inventory/${selectedItem.product.id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setInventory((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setSelectedItem(null);
        setDeleteConfirm(false);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Устгахад алдаа гарлаа");
      }
    } catch {
      alert("Устгахад алдаа гарлаа");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditForm({
      name: item.product.name,
      description: item.product.description || "",
      sku: item.product.sku || "",
      barcode: item.product.barcode || "",
      unit: item.product.unit || "",
      price: String(Number(item.product.price)),
      costPrice:
        item.product.costPrice == null
          ? ""
          : String(Number(item.product.costPrice)),
      businessCategoryId: item.product.businessCategoryId || "",
      supplyType: item.product.supplyType || "IN_STOCK",
      preorderLeadTimeDays:
        item.product.preorderLeadTimeDays == null
          ? ""
          : String(item.product.preorderLeadTimeDays),
      preorderNote: item.product.preorderNote || "",
      isActive: item.product.isActive,
      quantity: String(item.quantity),
      minQuantity: String(item.minQuantity),
      maxQuantity: item.maxQuantity == null ? "" : String(item.maxQuantity),
      location: item.location || "",
      batchNumber: item.batchNumber || "",
      expiryDate: toDateInputValue(item.expiryDate),
      note: item.note || "",
      images: item.product.images.map((image) => image.url),
    });
    setImageError(null);
  };

  const handleImageUpload = async (files: FileList) => {
    if (!editForm) return;

    const remaining = 5 - editForm.images.length;
    const selectedFiles = Array.from(files).slice(0, remaining);
    if (selectedFiles.length === 0) return;

    setUploadingImages(true);
    setImageError(null);
    try {
      const results = await Promise.allSettled(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("image", file);
          const response = await wmsFetch(`${API}/products/upload-image`, {
            method: "POST",
            body: formData,
          });
          if (!response.ok) throw new Error("UPLOAD_FAILED");
          const data = (await response.json()) as { url?: string };
          if (!data.url) throw new Error("MISSING_URL");
          return data.url;
        }),
      );

      const uploaded = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setEditForm((current) =>
        current
          ? { ...current, images: [...current.images, ...uploaded].slice(0, 5) }
          : current,
      );
      if (uploaded.length !== selectedFiles.length) {
        setImageError("Зарим зураг хуулагдсангүй. Дахин оролдоно уу.");
      }
    } catch {
      setImageError("Зураг хуулахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setUploadingImages(false);
    }
  };

  const openDetail = (item: InventoryItem) => {
    setEditForm(null);
    setDeleteConfirm(false);
    setSelectedItem(item);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setEditForm(null);
    setImageError(null);
    setDeleteConfirm(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || !editForm) return;

    const quantity = Number(editForm.quantity);
    const minQuantity = Number(editForm.minQuantity);
    const maxQuantity =
      editForm.maxQuantity === "" ? null : Number(editForm.maxQuantity);
    const price = Number(editForm.price);
    const costPrice =
      editForm.costPrice === "" ? null : Number(editForm.costPrice);
    const preorderLeadTimeDays =
      editForm.preorderLeadTimeDays === ""
        ? null
        : Number(editForm.preorderLeadTimeDays);

    if (!editForm.name.trim()) {
      alert("Барааны нэр оруулна уу");
      return;
    }
    if (
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !Number.isFinite(minQuantity) ||
      minQuantity < 0 ||
      (maxQuantity !== null &&
        (!Number.isFinite(maxQuantity) || maxQuantity < 0)) ||
      !Number.isFinite(price) ||
      price < 0 ||
      (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) ||
      (preorderLeadTimeDays !== null &&
        (!Number.isInteger(preorderLeadTimeDays) ||
          preorderLeadTimeDays < 0 ||
          preorderLeadTimeDays > 365))
    ) {
      alert("Тоо хэмжээ болон үнэ зөв оруулна уу");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/inventory/${selectedItem.product.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editForm.name.trim(),
            description: editForm.description.trim() || null,
            sku: editForm.sku.trim() || null,
            barcode: editForm.barcode.trim() || null,
            unit: editForm.unit || null,
            price,
            costPrice,
            businessCategoryId: editForm.businessCategoryId || null,
            supplyType: editForm.supplyType,
            preorderLeadTimeDays,
            preorderNote: editForm.preorderNote.trim() || null,
            isActive: editForm.isActive,
            quantity,
            minQuantity,
            maxQuantity,
            location: editForm.location.trim() || null,
            batchNumber: editForm.batchNumber.trim() || null,
            expiryDate: editForm.expiryDate || null,
            note: editForm.note.trim() || null,
            images: editForm.images,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Бараа засахад алдаа гарлаа");
        return;
      }

      const updated = await res.json();
      const nextItem: InventoryItem = {
        ...selectedItem,
        ...updated,
        product: {
          ...selectedItem.product,
          ...updated.product,
          images: updated.product?.images || [],
        },
      };

      setInventory((prev) =>
        prev.map((item) => (item.id === selectedItem.id ? nextItem : item)),
      );
      setSelectedItem(nextItem);
      setImageError(null);
      setEditForm(null);
    } catch {
      alert("Бараа засахад алдаа гарлаа");
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatus = (item: InventoryItem): StockStatus => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= item.minQuantity) return "low";
    return "healthy";
  };

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, selectedWarehouseId]);

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
              { key: "all", label: "Бүгд", count: summary.total },
              { key: "healthy", label: "Хэвийн", count: summary.healthy },
              { key: "low", label: "Дутагдал", count: summary.low },
              { key: "out", label: "Дууссан", count: summary.out },
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

      {/* Vendor-style summary cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Нийт бараа",
            value: summary.total,
            icon: Package,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Хэвийн",
            value: summary.healthy,
            icon: ShieldCheck,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Нийт нөөц",
            value: summary.totalStock,
            icon: BarChart3,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Байрлалтай",
            value: summary.located,
            icon: Layers3,
            color: "bg-blue-50 text-blue-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md sm:px-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}
            >
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-tight text-slate-900 sm:text-xl">
                {value.toLocaleString()}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">
          Агуулахын бараа
        </h2>
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
          {totalItems} олдлоо
        </span>
      </div>

      {/* Vendor-style inventory catalog */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-400">Мэдээлэл татаж байна...</p>
        </div>
      ) : fetchError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          <Package className="h-8 w-8 text-red-300" />
          <p className="text-sm font-medium text-slate-600">
            Сервертэй холбогдоход алдаа гарлаа
          </p>
          <p className="text-xs text-slate-400">
            Интернэт холболт болон серверийн байдлыг шалгана уу
          </p>
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Дахин оролдох
          </button>
        </div>
      ) : inventory.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          <Package className="h-9 w-9" />
          <p className="text-sm font-semibold text-slate-600">Бараа олдсонгүй</p>
          <p className="text-xs">Хайлт эсвэл төлөвийн шүүлтүүрээ өөрчилнө үү.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <WarehouseInventoryCatalog
            items={inventory}
            onSelect={(itemId) => {
              const item = inventory.find((candidate) => candidate.id === itemId);
              if (item) openDetail(item);
            }}
            onEdit={(itemId) => {
              const item = inventory.find((candidate) => candidate.id === itemId);
              if (!item) return;
              setSelectedItem(item);
              openEdit(item);
            }}
          />

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row">
              <p className="text-xs text-slate-500">
                Нийт <span className="font-bold text-slate-700">{totalItems}</span>{" "}
                барааны{" "}
                <span className="font-bold text-slate-700">
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, totalItems)}
                </span>
                -г харуулж байна
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Өмнөх хуудас"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-16 px-2 text-center text-xs font-bold text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Дараагийн хуудас"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
            {/* Close button */}
            <button
              onClick={closeDetail}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal content */}
            {editForm ? (
              <div className="space-y-4 p-5 sm:p-6">
                <div className="space-y-2 border-b border-slate-100 pb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Бараа засах
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedItem.product.sku || "SKU байхгүй"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ProductImageEditor
                    images={editForm.images}
                    productName={editForm.name || selectedItem.product.name}
                    uploading={uploadingImages}
                    error={imageError}
                    onAdd={handleImageUpload}
                    onRemove={(index) =>
                      setEditForm({
                        ...editForm,
                        images: editForm.images.filter((_, i) => i !== index),
                      })
                    }
                  />

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Барааны нэр
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Өртөг үнэ
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.costPrice}
                      onChange={(e) =>
                        setEditForm({ ...editForm, costPrice: e.target.value })
                      }
                      placeholder="0"
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Нийлүүлэлтийн төрөл
                    </label>
                    <select
                      value={editForm.supplyType}
                      onChange={(e) =>
                        setEditForm({ ...editForm, supplyType: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="IN_STOCK">Бэлэн</option>
                      <option value="CHINA_PREORDER">Захиалгаар</option>
                    </select>
                  </div>

                  {editForm.supplyType === "CHINA_PREORDER" && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ирэх хоног
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={editForm.preorderLeadTimeDays}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              preorderLeadTimeDays: e.target.value,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Захиалгын тэмдэглэл
                        </label>
                        <input
                          value={editForm.preorderNote}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              preorderNote: e.target.value,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                    </label>
                    <input
                      value={editForm.sku}
                      onChange={(e) =>
                        setEditForm({ ...editForm, sku: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Barcode
                    </label>
                    <input
                      value={editForm.barcode}
                      onChange={(e) =>
                        setEditForm({ ...editForm, barcode: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Хэмжих нэгж
                    </label>
                    <select
                      value={editForm.unit}
                      onChange={(e) =>
                        setEditForm({ ...editForm, unit: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Сонгох</option>
                      <option value="ш">ш</option>
                      <option value="кг">кг</option>
                      <option value="гр">гр</option>
                      <option value="л">л</option>
                      <option value="мл">мл</option>
                      <option value="хайрцаг">хайрцаг</option>
                      <option value="багц">багц</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <WarehouseCategoryPicker
                      value={editForm.businessCategoryId}
                      onChange={(businessCategoryId) =>
                        setEditForm({ ...editForm, businessCategoryId })
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Тайлбар
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Үнэ
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Гар дээрх тоо
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.quantity}
                      onChange={(e) =>
                        setEditForm({ ...editForm, quantity: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Хамгийн бага
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.minQuantity}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          minQuantity: e.target.value,
                        })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Хамгийн их
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.maxQuantity}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          maxQuantity: e.target.value,
                        })
                      }
                      placeholder="Хязгаарлалтгүй"
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Байрлал
                    </label>
                    <input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      placeholder="A-1-3"
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Batch Number
                    </label>
                    <input
                      value={editForm.batchNumber}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          batchNumber: e.target.value,
                        })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Дуусах хугацаа
                    </label>
                    <input
                      type="date"
                      value={editForm.expiryDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, expiryDate: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Тэмдэглэл
                    </label>
                    <input
                      value={editForm.note}
                      onChange={(e) =>
                        setEditForm({ ...editForm, note: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isActive: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Идэвхтэй бараа
                  </label>
                </div>

                <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
                  <button
                    onClick={() => setEditForm(null)}
                    disabled={savingEdit || uploadingImages}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Болих
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || uploadingImages}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Хадгалах
                  </button>
                </div>
              </div>
            ) : (
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
                          ? new Date(
                              selectedItem.expiryDate,
                            ).toLocaleDateString("mn-MN")
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-slate-100 pt-6">
                  <button
                    onClick={closeDetail}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Хаах
                  </button>
                  <button
                    onClick={() => openEdit(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 font-medium text-blue-600 hover:bg-blue-100"
                  >
                    <Edit3 className="h-4 w-4" />
                    Засах
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Устгах
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Бараа устгах</h3>
                <p className="text-sm text-slate-500">
                  Агуулахаас бүрмөсөн хасагдана
                </p>
              </div>
            </div>
            <p className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {selectedItem.product.name}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Устгах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
