"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  X,
  ImageIcon,
  Package,
  Tag,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Banknote,
  BarChart2,
  Layers,
  FileSpreadsheet,
  Crown,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import { ExcelImportModal } from "@/features/products";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ProductImage {
  id: string;
  url: string;
}

interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  children?: BusinessCategory[];
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  images: ProductImage[];
  businessCategoryId: string | null;
  businessCategory: { id: string; name: string } | null;
  createdAt: string;
}

type FormState = {
  name: string;
  sku: string;
  description: string;
  price: string;
  stock: string;
  businessCategoryId: string;
  images: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  description: "",
  price: "",
  stock: "0",
  businessCategoryId: "",
  images: [],
};

const MAX_IMAGES = 5;

/* ─── Category Selector ──────────────────────────────────────────────── */
function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: BusinessCategory[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const findLabel = (cats: BusinessCategory[], id: string): string => {
    for (const c of cats) {
      if (c.id === id) return c.name;
      if (c.children) {
        const found = findLabel(c.children, id);
        if (found) return found;
      }
    }
    return "";
  };

  const selectedLabel = value ? findLabel(categories, value) : "";

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (cat: BusinessCategory, depth = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expanded.has(cat.id);
    const isSelected = value === cat.id;

    return (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren) toggleExpand(cat.id);
            else {
              onChange(cat.id);
              setOpen(false);
            }
          }}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left hover:bg-amber-50 ${isSelected ? "bg-amber-50 font-semibold text-amber-700" : "text-slate-700"}`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="flex-1">{cat.name}</span>
          {isSelected && <CheckCircle2 size={14} className="text-amber-600 shrink-0" />}
        </button>
        {hasChildren && isExpanded && (
          <div>{cat.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 h-11 px-4 rounded-xl border text-sm transition-all outline-none ${open
            ? "border-amber-500 ring-2 ring-amber-100 bg-white"
            : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
          }`}
      >
        <span className={selectedLabel ? "text-slate-900 font-medium" : "text-slate-400"}>
          {selectedLabel || "Ангилал сонгох..."}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100"
          >
            <X size={14} />
            Ангилалгүй
          </button>
          {categories.map((cat) => renderNode(cat))}
        </div>
      )}
    </div>
  );
}

