"use client";

import { useEffect, useState, useRef } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  PackageCheck,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  FolderPlus,
  FileSpreadsheet,
} from "lucide-react";
import SkuGenerator from "@/components/SkuGenerator";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { API, wmsFetch } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  stock: number;
  images?: { url: string }[];
};

type Category = {
  id: string;
  name: string;
  level: number;
  children?: Category[];
};

type ReceiveItem = {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  cost: number;
  isNew?: boolean; // locally created product
};

type WarehouseOption = { id: string; name: string };

// ───── New Product Form State ─────
type NewProductForm = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  unit: string;
  price: string;
  costPrice: string;
  businessCategoryId: string;
  quantity: string;
  minQuantity: string;
  location: string;
  batchNumber: string;
  expiryDate: string;
  note: string;
  images: string[]; // URLs
  orgRegister: string;
};

const emptyProductForm: NewProductForm = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  unit: "",
  price: "",
  costPrice: "",
  businessCategoryId: "",
  quantity: "1",
  minQuantity: "0",
  location: "",
  batchNumber: "",
  expiryDate: "",
  note: "",
  images: [],
  orgRegister: "",
};

export default function ReceivePage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Organization name for SKU generator
  const [organizationName, setOrganizationName] = useState("");

  // New product modal
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [productForm, setProductForm] = useState<NewProductForm>(emptyProductForm);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productError, setProductError] = useState("");

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Excel import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Load warehouses + organization name
  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        if (user.organizationName) setOrganizationName(user.organizationName);
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
          // Try to get org name from warehouse data if not in user
          if (!user.organizationName && list.length > 0) {
            const wh = list[0];
            const orgName = wh.organizations?.[0]?.organization?.name || wh.organizationName || "";
            if (orgName) setOrganizationName(orgName);
          }
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await wmsFetch(`${API}/business-categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    };
    loadCategories();
  }, []);

  // Product search with debounce
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await wmsFetch(
          `${API}/products?search=${encodeURIComponent(productSearch)}&limit=10`,
        );
        if (res.ok) {
          const data = await res.json();
          const products = Array.isArray(data)
            ? data
            : data.products || data.data || [];
          setSearchResults(products);
        }
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const addItem = (product: Product) => {
    if (items.find((i) => i.productId === product.id)) return;
    setItems([
      ...items,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        cost: Number(product.price) || 0,
      },
    ]);
    setProductSearch("");
    setSearchResults([]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(
      items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    );
  };

  const updateCost = (productId: string, cost: number) => {
    setItems(
      items.map((i) => (i.productId === productId ? { ...i, cost } : i)),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.cost, 0);

  // ───── Image handling (convert to base64 data URL) ─────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (productForm.images.length >= 5) return;

    setUploadingImage(true);

    const remaining = 5 - productForm.images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    Promise.all(
      toProcess.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...dataUrls],
      }));
      setUploadingImage(false);
    });

    // Reset input
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  // ───── Create new category ─────
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await wmsFetch(`${API}/warehouses/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parentId: newCategoryParentId || null,
        }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev) => [...prev, cat]);
        setProductForm((prev) => ({ ...prev, businessCategoryId: cat.id }));
        setShowNewCategory(false);
        setNewCategoryName("");
        setNewCategoryParentId("");
      } else {
        const err = await res.json();
        alert(err.message || "Ангилал үүсгэхэд алдаа гарлаа");
      }
    } catch {
      alert("Серверт холбогдож чадсангүй");
    } finally {
      setCreatingCategory(false);
    }
  };

  // ───── Create new product via warehouse endpoint ─────
  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      setProductError("Барааны нэр шаардлагатай");
      return;
    }
    if (!productForm.price || parseFloat(productForm.price) < 0) {
      setProductError("Үнэ оруулна уу");
      return;
    }
    if (!selectedWarehouseId) {
      setProductError("Агуулах сонгоно уу");
      return;
    }

    setCreatingProduct(true);
    setProductError("");

    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/products`,
        {
          method: "POST",
          body: JSON.stringify({
            name: productForm.name.trim(),
            description: productForm.description.trim() || null,
            sku: productForm.sku.trim() || null,
            barcode: productForm.barcode.trim() || null,
            unit: productForm.unit.trim() || null,
            price: parseFloat(productForm.price),
            costPrice: productForm.costPrice ? parseFloat(productForm.costPrice) : null,
            businessCategoryId: productForm.businessCategoryId || null,
            images: productForm.images,
            quantity: parseInt(productForm.quantity) || 0,
            minQuantity: parseInt(productForm.minQuantity) || 0,
            location: productForm.location.trim() || null,
            batchNumber: productForm.batchNumber.trim() || null,
            expiryDate: productForm.expiryDate || null,
            note: productForm.note.trim() || null,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setProductError(data.message || "Алдаа гарлаа");
        setCreatingProduct(false);
        return;
      }

      // Add to receive list
      const qty = parseInt(productForm.quantity) || 0;
      if (qty > 0) {
        setItems((prev) => [
          ...prev,
          {
            productId: data.id,
            name: data.name,
            sku: data.sku,
            quantity: qty,
            cost: parseFloat(productForm.costPrice || productForm.price),
            isNew: true,
          },
        ]);
      }

      // Reset & close
      setProductForm(emptyProductForm);
      setShowNewProduct(false);
    } catch {
      setProductError("Серверт холбогдож чадсангүй");
    } finally {
      setCreatingProduct(false);
    }
  };

  // ───── Submit receive (existing products only — new ones already saved) ─────
  const handleSubmit = async () => {
    if (!selectedWarehouseId || items.length === 0) return;
    setSaving(true);
    setSaved(false);

    try {
      // Only submit items that are NOT new (new ones already created with inventory)
      const existingItems = items.filter((i) => !i.isNew);

      for (const item of existingItems) {
        await wmsFetch(
          `${API}/warehouses/${selectedWarehouseId}/inventory`,
          {
            method: "POST",
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              note: supplier
                ? `Нийлүүлэгч: ${supplier}. ${note}`
                : note || "Бараа хүлээн авалт",
            }),
          },
        );
      }

      setSaved(true);
      setItems([]);
      setSupplier("");
      setNote("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Receive failed:", err);
      alert("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Агуулахд бараа нэмэх болон нөөц нэмэгдүүлэх
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Амжилттай хадгалагдлаа
          </div>
        )}
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Warehouse + Supplier */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              Ерөнхий мэдээлэл
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
                  Нийлүүлэгч
                </label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Нийлүүлэгчийн нэр"
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Product search + list */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="h-1 w-1 rounded-full bg-blue-600" />
                Бараа нэмэх
              </h2>
              <button
                onClick={() => {
                  setProductForm({ ...emptyProductForm });
                  setShowNewProduct(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Шинэ бараа үүсгэх
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                disabled={!selectedWarehouseId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel импорт
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Бараа хайх (нэр, SKU, баркод)..."
                className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
              )}

              {/* Search dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      disabled={items.some((i) => i.productId === p.id)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 disabled:opacity-40"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.sku || p.barcode || "SKU байхгүй"} · {Number(p.price).toLocaleString()}₮
                          {typeof p.stock === "number" && <span className="ml-1 text-slate-400">· Үлдэгдэл: {p.stock}</span>}
                        </p>
                      </div>
                      {items.some((i) => i.productId === p.id) ? (
                        <span className="text-xs text-slate-400">Нэмсэн</span>
                      ) : (
                        <Plus className="h-4 w-4 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item list */}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
                <PackageCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">
                  Дээрх хайлтаар бараа нэмэх эсвэл &quot;Шинэ бараа үүсгэх&quot; товч дарна уу
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <div className="col-span-5">Бараа</div>
                  <div className="col-span-3 text-center">Тоо ширхэг</div>
                  <div className="col-span-3 text-right">Нэгжийн өртөг</div>
                  <div className="col-span-1" />
                </div>

                {items.map((item) => (
                  <div
                    key={item.productId}
                    className={`grid grid-cols-12 items-center gap-2 rounded-lg border px-3 py-2.5 ${
                      item.isNew
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-100 bg-slate-50/50"
                    }`}
                  >
                    <div className="col-span-5">
                      <p className="text-sm font-medium text-slate-900">
                        {item.name}
                        {item.isNew && (
                          <span className="ml-2 inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            ШИНЭ
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.sku || "—"}
                      </p>
                    </div>

                    <div className="col-span-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        disabled={item.isNew}
                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"
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
                        disabled={item.isNew}
                        className="h-8 w-16 rounded border border-slate-200 text-center text-sm font-semibold outline-none focus:border-blue-300 disabled:bg-slate-100"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        disabled={item.isNew}
                        className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) =>
                          updateCost(
                            item.productId,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        disabled={item.isNew}
                        className="h-8 w-full rounded border border-slate-200 px-2 text-right text-sm outline-none focus:border-blue-300 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Тэмдэглэл
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Нэмэлт тайлбар (заавал биш)..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Хүлээн авалтын дүн
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
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Нийт өртөг
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {totalCost.toLocaleString()}₮
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || items.length === 0 || !selectedWarehouseId}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PackageCheck className="h-4 w-4" />
                  Хүлээн авах
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ New Product Modal ═══════ */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Шинэ бараа бүртгэх</h2>
              <button
                onClick={() => { setShowNewProduct(false); setProductForm(emptyProductForm); setProductError(""); }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {productError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{productError}</div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Барааны нэр <span className="text-red-500">*</span>
                </label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Жишээ: Цагаан будаа 25кг"
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Organization name + Register */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Байгууллагын нэр
                  </label>
                  <input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Жишээ: Apu Dari"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Регистрийн дугаар
                  </label>
                  <input
                    value={productForm.orgRegister}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                      setProductForm({ ...productForm, orgRegister: val });
                    }}
                    placeholder="7 оронтой (жишээ: 1234567)"
                    maxLength={7}
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* SKU Generator */}
              <SkuGenerator
                productName={productForm.name}
                organizationName={organizationName}
                warehouseId={selectedWarehouseId}
                value={productForm.sku}
                onChange={(sku) => setProductForm((prev) => ({ ...prev, sku }))}
              />

              {/* Barcode */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Баркод
                </label>
                <input
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  placeholder="Баркод уншуулах эсвэл гараар оруулна уу"
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Баркод эсвэл SKU кодын алийг нь ч уншуулж бараа хайж болно
                </p>
              </div>

              {/* Unit */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Хэмжих нэгж
                </label>
                <div className="relative">
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">— Сонгох —</option>
                    <option value="ш">ш (ширхэг)</option>
                    <option value="кг">кг (килограмм)</option>
                    <option value="г">г (грамм)</option>
                    <option value="т">т (тонн)</option>
                    <option value="л">л (литр)</option>
                    <option value="мл">мл (миллилитр)</option>
                    <option value="м">м (метр)</option>
                    <option value="см">см (сантиметр)</option>
                    <option value="м²">м² (квадрат метр)</option>
                    <option value="м³">м³ (шоо метр)</option>
                    <option value="хайрцаг">хайрцаг</option>
                    <option value="уут">уут</option>
                    <option value="багц">багц</option>
                    <option value="дүүжин">дүүжин</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Тайлбар</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Барааны дэлгэрэнгүй тайлбар (заавал биш)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Price: Авах үнэ (costPrice) first, then Зарах үнэ (price) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Авах үнэ (₮)
                  </label>
                  <input
                    type="number"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Зарах үнэ (₮) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Category — searchable */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Ангилал</span>
                  <button
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Шинэ ангилал
                  </button>
                </label>

                {showNewCategory && (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ангилалын нэр"
                      className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                    <select
                      value={newCategoryParentId}
                      onChange={(e) => setNewCategoryParentId(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Эцэг ангилал (заавал биш)</option>
                      {categories.filter((c) => c.level < 2).map((c) => (
                        <option key={c.id} value={c.id}>
                          {"—".repeat(c.level)} {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        Болих
                      </button>
                      <button
                        onClick={handleCreateCategory}
                        disabled={creatingCategory || !newCategoryName.trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creatingCategory && <Loader2 className="h-3 w-3 animate-spin" />}
                        Үүсгэх
                      </button>
                    </div>
                  </div>
                )}

                {/* Search input for categories */}
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Ангилал хайх..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Category list */}
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-50">
                  {categories
                    .filter((c) => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setProductForm({ ...productForm, businessCategoryId: c.id });
                          setCategorySearch("");
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 ${
                          productForm.businessCategoryId === c.id
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{"—".repeat(c.level)} {c.name}</span>
                        {productForm.businessCategoryId === c.id && (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  {categories.filter((c) => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-3 text-center text-xs text-slate-400">Ангилал олдсонгүй</div>
                  )}
                </div>
                {productForm.businessCategoryId && (
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, businessCategoryId: "" })}
                    className="mt-1 text-xs text-red-500 hover:text-red-600"
                  >
                    Ангилал цуцлах
                  </button>
                )}
              </div>

              {/* Images */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImageIcon className="h-4 w-4" />
                  Зураг (хамгийн ихдээ 5)
                </label>

                <div className="flex flex-wrap gap-3">
                  {productForm.images.map((img, idx) => (
                    <div key={idx} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {productForm.images.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span className="mt-1 text-[10px]">Нэмэх</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Inventory info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-700">Агуулахын мэдээлэл</h3>

                {/* Previous stock display (informational) */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700">Өмнөх үлдэгдэл</span>
                  <span className="text-sm font-bold text-amber-800">0 ш</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Тоо ширхэг</label>
                    <input
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Хамгийн бага</label>
                    <input
                      type="number"
                      value={productForm.minQuantity}
                      onChange={(e) => setProductForm({ ...productForm, minQuantity: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Байрлал</label>
                    <input
                      value={productForm.location}
                      onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                      placeholder="A-1-3"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Нэхэмжлэлийн дугаар</label>
                    <input
                      value={productForm.batchNumber}
                      onChange={(e) => setProductForm({ ...productForm, batchNumber: e.target.value })}
                      placeholder="INV-001"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Дуусах хугацаа</label>
                    <input
                      type="date"
                      value={productForm.expiryDate}
                      onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Тэмдэглэл</label>
                  <input
                    value={productForm.note}
                    onChange={(e) => setProductForm({ ...productForm, note: e.target.value })}
                    placeholder="Нэмэлт тайлбар"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => { setShowNewProduct(false); setProductForm(emptyProductForm); setProductError(""); }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={creatingProduct || !productForm.name.trim() || !productForm.price}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackageCheck className="h-4 w-4" />
                Бараа үүсгэх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && selectedWarehouseId && (
        <ExcelImportModal
          warehouseId={selectedWarehouseId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            // Refresh search if there's an active search
            if (productSearch.trim()) {
              setProductSearch((prev) => prev); // trigger re-render
            }
          }}
        />
      )}
    </div>
  );
}
