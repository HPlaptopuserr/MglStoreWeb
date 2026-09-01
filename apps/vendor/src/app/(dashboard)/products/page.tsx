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
  Printer,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { ProductLabelPrintDialog } from "@mgl/ui";
import {
  EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  isValidEbarimtClassificationCode,
  isValidEbarimtTaxProductCode,
  requiresEbarimtTaxProductCode,
} from "@mgl/types";
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
  PlanStatus,
  VendorProductCatalog,
} from "@/features/products";

type TaxCodeFilter = "all" | "with-code" | "without-code";

const hasCompleteEbarimtTaxSetup = (product: Product) =>
  isValidEbarimtClassificationCode(product.classificationCode) &&
  isValidEbarimtTaxProductCode(product.taxType, product.taxProductCode);

const EMPTY_FORM: FormState = {
  masterProductId: "",
  name: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  wholesalePrice: "",
  orderPrice: "",
  costPrice: "",
  taxType: "VAT_ABLE",
  cityTaxRate: "0",
  classificationCode: EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
  taxProductCode: "",
  stock: "0",
  expiryDate: "",
  supplyType: "IN_STOCK",
  preorderLeadTimeDays: "14",
  preorderCapacity: "50",
  preorderSupplierFrontImageUrl: "",
  preorderSupplierBackImageUrl: "",
  preorderNote: "",
  preorderPriceCurrency: "MNT",
  marketplacePriority: "0",
  businessCategoryId: "",
  images: [],
};

const PREORDER_FORM: FormState = {
  ...EMPTY_FORM,
  stock: "0",
  expiryDate: "",
  supplyType: "CHINA_PREORDER",
  preorderLeadTimeDays: "14",
  preorderCapacity: "50",
  preorderSupplierFrontImageUrl: "",
  preorderSupplierBackImageUrl: "",
  preorderNote: "",
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

function formatExpiryDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("mn-MN");
}

