"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Package,
  Tag,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  BarChart2,
  Layers,
  FileSpreadsheet,
  Crown,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import {
  isFeatureEnabled,
  PREORDER_PRODUCTS_FEATURE_KEY,
} from "@/lib/vendor-features";
import { 
  ExcelImportModal, 
  ProductFormModal,
  Product,
  BusinessCategory,
  FormState,
  PlanStatus
} from "@/features/products";

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  costPrice: "",
  stock: "0",
  supplyType: "IN_STOCK",
  preorderLeadTimeDays: "14",
  preorderNote: "",
  businessCategoryId: "",
  images: [],
};

const PREORDER_FORM: FormState = {
  ...EMPTY_FORM,
  stock: "0",
  supplyType: "CHINA_PREORDER",
  preorderLeadTimeDays: "14",
  preorderNote: "",
};

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
  const [typeFilter, setTypeFilter] = useState<"all" | "stock" | "preorder">("all");
  const [showPreorderProducts, setShowPreorderProducts] = useState(false);
  const [preorderFeatureLoaded, setPreorderFeatureLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);

  const isPlanActive = planStatus?.isActive ?? true;
  const daysLeft = planStatus?.planExpiresAt
    ? Math.ceil((new Date(planStatus.planExpiresAt).getTime() - Date.now()) / 86_400_000)
    : null;
  const productLimit = planStatus?.currentPlan?.maxProducts ?? -1;
  const productLimitReached = productLimit !== -1 && products.length >= productLimit;
  const canAddProduct = isPlanActive && !productLimitReached;

  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      if (user.organizationId) return user.organizationId as string;
      const token = localStorage.getItem("vendor_token");
      const payload = token ? JSON.parse(atob(token.split(".")[1] || "")) : null;
      return payload?.organizationId as string | undefined;
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
      setProducts(Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : []);
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
    const orgId = getOrgId();
    if (orgId) {
      authFetch(`${API}/site-settings`)
        .then(async (r) => {
          const settings = r.ok
            ? ((await r.json()) as Record<string, unknown>)
            : {};
          setShowPreorderProducts(
            isFeatureEnabled(settings, PREORDER_PRODUCTS_FEATURE_KEY, orgId),
          );
        })
        .catch(() => setShowPreorderProducts(false))
        .finally(() => setPreorderFeatureLoaded(true));
    } else {
      setPreorderFeatureLoaded(true);
    }
    const statusUrl = orgId
      ? `${API}/vendor/upgrade/status?organizationId=${encodeURIComponent(orgId)}`
      : `${API}/vendor/upgrade/status`;
    authFetch(statusUrl)
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
      .catch(() => {});
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    if (preorderFeatureLoaded && !showPreorderProducts && typeFilter === "preorder") {
      setTypeFilter("all");
    }
  }, [preorderFeatureLoaded, showPreorderProducts, typeFilter]);

  useEffect(() => {
    const normalizeType = (value: unknown): "all" | "stock" | "preorder" =>
      value === "preorder" ? "preorder" : value === "stock" ? "stock" : "all";

    if (typeof window !== "undefined") {
      const initialType = new URLSearchParams(window.location.search).get("type");
      setTypeFilter(normalizeType(initialType));
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string | null }>).detail;
      setTypeFilter(normalizeType(detail?.type));
    };

    window.addEventListener("vendor-product-type-change", handler);
    return () => window.removeEventListener("vendor-product-type-change", handler);
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openAddPreorder = () => {
    setForm(PREORDER_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      description: p.description || "",
      price: String(p.price),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      stock: String(p.stock),
      supplyType: p.supplyType || "IN_STOCK",
      preorderLeadTimeDays: p.preorderLeadTimeDays != null ? String(p.preorderLeadTimeDays) : "14",
      preorderNote: p.preorderNote || "",
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
    
    let costPrice: number | null = null;
    if (form.costPrice.trim() !== "") {
      costPrice = parseFloat(form.costPrice);
      if (isNaN(costPrice) || costPrice < 0) return showToast("error", "Авсан үнэ буруу байна");
    }

    const stockNum = form.supplyType === "CHINA_PREORDER" ? 0 : parseInt(form.stock) || 0;
    if (stockNum < 0 || stockNum > 2_147_483_647) return showToast("error", "Нөөц 0-2,147,483,647 хооронд байх ёстой");

    const leadTimeDays = form.preorderLeadTimeDays.trim() ? parseInt(form.preorderLeadTimeDays, 10) : null;
    if (leadTimeDays !== null && (isNaN(leadTimeDays) || leadTimeDays < 0 || leadTimeDays > 365)) {
      return showToast("error", "Ирэх хоног 0-365 хооронд байх ёстой");
    }

    setSaving(true);
    try {
      const payload = {
        organizationId: orgId,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        price,
        costPrice,
        stock: stockNum,
        supplyType: form.supplyType,
        preorderLeadTimeDays: form.supplyType === "CHINA_PREORDER" ? leadTimeDays : null,
        preorderNote: form.supplyType === "CHINA_PREORDER" ? form.preorderNote.trim() || null : null,
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

      showToast("success", editingId ? "Бараа шинэчлэгдлээ" : "Бараа амжилттай нэмэгдлээ");
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

  const isPreorderView =
    preorderFeatureLoaded && showPreorderProducts && typeFilter === "preorder";
  const visibleProducts = products.filter((p) =>
    isPreorderView
      ? p.supplyType === "CHINA_PREORDER"
      : p.supplyType !== "CHINA_PREORDER",
  );

  const filtered = visibleProducts.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(query) ||
      (p.sku || "").toLowerCase().includes(query) ||
      (p.barcode || "").toLowerCase().includes(query);

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
              ? "bg-white border-emerald-200 text-emerald-700"
              : "bg-white border-red-200 text-red-600"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <AlertCircle size={18} className="text-red-500" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Plan Status Banners */}
      {planStatus && (
        <>
          {!isPlanActive && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Lock size={18} className="shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">Таны план дууссан байна</p>
                <p className="text-xs text-red-500">Бараа нэмэх, засах боломжгүй. Дахин идэвхжүүлэхийн тулд сунгана уу.</p>
              </div>
              <a href="/upgrade" className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors shrink-0">
                <Crown size={14} /> Сунгах
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
              <a href="/upgrade" className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shrink-0">
                <Crown size={14} /> Сунгах
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
              <a href="/upgrade" className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors shrink-0">
                <Crown size={14} /> Сунгах
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
                planStatus.currentPlan.isTrial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {planStatus.currentPlan.name}
                {productLimit !== -1 && ` · ${products.length}/${productLimit}`}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-500">Таны бараа бүтээгдэхүүний каталог</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
              placeholder="Нэр, SKU хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!isPreorderView && (
            <button
              onClick={() => canAddProduct && setImportOpen(true)}
              disabled={!canAddProduct}
              title={!isPlanActive ? "Идэвхтэй план шаардлагатай" : productLimitReached ? `Дээд хязгаар: ${productLimit} бараа` : ""}
              className={`flex items-center gap-2 h-11 px-5 rounded-xl text-white text-sm font-bold shadow-lg transition-colors whitespace-nowrap ${
                canAddProduct
                  ? "bg-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              {canAddProduct ? <FileSpreadsheet size={16} /> : <Lock size={16} />}
              Excel импорт
            </button>
          )}
          {isPreorderView && (
            <button
              onClick={() => canAddProduct && openAddPreorder()}
              disabled={!canAddProduct}
              title={!isPlanActive ? "Идэвхтэй план шаардлагатай" : productLimitReached ? `Дээд хязгаар: ${productLimit} бараа` : ""}
              className={`flex items-center gap-2 h-11 px-5 rounded-xl text-white text-sm font-bold shadow-lg transition-colors whitespace-nowrap ${
                canAddProduct
                  ? "bg-blue-600 shadow-blue-500/25 hover:bg-blue-700"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              {canAddProduct ? <Package size={16} /> : <Lock size={16} />}
              Захиалгын бараа
            </button>
          )}
          {!isPreorderView && (
            <button
              onClick={() => canAddProduct && openAdd()}
              disabled={!canAddProduct}
              title={!isPlanActive ? "Идэвхтэй план шаардлагатай" : productLimitReached ? `Дээд хязгаар: ${productLimit} бараа` : ""}
              className={`flex items-center gap-2 h-11 px-5 rounded-xl text-white text-sm font-bold shadow-lg transition-colors whitespace-nowrap ${
                canAddProduct
                  ? "bg-indigo-600 shadow-indigo-500/25 hover:bg-indigo-700"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              {canAddProduct ? <Plus size={16} /> : <Lock size={16} />}
              Шинэ бараа
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Нийт бараа", value: visibleProducts.length, icon: Package, color: "bg-indigo-50 text-indigo-600" },
          { label: "Идэвхтэй", value: visibleProducts.filter((p) => p.isActive).length, icon: ToggleRight, color: "bg-emerald-50 text-emerald-600" },
          { label: "Нийт нөөц", value: visibleProducts.reduce((s, p) => s + p.stock, 0), icon: BarChart2, color: "bg-amber-50 text-amber-600" },
          { label: "Ангилалтай", value: visibleProducts.filter((p) => p.businessCategoryId).length, icon: Layers, color: "bg-blue-50 text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{value}</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
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
        <ProductFormModal
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          categories={categories}
          products={products}
          onSwitchToEdit={openEdit}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}

      {/* Product Detail Drawer */}
      {selectedProduct && !formOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
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
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-slate-50 flex items-center justify-center border-b border-slate-100">
                  <Package size={48} className="text-slate-300" />
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full flex items-center justify-center shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h2>
                {selectedProduct.sku && (
                  <p className="text-sm font-mono text-slate-500 mt-1">SKU: {selectedProduct.sku}</p>
                )}
                {selectedProduct.barcode && (
                  <p className="text-xs font-mono text-slate-400 mt-0.5">Barcode: {selectedProduct.barcode}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedProduct.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {selectedProduct.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                </span>
                {selectedProduct.supplyType === "CHINA_PREORDER" && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    Хятадаас захиалгаар
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Зарагдах үнэ</div>
                <span className="text-3xl font-black text-indigo-600">
                  ₮{Number(selectedProduct.price).toLocaleString()}
                </span>
              </div>
              
              {selectedProduct.costPrice != null && (
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Авсан үнэ (Өртөг)</div>
                  <span className="text-xl font-bold text-slate-600">
                    ₮{Number(selectedProduct.costPrice).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedProduct.businessCategory && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Tag size={16} className="text-indigo-400" />
                  <span className="font-semibold text-slate-700">{selectedProduct.businessCategory.name}</span>
                </div>
              )}

              {selectedProduct.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тайлбар</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {selectedProduct.supplyType === "CHINA_PREORDER" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-bold">Захиалгаар ирэх бараа</p>
                  <p className="mt-1">Ирэх хугацаа: {selectedProduct.preorderLeadTimeDays ?? 14} хоног</p>
                  {selectedProduct.preorderNote && (
                    <p className="mt-1 text-blue-700">{selectedProduct.preorderNote}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <BarChart2 size={18} className="text-indigo-500" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Үлдэгдэл нөөц</div>
                  <div className="text-sm font-black text-slate-900">{selectedProduct.stock} ширхэг</div>
                </div>
              </div>

              {selectedProduct.images.length > 1 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Бусад зурагнууд</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProduct.images.slice(1).map((img) => (
                      <img key={img.id} src={img.url} alt="" className="w-full aspect-square object-cover rounded-xl border border-slate-100 shadow-sm" />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-6 border-t border-slate-100">
                <button
                  onClick={() => openEdit(selectedProduct)}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
                >
                  <Pencil size={16} />
                  Мэдээлэл засах
                </button>
                <button
                  onClick={() => handleToggleActive(selectedProduct)}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {selectedProduct.isActive ? <ToggleLeft size={18} className="text-slate-400" /> : <ToggleRight size={18} className="text-emerald-500" />}
                  {selectedProduct.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                </button>
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  disabled={deletingId === selectedProduct.id}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition-colors mt-2"
                >
                  {deletingId === selectedProduct.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Барааг устгах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              {isPreorderView ? "Захиалгын бараа" : "Миний бараа"}
            </h2>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
              {filtered.length} олдлоо
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { key: "all", label: "Бүгд", count: visibleProducts.length },
                {
                  key: "active",
                  label: "Идэвхтэй",
                  count: visibleProducts.filter((p) => p.isActive).length,
                },
                {
                  key: "inactive",
                  label: "Идэвхгүй",
                  count: visibleProducts.filter((p) => !p.isActive).length,
                },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setStatusFilter(btn.key as "all" | "active" | "inactive")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${statusFilter === btn.key
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {btn.label}
                  <span className={`ml-2 text-xs ${statusFilter === btn.key ? "text-indigo-200" : "opacity-60"}`}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32 bg-white rounded-3xl border border-slate-200">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-slate-500">Ачаалж байна...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-32 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
              <Package size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchQuery
                ? "Хайлтад тохирох бараа олдсонгүй"
                : isPreorderView
                  ? "Та хараахан захиалгын бараа нэмээгүй байна"
                  : "Та хараахан бараа нэмээгүй байна"}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
              {searchQuery 
                ? "Өөр түлхүүр үгээр хайгаад үзнэ үү эсвэл шүүлтүүрээ шалгана уу." 
                : isPreorderView
                  ? "Захиалгаар ирэх бараагаа тусад нь бүртгэж web дээр захиалгаар харуулна."
                  : "Эхний бараагаа бүртгэж борлуулалтаа эхлүүлээрэй. Excel файл ашиглан олноор нь оруулах боломжтой."}
            </p>
            {!searchQuery && (
              <button
                onClick={isPreorderView ? openAddPreorder : openAdd}
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
              >
                <Plus size={18} />
                {isPreorderView ? "Захиалгын бараа бүртгэх" : "Бараа бүртгэх"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Бараа</th>
                    <th className="px-6 py-4">SKU / Barcode</th>
                    <th className="px-6 py-4">Ангилал</th>
                    <th className="px-6 py-4 text-right">Үнэ</th>
                    <th className="px-6 py-4 text-right">Авсан үнэ</th>
                    <th className="px-6 py-4 text-right">Нөөц</th>
                    <th className="px-6 py-4">Төлөв</th>
                    <th className="px-6 py-4 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer transition-colors hover:bg-indigo-50/40 group"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                            {product.images.length > 0 ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <Package size={20} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                            {product.description && (
                              <p className="truncate text-xs font-medium text-slate-400 mt-0.5">{product.description}</p>
                            )}
                            {product.supplyType === "CHINA_PREORDER" && (
                              <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                Хятадаас захиалгаар
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {product.sku ? (
                             <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md w-fit" title="SKU">SKU: {product.sku}</span>
                          ) : null}
                          {product.barcode ? (
                             <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md w-fit" title="Barcode">BC: {product.barcode}</span>
                          ) : null}
                          {!product.sku && !product.barcode && (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {product.businessCategory ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Tag size={14} className="text-indigo-400" />
                            {product.businessCategory.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Ангилалгүй</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-900">
                          ₮{Number(product.price).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {product.costPrice != null ? (
                          <span className="font-medium text-slate-600">
                            ₮{Number(product.costPrice).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${product.stock > 10 ? 'text-slate-700' : product.stock > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${product.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                              : "bg-slate-100 text-slate-500 ring-1 ring-slate-400/20"
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {product.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(product);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Засах"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(product);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title={product.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                          >
                            {product.isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            disabled={deletingId === product.id}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Устгах"
                          >
                            {deletingId === product.id ? (
                              <Loader2 size={16} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={16} />
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