/* ─── Image Upload Grid ──────────────────────────────────────────────── */
function ImageUploadGrid({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await authFetch(`${API}/products/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url as string;
    } catch {
      return null;
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";

    setUploading(true);
    const current = [...images];
    for (const file of files) {
      if (current.length >= MAX_IMAGES) break;
      const url = await uploadToServer(file);
      if (url) current.push(url);
    }
    onChange(current.slice(0, MAX_IMAGES));
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const slots = Array.from({ length: MAX_IMAGES });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Зурагнууд ({images.length}/{MAX_IMAGES})
        </label>
        {images.length > 0 && (
          <span className="text-[10px] text-slate-400">Үндсэн зураг: эхний зураг</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {slots.map((_, idx) => {
          const img = images[idx];
          const isFirst = idx === 0;

          if (img) {
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => setDragging(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging !== null && dragging !== idx) {
                    moveImage(dragging, idx);
                  }
                  setDragging(null);
                }}
                className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${isFirst ? "border-amber-400" : "border-slate-200"
                  } ${dragging === idx ? "opacity-50 scale-95" : ""}`}
              >
                <img
                  src={img}
                  alt={`Зураг ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {isFirst && (
                  <div className="absolute top-1 left-1 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    Үндсэн
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={11} />
                </button>
              </div>
            );
          }

          const canAdd = idx === images.length && !uploading;
          const isUploadingSlot = idx === images.length && uploading;
          return (
            <label
              key={idx}
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${canAdd
                  ? "border-slate-300 hover:border-amber-400 hover:bg-amber-50 cursor-pointer"
                  : isUploadingSlot
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-100 bg-slate-50/50 cursor-not-allowed"
                }`}
            >
              {isUploadingSlot ? (
                <>
                  <Loader2 size={18} className="text-amber-500 animate-spin mb-1" />
                  <span className="text-[10px] font-bold text-amber-500">Хуулж байна...</span>
                </>
              ) : canAdd ? (
                <>
                  <ImageIcon size={18} className="text-slate-300 mb-1" />
                  <span className="text-[10px] font-bold text-slate-400">Нэмэх</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </>
              ) : (
                <span className="text-[10px] text-slate-200">{idx + 1}</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Зурагнуудыг чирэх замаар дахин эрэмбэлж болно. Эхний зураг үндсэн зураг болно.
      </p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // ─── Plan status ───────────────────────────────────────────────────────
  const [planStatus, setPlanStatus] = useState<{
    isActive: boolean;
    planType: string | null;
    planExpiresAt: string | null;
    trialUsed: boolean;
    currentPlan: { maxProducts: number; name: string; isTrial: boolean } | null;
  } | null>(null);

  const isPlanActive = planStatus?.isActive ?? true; // optimistic
  const daysLeft = planStatus?.planExpiresAt
    ? Math.ceil((new Date(planStatus.planExpiresAt).getTime() - Date.now()) / 86_400_000)
    : null;
  const productLimit = planStatus?.currentPlan?.maxProducts ?? -1;
  const productLimitReached = productLimit !== -1 && products.length >= productLimit;
  const canAddProduct = isPlanActive && !productLimitReached;

  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      return user.organizationId as string | undefined;
    } catch {
      return undefined;
    }
  };

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProducts = useCallback(async () => {
    const orgId = getOrgId();
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API}/products?organizationId=${orgId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      showToast("error", "Бараа ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/business-categories/tree`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      console.error("categories fetch failed");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Fetch plan status
    authFetch(`${API}/vendor/upgrade/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setPlanStatus({
            isActive: data.isActive,
            planType: data.planType,
            planExpiresAt: data.planExpiresAt,
            trialUsed: data.trialUsed,
            currentPlan: data.currentPlan,
          });
        }
      })
      .catch(() => {/* ignore */});
  }, [fetchProducts, fetchCategories]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      price: String(p.price),
      stock: String(p.stock),
      businessCategoryId: p.businessCategoryId || "",
      images: p.images.map((img) => img.url),
    });
    setEditingId(p.id);
    setFormOpen(true);
    setSelectedProduct(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = getOrgId();
    if (!orgId) return showToast("error", "Нэвтрэх мэдээлэл олдсонгүй");
    if (!form.name.trim()) return showToast("error", "Барааны нэр оруулна уу");
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) return showToast("error", "Үнэ буруу байна");
    const stockNum = parseInt(form.stock) || 0;
    if (stockNum < 0 || stockNum > 2_147_483_647) return showToast("error", "Нөөц 0-2,147,483,647 хооронд байх ёстой");

    setSaving(true);
    try {
      const payload = {
        organizationId: orgId,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        price,
        stock: stockNum,
        businessCategoryId: form.businessCategoryId || null,
        images: form.images,
      };

      const url = editingId ? `${API}/products/${editingId}` : `${API}/products`;
      const method = editingId ? "PATCH" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Алдаа гарлаа");
      }

      showToast("success", editingId ? "Бараа шинэчлэгдлээ" : "Бараа нэмэгдлээ");
      closeForm();
      fetchProducts();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ барааг устгахдаа итгэлтэй байна уу?")) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`${API}/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("success", "Бараа устгагдлаа");
      setSelectedProduct(null);
      fetchProducts();
    } catch {
      showToast("error", "Устгахад алдаа гарлаа");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      const res = await authFetch(`${API}/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error();
      fetchProducts();
      if (selectedProduct?.id === p.id) {
        setSelectedProduct((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch {
      showToast("error", "Алдаа гарлаа");
    }
  };

  const filtered = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(query) ||
      (p.sku || "").toLowerCase().includes(query);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.isActive) ||
      (statusFilter === "inactive" && !p.isActive);

    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl shadow-black/10 border transition-all animate-in slide-in-from-top-2 ${toast.type === "success"
              ? "bg-white border-amber-200 text-amber-700"
              : "bg-white border-red-200 text-red-600"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-amber-500" />
          ) : (
            <AlertCircle size={18} className="text-red-500" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Plan expired / trial warning banner */}
      {planStatus && (
        <>
          {!isPlanActive && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Lock size={18} className="shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">Таны план дууссан байна</p>
                <p className="text-xs text-red-500">Бараа нэмэх, засах боломжгүй. Дахин идэвхжүүлэхийн тулд сунгана уу.</p>
              </div>
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors shrink-0"
              >
                <Crown size={14} />
                Сунгах
              </a>
            </div>
          )}
          {isPlanActive && planStatus.currentPlan?.isTrial && daysLeft !== null && daysLeft <= 7 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={18} className="shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-700">Үнэгүй туршилт: {daysLeft} хоног үлдсэн</p>
                <p className="text-xs text-amber-500">Планаа сунгаж, бүх боломжуудыг ашиглаарай.</p>
              </div>
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shrink-0"
              >
                <Crown size={14} />
                Сунгах
              </a>
            </div>
          )}
          {isPlanActive && productLimitReached && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertCircle size={18} className="shrink-0 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-700">Барааны хязгаарт хүрлээ ({productLimit})</p>
                <p className="text-xs text-orange-500">Дахин бараа нэмэхийн тулд планаа сунгана уу.</p>
              </div>
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors shrink-0"
              >
                <Crown size={14} />
                Сунгах
              </a>
            </div>
          )}
        </>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Бараа</h1>
            {isPlanActive && planStatus?.currentPlan && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                planStatus.currentPlan.isTrial
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {planStatus.currentPlan.name}
                {productLimit !== -1 && ` · ${products.length}/${productLimit}`}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-500">Таны бараа бүтээгдэхүүний каталог</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              placeholder="Нэр, SKU хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => canAddProduct && setImportOpen(true)}
            disabled={!canAddProduct}
            title={!isPlanActive ? "Идэвхтэй план шаардлагатай" : productLimitReached ? `Дээд хязгаар: ${productLimit} бараа` : ""}
            className={`flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-bold shadow-lg transition-colors whitespace-nowrap ${
              canAddProduct
                ? "bg-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700"
                : "bg-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            {canAddProduct ? <FileSpreadsheet size={16} /> : <Lock size={16} />}
            Excel импорт
          </button>
          <button
            onClick={() => canAddProduct && openAdd()}
            disabled={!canAddProduct}
            title={!isPlanActive ? "Идэвхтэй план шаардлагатай" : productLimitReached ? `Дээд хязгаар: ${productLimit} бараа` : ""}
            className={`flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-bold shadow-lg transition-colors whitespace-nowrap ${
              canAddProduct
                ? "bg-amber-600 shadow-amber-500/25 hover:bg-amber-700"
                : "bg-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            {canAddProduct ? <Plus size={16} /> : <Lock size={16} />}
            Бараа нэмэх
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Нийт бараа", value: products.length, icon: Package, color: "bg-amber-50 text-amber-600" },
          { label: "Идэвхтэй", value: products.filter((p) => p.isActive).length, icon: ToggleRight, color: "bg-amber-50 text-amber-600" },
          { label: "Нийт нөөц", value: products.reduce((s, p) => s + p.stock, 0), icon: BarChart2, color: "bg-amber-50 text-amber-600" },
          { label: "Ангилалтай", value: products.filter((p) => p.businessCategoryId).length, icon: Layers, color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{value}</div>
              <div className="text-xs font-medium text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Excel Import Modal */}
      {importOpen && (
        <ExcelImportModal
          organizationId={getOrgId() || ""}
          onClose={() => setImportOpen(false)}
          onSuccess={fetchProducts}
        />
      )}

      {/* Add/Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingId ? "Бараа засах" : "Шинэ бараа нэмэх"}
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Мэдээллийг бүрэн оруулна уу</p>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Барааны нэр <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all"
                    placeholder="Жишээ: Самар гоймон"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">SKU / Код</label>
                  <input
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all"
                    placeholder="Жишээ: GM-001-BLK"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Үнэ (₮) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Banknote size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Нөөц (ширхэг)</label>
                  <div className="relative">
                    <BarChart2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      max="2147483647"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ангилал</label>
                <CategorySelector
                  categories={categories}
                  value={form.businessCategoryId}
                  onChange={(id) => setForm((f) => ({ ...f, businessCategoryId: id }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Тайлбар</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all resize-none"
                  placeholder="Барааны дэлгэрэнгүй тайлбар..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <ImageUploadGrid
                images={form.images}
                onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))}
              />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-10 px-5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-7 rounded-xl bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/25 hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editingId ? "Хадгалах" : "Нэмэх"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProduct && !formOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedProduct.images.length > 0 ? (
                <img
                  src={selectedProduct.images[0].url}
                  alt={selectedProduct.name}
                  className="w-full h-56 object-cover"
                />
              ) : (
                <div className="w-full h-56 bg-slate-100 flex items-center justify-center">
                  <Package size={40} className="text-slate-300" />
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedProduct.name}</h2>
                {selectedProduct.sku && (
                  <p className="text-xs font-mono text-slate-400 mt-0.5">SKU: {selectedProduct.sku}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-amber-600">
                  ₮{Number(selectedProduct.price).toLocaleString()}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedProduct.isActive ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {selectedProduct.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                </span>
              </div>

              {selectedProduct.businessCategory && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-600">{selectedProduct.businessCategory.name}</span>
                </div>
              )}

              {selectedProduct.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{selectedProduct.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <BarChart2 size={14} />
                Нөөц: <span className="font-bold text-slate-800">{selectedProduct.stock} ширхэг</span>
              </div>

              {selectedProduct.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedProduct.images.slice(1).map((img) => (
                    <img key={img.id} src={img.url} alt="" className="w-full aspect-square object-cover rounded-lg border border-slate-100" />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEdit(selectedProduct)}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-600 text-white text-sm font-bold"
                >
                  <Pencil size={14} />
                  Засах
                </button>
                <button
                  onClick={() => handleToggleActive(selectedProduct)}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  {selectedProduct.isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                  {selectedProduct.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                </button>
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  disabled={deletingId === selectedProduct.id}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === selectedProduct.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Устгах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Миний бараа</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {[
              { key: "all", label: "Бүгд", count: products.length },
              {
                key: "active",
                label: "Идэвхтэй",
                count: products.filter((p) => p.isActive).length,
              },
              {
                key: "inactive",
                label: "Идэвхгүй",
                count: products.filter((p) => !p.isActive).length,
              },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setStatusFilter(btn.key as "all" | "active" | "inactive")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === btn.key
                    ? "bg-amber-500 text-black"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {btn.label}
                <span className="ml-1 opacity-70">{btn.count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={32} className="animate-spin text-amber-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <Package size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {searchQuery ? "Хайлтад тохирох бараа олдсонгүй" : "Бараа байхгүй байна"}
            </h3>
            {!searchQuery && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-amber-600 text-white text-sm font-bold"
              >
                <Plus size={15} />
                Эхний бараагаа нэмэх
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Бараа</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Ангилал</th>
                    <th className="px-4 py-3 text-right font-semibold">Үнэ</th>
                    <th className="px-4 py-3 text-right font-semibold">Нөөц</th>
                    <th className="px-4 py-3 font-semibold">Төлөв</th>
                    <th className="px-4 py-3 text-right font-semibold">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-amber-50/40"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {product.images.length > 0 ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{product.name}</p>
                            {product.description && (
                              <p className="truncate text-xs text-slate-400">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {product.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.businessCategory?.name || "Ангилалгүй"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ₮{Number(product.price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {product.stock}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          {product.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(product);
                            }}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Засах"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(product);
                            }}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Төлөв өөрчлөх"
                          >
                            {product.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            disabled={deletingId === product.id}
                            className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label="Устгах"
                          >
                            {deletingId === product.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