function getDaysUntilExpiry(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [taxCodeFilter, setTaxCodeFilter] = useState<TaxCodeFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "stock" | "preorder">(
    "all",
  );
  const [showPreorderProducts, setShowPreorderProducts] = useState(false);
  const [preorderFeatureLoaded, setPreorderFeatureLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [restartingPreorderId, setRestartingPreorderId] = useState<
    string | null
  >(null);

  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [sellerPaymentConfigured, setSellerPaymentConfigured] = useState<
    boolean | null
  >(null);

  const isPlanActive = planStatus?.isActive ?? true;
  const daysLeft = planStatus?.planExpiresAt
    ? Math.ceil(
        (new Date(planStatus.planExpiresAt).getTime() - Date.now()) /
          86_400_000,
      )
    : null;
  const productLimit = planStatus?.currentPlan?.maxProducts ?? -1;
  const productLimitReached =
    productLimit !== -1 && products.length >= productLimit;
  const canAddProduct = isPlanActive && !productLimitReached;

  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      if (user.organizationId) return user.organizationId as string;
      const token = localStorage.getItem("vendor_token");
      const payload = token
        ? JSON.parse(atob(token.split(".")[1] || ""))
        : null;
      return payload?.organizationId as string | undefined;
    } catch {
      return undefined;
    }
  };

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const restartPreorderCycle = async (product: Product) => {
    const confirmed = window.confirm(
      `“${product.name}” барааны захиалгыг 0/${product.preorderCapacity ?? 0}-оос дахин эхлүүлэх үү? Өмнөх захиалгууд устахгүй.`,
    );
    if (!confirmed) return;

    setRestartingPreorderId(product.id);
    try {
      const response = await authFetch(
        `${API}/products/${product.id}/preorder-cycle/restart`,
        { method: "POST" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        preorderCycleStartedAt?: string;
        preorderParticipantCount?: number;
        preorderRemaining?: number;
        preorderIsFull?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.message || "Захиалгыг дахин эхлүүлж чадсангүй");
      }

      const restartedProduct: Product = {
        ...product,
        preorderCycleStartedAt: data.preorderCycleStartedAt ?? null,
        preorderParticipantCount: data.preorderParticipantCount ?? 0,
        preorderRemaining:
          data.preorderRemaining ?? product.preorderCapacity ?? null,
        preorderIsFull: data.preorderIsFull ?? false,
      };
      setProducts((current) =>
        current.map((item) =>
          item.id === restartedProduct.id ? restartedProduct : item,
        ),
      );
      setSelectedProduct(restartedProduct);
      showToast("success", data.message || "Шинэ захиалгын мөчлөг эхэллээ");
    } catch (error: unknown) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Захиалгыг дахин эхлүүлэхэд алдаа гарлаа",
      );
    } finally {
      setRestartingPreorderId(null);
    }
  };

  const fetchProducts = useCallback(async () => {
    const orgId = getOrgId();
    if (!orgId) {
      setProducts([]);
      setLoading(false);
      showToast("error", "Байгууллагын мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: orgId,
        includeExpiredInventory: "1",
        includeInactive: "1",
        includePosReceiptLots: "1",
      });
      const res = await authFetch(`${API}/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let message = "Бараа ачаалахад алдаа гарлаа";
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              const responseError = parsed as {
                message?: unknown;
                error?: unknown;
              };
              if (typeof responseError.message === "string") {
                message = responseError.message;
              } else if (typeof responseError.error === "string") {
                message = responseError.error;
              }
            }
          } catch {
            message = raw.slice(0, 180) || message;
          }
        }
        throw new Error(`${message} (HTTP ${res.status})`);
      }
      const data = await res.json();
      setProducts(
        Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [],
      );
    } catch (error: unknown) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Бараа ачаалахад алдаа гарлаа",
      );
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

  const fetchSellerPaymentStatus = useCallback(async () => {
    const orgId = getOrgId();
    if (!orgId) {
      setSellerPaymentConfigured(false);
      return;
    }
    try {
      const params = new URLSearchParams({ organizationId: orgId });
      const response = await authFetch(
        `${API}/vendor/merchant/status?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        isConnected?: boolean;
      };
      setSellerPaymentConfigured(
        response.ok && data.success === true && data.isConnected === true,
      );
    } catch {
      setSellerPaymentConfigured(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSellerPaymentStatus();
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
  }, [fetchProducts, fetchCategories, fetchSellerPaymentStatus]);

  useEffect(() => {
    if (
      preorderFeatureLoaded &&
      !showPreorderProducts &&
      typeFilter === "preorder"
    ) {
      setTypeFilter("all");
    }
  }, [preorderFeatureLoaded, showPreorderProducts, typeFilter]);

  useEffect(() => {
    const normalizeType = (value: unknown): "all" | "stock" | "preorder" =>
      value === "preorder" ? "preorder" : value === "stock" ? "stock" : "all";

    if (typeof window !== "undefined") {
      const initialType = new URLSearchParams(window.location.search).get(
        "type",
      );
      setTypeFilter(normalizeType(initialType));
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string | null }>).detail;
      setTypeFilter(normalizeType(detail?.type));
    };

    window.addEventListener("vendor-product-type-change", handler);
    return () =>
      window.removeEventListener("vendor-product-type-change", handler);
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
      masterProductId: "",
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      description: p.description || "",
      price: String(
        p.supplyType === "CHINA_PREORDER"
          ? (p.preorderPriceAmount ?? p.price)
          : p.price,
      ),
      wholesalePrice: p.wholesalePrice == null ? "" : String(p.wholesalePrice),
      orderPrice:
        p.supplyType === "CHINA_PREORDER" || p.orderPrice == null
          ? ""
          : String(p.orderPrice),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      taxType: p.taxType || "VAT_ABLE",
      cityTaxRate: p.cityTaxRate != null ? String(p.cityTaxRate) : "0",
      classificationCode:
        p.classificationCode || EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
      taxProductCode: p.taxProductCode || "",
      stock: String(p.stock),
      expiryDate: toDateInputValue(p.expiryDate),
      supplyType: p.supplyType || "IN_STOCK",
      preorderLeadTimeDays:
        p.preorderLeadTimeDays != null ? String(p.preorderLeadTimeDays) : "14",
      preorderCapacity:
        p.preorderCapacity != null ? String(p.preorderCapacity) : "50",
      preorderSupplierFrontImageUrl: p.preorderSupplierFrontImageUrl || "",
      preorderSupplierBackImageUrl: p.preorderSupplierBackImageUrl || "",
      preorderNote: p.preorderNote || "",
      preorderPriceCurrency: p.preorderPriceCurrency || "MNT",
      marketplacePriority: String(p.marketplacePriority ?? 0),
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
    if (isNaN(price) || price < 0)
      return showToast("error", "Ширхэгийн үнэ буруу байна");
    const wholesalePrice = form.wholesalePrice.trim()
      ? Number(form.wholesalePrice)
      : null;
    const orderPrice = form.orderPrice.trim() ? Number(form.orderPrice) : null;
    if (
      wholesalePrice !== null &&
      (!Number.isFinite(wholesalePrice) || wholesalePrice < 0)
    ) {
      return showToast("error", "Бөөний үнийг зөв оруулна уу");
    }
    if (
      orderPrice !== null &&
      (!Number.isFinite(orderPrice) || orderPrice < 0)
    ) {
      return showToast("error", "Захиалгын үнийг зөв оруулна уу");
    }

    let costPrice: number | null = null;
    if (form.costPrice.trim() !== "") {
      costPrice = parseFloat(form.costPrice);
      if (isNaN(costPrice) || costPrice < 0)
        return showToast("error", "Авсан үнэ буруу байна");
    }

    const stockNum =
      form.supplyType === "CHINA_PREORDER" ? 0 : parseInt(form.stock) || 0;
    if (stockNum < 0 || stockNum > 2_147_483_647)
      return showToast("error", "Нөөц 0-2,147,483,647 хооронд байх ёстой");

    const expiryDate =
      form.supplyType === "CHINA_PREORDER"
        ? null
        : form.expiryDate.trim() || null;
    if (expiryDate && Number.isNaN(new Date(expiryDate).getTime())) {
      return showToast("error", "Дуусах хугацаа буруу байна");
    }

    const leadTimeDays = form.preorderLeadTimeDays.trim()
      ? parseInt(form.preorderLeadTimeDays, 10)
      : null;
    if (
      leadTimeDays !== null &&
      (isNaN(leadTimeDays) || leadTimeDays < 0 || leadTimeDays > 365)
    ) {
      return showToast("error", "Ирэх хоног 0-365 хооронд байх ёстой");
    }

    const preorderCapacity = Number(form.preorderCapacity);
    if (
      form.supplyType === "CHINA_PREORDER" &&
      (!Number.isInteger(preorderCapacity) ||
        preorderCapacity < 1 ||
        preorderCapacity > 1_000_000)
    ) {
      return showToast(
        "error",
        "Дүүрэх хүний тоо 1-1,000,000 хооронд бүхэл тоо байх ёстой",
      );
    }
    const cityTaxRate = form.cityTaxRate.trim()
      ? parseFloat(form.cityTaxRate)
      : 0;
    if (isNaN(cityTaxRate) || cityTaxRate < 0 || cityTaxRate > 100) {
      return showToast("error", "Хотын татвар 0-100 хооронд байх ёстой");
    }
    if (!isValidEbarimtClassificationCode(form.classificationCode)) {
      return showToast(
        "error",
        "Нэгдсэн ангиллын 7 оронтой зөв код сонгоно уу",
      );
    }
    if (!isValidEbarimtTaxProductCode(form.taxType, form.taxProductCode)) {
      return showToast(
        "error",
        form.taxType === "VAT_FREE"
          ? "НӨАТ-аас чөлөөлөгдөх 3 оронтой татварын код сонгоно уу"
          : "НӨАТ 0%-ийн 3 оронтой татварын код сонгоно уу",
      );
    }
    const marketplacePriority = form.marketplacePriority.trim()
      ? parseInt(form.marketplacePriority, 10)
      : 0;
    if (
      !Number.isInteger(marketplacePriority) ||
      marketplacePriority < 0 ||
      marketplacePriority > 1_000_000
    ) {
      return showToast(
        "error",
        "Marketplace дараалал 0-1,000,000 хооронд бүхэл тоо байх ёстой",
      );
    }

    setSaving(true);
    try {
      const payload = {
        organizationId: orgId,
        masterProductId: form.masterProductId || null,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        price,
        wholesalePrice,
        orderPrice: form.supplyType === "CHINA_PREORDER" ? null : orderPrice,
        costPrice,
        taxType: form.taxType,
        cityTaxRate,
        classificationCode: form.classificationCode.trim(),
        taxProductCode: requiresEbarimtTaxProductCode(form.taxType)
          ? form.taxProductCode.trim()
          : null,
        stock: stockNum,
        expiryDate,
        supplyType: form.supplyType,
        preorderLeadTimeDays:
          form.supplyType === "CHINA_PREORDER" ? leadTimeDays : null,
        preorderCapacity:
          form.supplyType === "CHINA_PREORDER" ? preorderCapacity : null,
        preorderSupplierFrontImageUrl:
          form.supplyType === "CHINA_PREORDER"
            ? form.preorderSupplierFrontImageUrl
            : null,
        preorderSupplierBackImageUrl:
          form.supplyType === "CHINA_PREORDER"
            ? form.preorderSupplierBackImageUrl
            : null,
        preorderNote:
          form.supplyType === "CHINA_PREORDER"
            ? form.preorderNote.trim() || null
            : null,
        preorderPriceCurrency:
          form.supplyType === "CHINA_PREORDER"
            ? form.preorderPriceCurrency
            : null,
        preorderPriceAmount:
          form.supplyType === "CHINA_PREORDER" ? price : null,
        marketplacePriority,
        businessCategoryId: form.businessCategoryId || null,
        images: form.images,
      };

      const url = editingId
        ? `${API}/products/${editingId}`
        : `${API}/products`;
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

      const savedProduct = (await res
        .json()
        .catch(() => null)) as Product | null;
      if (savedProduct?.id) {
        setProducts((current) => {
          const exists = current.some(
            (product) => product.id === savedProduct.id,
          );
          return exists
            ? current.map((product) =>
                product.id === savedProduct.id ? savedProduct : product,
              )
            : [savedProduct, ...current];
        });
      }

      showToast(
        "success",
        editingId ? "Бараа шинэчлэгдлээ" : "Бараа амжилттай нэмэгдлээ",
      );
      closeForm();
      await fetchProducts();
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
      const res = await authFetch(`${API}/products/${id}`, {
        method: "DELETE",
      });
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
        setSelectedProduct((prev) =>
          prev ? { ...prev, isActive: !prev.isActive } : null,
        );
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

  const filtered = visibleProducts
    .filter((p) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(query) ||
        (p.sku || "").toLowerCase().includes(query) ||
        (p.barcode || "").toLowerCase().includes(query) ||
        (p.taxProductCode || "").toLowerCase().includes(query) ||
        (p.classificationCode || "").toLowerCase().includes(query);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive);

      const hasTaxCode = hasCompleteEbarimtTaxSetup(p);
      const matchTaxCode =
        taxCodeFilter === "all" ||
        (taxCodeFilter === "with-code" && hasTaxCode) ||
        (taxCodeFilter === "without-code" && !hasTaxCode);

      return matchSearch && matchStatus && matchTaxCode;
    })
    .sort(
      (a, b) =>
        (b.marketplacePriority || 0) - (a.marketplacePriority || 0) ||
        new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
    );

  return (
    <div className="min-w-0 space-y-4 bg-slate-50/50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl shadow-black/10 border transition-all animate-in slide-in-from-top-2 ${
            toast.type === "success"
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
                <p className="text-sm font-bold text-red-700">
                  Таны план дууссан байна
                </p>
                <p className="text-xs text-red-500">
                  Бараа нэмэх, засах боломжгүй. Дахин идэвхжүүлэхийн тулд
                  сунгана уу.
                </p>
              </div>
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors shrink-0"
              >
                <Crown size={14} /> Сунгах
              </a>
            </div>
          )}
          {isPlanActive &&
            planStatus.currentPlan?.isTrial &&
            daysLeft !== null &&
            daysLeft <= 7 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-700">
                    Үнэгүй туршилт: {daysLeft} хоног үлдсэн
                  </p>
                  <p className="text-xs text-amber-500">
                    Планаа сунгаж, бүх боломжуудыг ашиглаарай.
                  </p>
                </div>
                <a
                  href="/upgrade"
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shrink-0"
                >
                  <Crown size={14} /> Сунгах
                </a>
              </div>
            )}
          {isPlanActive && productLimitReached && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertCircle size={18} className="shrink-0 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-700">
                  Барааны хязгаарт хүрлээ ({productLimit})
                </p>
                <p className="text-xs text-orange-500">
                  Дахин бараа нэмэхийн тулд планаа сунгана уу.
                </p>
              </div>
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors shrink-0"
              >
                <Crown size={14} /> Сунгах
              </a>
            </div>
          )}
        </>
      )}

      {sellerPaymentConfigured === false && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
            <CreditCard size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-amber-900">
              Онлайн төлбөр идэвхгүй байна
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              QR төлбөрийн дансаа холбоогүй тул таны бараанд захиалга, төлбөр
              хүлээн авахгүй. Дансаа холбоход төлбөр зөвхөн таны бүртгүүлсэн
              дансанд орно.
            </p>
          </div>
          <a
            href="/profile?tab=qpay"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 text-xs font-bold text-white transition hover:bg-amber-700"
          >
            QR данс холбох
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Бараа
            </h1>
            {isPlanActive && planStatus?.currentPlan && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  planStatus.currentPlan.isTrial
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {planStatus.currentPlan.name}
                {productLimit !== -1 && ` · ${products.length}/${productLimit}`}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            Таны бараа бүтээгдэхүүний каталог
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <div className="relative col-span-2 flex-1 md:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
              placeholder="Нэр, SKU, татварын код хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setLabelPrintOpen(true)}
            disabled={visibleProducts.length === 0}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold shadow-lg transition-colors whitespace-nowrap sm:px-5 ${
              visibleProducts.length > 0
                ? "bg-slate-900 text-white shadow-slate-500/20 hover:bg-slate-800"
                : "cursor-not-allowed bg-slate-300 text-white shadow-none"
            }`}
          >
            <Printer size={16} />
            Шошго хэвлэх
          </button>
          <button
            onClick={() => canAddProduct && setImportOpen(true)}
            disabled={!canAddProduct}
            title={
              !isPlanActive
                ? "Идэвхтэй план шаардлагатай"
                : productLimitReached
                  ? `Дээд хязгаар: ${productLimit} бараа`
                  : ""
            }
            className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white shadow-lg transition-colors whitespace-nowrap sm:px-5 ${
              canAddProduct
                ? isPreorderView
                  ? "bg-blue-600 shadow-blue-500/25 hover:bg-blue-700"
                  : "bg-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700"
                : "bg-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            {canAddProduct ? <FileSpreadsheet size={16} /> : <Lock size={16} />}
            Excel импорт
          </button>
          {!isPreorderView && (
            <button
              onClick={() => canAddProduct && openAdd()}
              disabled={!canAddProduct}
              title={
                !isPlanActive
                  ? "Идэвхтэй план шаардлагатай"
                  : productLimitReached
                    ? `Дээд хязгаар: ${productLimit} бараа`
                    : ""
              }
              className={`col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-lg transition-colors whitespace-nowrap sm:col-span-1 ${
                canAddProduct
                  ? "bg-indigo-600 shadow-indigo-500/25 hover:bg-indigo-700"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              {canAddProduct ? <Plus size={16} /> : <Lock size={16} />}
              Шинэ бараа
            </button>
          )}
          {isPreorderView && (
            <button
              onClick={() => canAddProduct && openAddPreorder()}
              disabled={!canAddProduct}
              title={
                !isPlanActive
                  ? "Идэвхтэй план шаардлагатай"
                  : productLimitReached
                    ? `Дээд хязгаар: ${productLimit} бараа`
                    : ""
              }
              className={`col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-lg transition-colors whitespace-nowrap sm:col-span-1 ${
                canAddProduct
                  ? "bg-blue-600 shadow-blue-500/25 hover:bg-blue-700"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              {canAddProduct ? <Package size={16} /> : <Lock size={16} />}
              Захиалгын бараа
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Нийт бараа",
            value: visibleProducts.length,
            icon: Package,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Идэвхтэй",
            value: visibleProducts.filter((p) => p.isActive).length,
            icon: ToggleRight,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Нийт нөөц",
            value: visibleProducts.reduce((s, p) => s + p.stock, 0),
            icon: BarChart2,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Татварын кодтой",
            value: visibleProducts.filter(hasCompleteEbarimtTaxSetup).length,
            icon: Layers,
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
            <div>
              <div className="truncate text-lg font-black leading-tight text-slate-900 sm:text-xl">
                {value}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:text-xs">
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Excel Import Modal */}
      {importOpen && (
        <ExcelImportModal
          organizationId={getOrgId() || ""}
          mode={isPreorderView ? "preorder" : "stock"}
          onClose={() => setImportOpen(false)}
          onSuccess={fetchProducts}
        />
      )}

      <ProductLabelPrintDialog
        open={labelPrintOpen}
        products={visibleProducts}
        initialSearch={searchQuery}
        onClose={() => setLabelPrintOpen(false)}
      />

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
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {selectedProduct.name}
                </h2>
                {selectedProduct.sku && (
                  <p className="text-sm font-mono text-slate-500 mt-1">
                    SKU: {selectedProduct.sku}
                  </p>
                )}
                {selectedProduct.barcode && (
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Barcode: {selectedProduct.barcode}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${selectedProduct.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                >
                  {selectedProduct.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                </span>
                {selectedProduct.supplyType === "CHINA_PREORDER" && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    Хятадаас захиалгаар
                  </span>
                )}
                {(selectedProduct.marketplacePriority || 0) > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Marketplace эхэнд #{selectedProduct.marketplacePriority}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Зарагдах үнэ
                </div>
                <span className="text-3xl font-black text-indigo-600">
                  ₮{Number(selectedProduct.price).toLocaleString()}
                </span>
              </div>

              {selectedProduct.costPrice != null && (
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Авсан үнэ (Өртөг)
                  </div>
                  <span className="text-xl font-bold text-slate-600">
                    ₮{Number(selectedProduct.costPrice).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedProduct.businessCategory && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Tag size={16} className="text-indigo-400" />
                  <span className="font-semibold text-slate-700">
                    {selectedProduct.businessCategory.name}
                  </span>
                </div>
              )}

              {selectedProduct.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Тайлбар
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {selectedProduct.supplyType === "CHINA_PREORDER" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-bold">Захиалгаар ирэх бараа</p>
                  <p className="mt-1">
                    Ирэх хугацаа: {selectedProduct.preorderLeadTimeDays ?? 14}{" "}
                    хоног
                  </p>
                  {selectedProduct.preorderCapacity && (
                    <>
                      <p className="mt-1 font-semibold">
                        Захиалсан:{" "}
                        {selectedProduct.preorderParticipantCount ?? 0}/
                        {selectedProduct.preorderCapacity} хүн
                        {selectedProduct.preorderIsFull
                          ? " · Дүүрсэн"
                          : selectedProduct.preorderRemaining != null
                            ? ` · ${selectedProduct.preorderRemaining} хүн дутуу`
                            : ""}
                      </p>
                      {selectedProduct.preorderIsFull && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3">
                          <p className="text-xs leading-5 text-slate-600">
                            Өмнөх захиалгуудыг хадгалж, тоолуурыг тэглэн шинэ
                            мөчлөг эхлүүлнэ.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              void restartPreorderCycle(selectedProduct)
                            }
                            disabled={
                              restartingPreorderId === selectedProduct.id
                            }
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {restartingPreorderId === selectedProduct.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <RotateCcw size={15} />
                            )}
                            Шинэ захиалга эхлүүлэх
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {selectedProduct.preorderSupplierFrontImageUrl &&
                    selectedProduct.preorderSupplierBackImageUrl && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {[
                          {
                            label: "Урд тал",
                            url: selectedProduct.preorderSupplierFrontImageUrl,
                          },
                          {
                            label: "Ард тал",
                            url: selectedProduct.preorderSupplierBackImageUrl,
                          },
                        ].map((image) => (
                          <div
                            key={image.label}
                            className="overflow-hidden rounded-xl border border-blue-100 bg-white"
                          >
                            <img
                              src={image.url}
                              alt={`Нийлүүлэгчийн мэдээлэл · ${image.label}`}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <p className="px-2 py-1.5 text-center text-xs font-bold text-blue-700">
                              {image.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  {selectedProduct.preorderNote && (
                    <p className="mt-1 text-blue-700">
                      {selectedProduct.preorderNote}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <BarChart2 size={18} className="text-indigo-500" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    Үлдэгдэл нөөц
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {selectedProduct.stock} ширхэг
                  </div>
                </div>
              </div>

              {selectedProduct.supplyType !== "CHINA_PREORDER" && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <AlertTriangle size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Ойрын дуусах хугацаа
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatExpiryDate(selectedProduct.expiryDate)}
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct.supplyType !== "CHINA_PREORDER" &&
                (selectedProduct.receiptLots?.length || 0) > 0 && (
                  <div className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          Хүлээн авалтын партууд
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Дуусах хугацаа ойроосоо дараалсан
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800">
                        {selectedProduct.receiptLots?.length} парт
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedProduct.receiptLots?.map((lot) => {
                        const daysUntilExpiry = getDaysUntilExpiry(
                          lot.expiryDate,
                        );
                        return (
                          <div
                            key={lot.id}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-slate-500">
                                  {lot.batchNumber
                                    ? `Парт № ${lot.batchNumber}`
                                    : "Партын дугааргүй"}
                                </p>
                                <p
                                  className={`mt-0.5 text-sm font-black ${
                                    daysUntilExpiry !== null &&
                                    daysUntilExpiry < 0
                                      ? "text-rose-600"
                                      : daysUntilExpiry !== null &&
                                          daysUntilExpiry <= 14
                                        ? "text-amber-600"
                                        : "text-slate-900"
                                  }`}
                                >
                                  {lot.expiryDate
                                    ? formatExpiryDate(lot.expiryDate)
                                    : "Хугацаагүй"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-cyan-700">
                                  {lot.remainingQuantity} үлдсэн
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  авсан {lot.quantity}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
                              <p>{lot.supplierName}</p>
                              <p>
                                {lot.branchName} · {lot.receiptNo} ·{" "}
                                {new Date(lot.receivedAt).toLocaleDateString(
                                  "mn-MN",
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {selectedProduct.images.length > 1 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Бусад зурагнууд
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedProduct.images.slice(1).map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className="w-full aspect-square object-cover rounded-xl border border-slate-100 shadow-sm"
                      />
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
                  {selectedProduct.isActive ? (
                    <ToggleLeft size={18} className="text-slate-400" />
                  ) : (
                    <ToggleRight size={18} className="text-emerald-500" />
                  )}
                  {selectedProduct.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                </button>
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  disabled={deletingId === selectedProduct.id}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition-colors mt-2"
                >
                  {deletingId === selectedProduct.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Барааг устгах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div>
        {loading ? (
          <div className="flex justify-center py-32 bg-white rounded-3xl border border-slate-200">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-slate-500">
                Ачаалж байна...
              </p>
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
                : taxCodeFilter === "with-code"
                  ? "Татварын ангиллын кодтой бараа олдсонгүй"
                  : taxCodeFilter === "without-code"
                    ? "Татварын ангиллын кодгүй бараа олдсонгүй"
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
            {!searchQuery && taxCodeFilter !== "all" && (
              <button
                type="button"
                onClick={() => setTaxCodeFilter("all")}
                className="inline-flex h-11 items-center rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700"
              >
                Бүх барааг харах
              </button>
            )}
            {!searchQuery && taxCodeFilter === "all" && (
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => setImportOpen(true)}
                  className={`inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-bold text-white shadow-lg transition-colors ${
                    isPreorderView
                      ? "bg-blue-600 shadow-blue-500/25 hover:bg-blue-700"
                      : "bg-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700"
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  Excel импорт
                </button>
                <button
                  onClick={isPreorderView ? openAddPreorder : openAdd}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-700"
                >
                  <Plus size={18} />
                  {isPreorderView ? "Захиалгын бараа бүртгэх" : "Бараа бүртгэх"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <VendorProductCatalog
            products={filtered}
            deletingId={deletingId}
            onSelect={setSelectedProduct}
            onEdit={openEdit}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
            toolbar={
              <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
                <div className="flex shrink-0 items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {isPreorderView ? "Захиалгын бараа" : "Миний бараа"}
                  </h2>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                    {filtered.length} олдлоо
                  </span>
                </div>
                <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm xl:ml-auto xl:w-auto">
                  {[
                    {
                      key: "all",
                      label: "Бүгд",
                      count: visibleProducts.length,
                    },
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
                      onClick={() =>
                        setStatusFilter(
                          btn.key as "all" | "active" | "inactive",
                        )
                      }
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:px-3.5 ${
                        statusFilter === btn.key
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {btn.label}
                      <span
                        className={`ml-2 text-xs ${statusFilter === btn.key ? "text-indigo-200" : "opacity-60"}`}
                      >
                        {btn.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-emerald-200 bg-white p-0.5 shadow-sm xl:w-auto">
                  {[
                    {
                      key: "with-code",
                      label: "Татварын кодтой",
                      count: visibleProducts.filter(hasCompleteEbarimtTaxSetup)
                        .length,
                    },
                    {
                      key: "without-code",
                      label: "Татварын кодгүй",
                      count: visibleProducts.filter(
                        (product) => !hasCompleteEbarimtTaxSetup(product),
                      ).length,
                    },
                  ].map((button) => (
                    <button
                      key={button.key}
                      type="button"
                      aria-pressed={taxCodeFilter === button.key}
                      onClick={() =>
                        setTaxCodeFilter((current) =>
                          current === button.key
                            ? "all"
                            : (button.key as TaxCodeFilter),
                        )
                      }
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:px-3.5 ${
                        taxCodeFilter === button.key
                          ? "bg-emerald-600 text-white shadow-md"
                          : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {button.label}
                      <span
                        className={`ml-2 text-xs ${
                          taxCodeFilter === button.key
                            ? "text-emerald-100"
                            : "opacity-60"
                        }`}
                      >
                        {button.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
