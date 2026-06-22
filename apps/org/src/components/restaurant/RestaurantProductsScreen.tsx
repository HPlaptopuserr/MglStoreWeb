"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChefHat,
  Clapperboard,
  Clock3,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import { API, authFetch } from "@/lib/api";

type MenuCategory =
  | "HOT"
  | "COLD"
  | "SOUP"
  | "GRILL"
  | "APPETIZER"
  | "DESSERT"
  | "DRINK";
type KitchenStation = "HOT_KITCHEN" | "COLD_KITCHEN" | "BAR";
type TaxType = "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";

type RestaurantProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  taxType: TaxType;
  cityTaxRate: number;
  classificationCode: string;
  taxProductCode: string | null;
  isActive: boolean;
  isRestaurantMenuItem: boolean;
  menuCategory: MenuCategory | null;
  kitchenStation: KitchenStation | null;
  preparationMinutes: number | null;
  images: Array<{ id: string; url: string }>;
};

type MenuForm = {
  name: string;
  description: string;
  sku: string;
  price: string;
  costPrice: string;
  stock: string;
  menuCategory: MenuCategory;
  kitchenStation: KitchenStation;
  preparationMinutes: string;
  imageUrl: string;
  taxType: TaxType;
  cityTaxRate: string;
  classificationCode: string;
  taxProductCode: string;
};

const menuCategories: Array<{
  value: MenuCategory;
  label: string;
}> = [
  { value: "HOT", label: "Халуун хоол" },
  { value: "COLD", label: "Хүйтэн хоол" },
  { value: "SOUP", label: "Шөл" },
  { value: "GRILL", label: "Грилл" },
  { value: "APPETIZER", label: "Зууш" },
  { value: "DESSERT", label: "Амттан" },
  { value: "DRINK", label: "Ундаа" },
];

const kitchenStations: Array<{
  value: KitchenStation;
  label: string;
}> = [
  { value: "HOT_KITCHEN", label: "Халуун гал тогоо" },
  { value: "COLD_KITCHEN", label: "Хүйтэн гал тогоо" },
  { value: "BAR", label: "Бар" },
];

const taxTypes: Array<{ value: TaxType; label: string }> = [
  { value: "VAT_ABLE", label: "НӨАТ-тэй" },
  { value: "VAT_FREE", label: "НӨАТ-аас чөлөөлөгдсөн" },
  { value: "VAT_ZERO", label: "НӨАТ 0%" },
  { value: "NOT_VAT", label: "НӨАТ ногдохгүй" },
];

const emptyForm: MenuForm = {
  name: "",
  description: "",
  sku: "",
  price: "",
  costPrice: "",
  stock: "0",
  menuCategory: "HOT",
  kitchenStation: "HOT_KITCHEN",
  preparationMinutes: "15",
  imageUrl: "",
  taxType: "VAT_ABLE",
  cityTaxRate: "0",
  classificationCode: "4711000",
  taxProductCode: "",
};

const categoryLabel = (value?: MenuCategory | null) =>
  menuCategories.find((category) => category.value === value)?.label ??
  "Ангилалгүй";

const stationLabel = (value?: KitchenStation | null) =>
  kitchenStations.find((station) => station.value === value)?.label ??
  "Тодорхойгүй";

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("mn-MN").format(Number(value) || 0)}₮`;

export function RestaurantProductsScreen() {
  const { user } = useOrg();
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | MenuCategory>(
    "ALL",
  );
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (tone: "success" | "error", text: string) => {
    setMessage({ tone, text });
    window.setTimeout(() => setMessage(null), 3500);
  };

  const loadProducts = useCallback(async () => {
    if (!user.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: user.organizationId,
        includeInactive: "1",
        restaurantMenu: "1",
      });
      const response = await authFetch(`${API}/products?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || "Меню ачаалахад алдаа гарлаа");
      }
      setProducts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Меню ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "ALL" || product.menuCategory === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.sku || "").toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, products, query]);

  const activeCount = products.filter((product) => product.isActive).length;
  const kitchenCount = products.filter(
    (product) => product.kitchenStation !== "BAR",
  ).length;
  const barCount = products.filter(
    (product) => product.kitchenStation === "BAR",
  ).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (product: RestaurantProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      price: String(product.price),
      costPrice: product.costPrice === null ? "" : String(product.costPrice),
      stock: String(product.stock),
      menuCategory: product.menuCategory || "HOT",
      kitchenStation: product.kitchenStation || "HOT_KITCHEN",
      preparationMinutes: String(product.preparationMinutes ?? 15),
      imageUrl: product.images[0]?.url || "",
      taxType: product.taxType || "VAT_ABLE",
      cityTaxRate: String(product.cityTaxRate ?? 0),
      classificationCode: product.classificationCode || "4711000",
      taxProductCode: product.taxProductCode || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user.organizationId) {
      showMessage("error", "Байгууллагын мэдээлэл олдсонгүй");
      return;
    }

    const price = Number(form.price);
    const costPrice = form.costPrice.trim() ? Number(form.costPrice) : null;
    const stock = Number(form.stock);
    const preparationMinutes = Number(form.preparationMinutes);
    const cityTaxRate = Number(form.cityTaxRate);

    if (!form.name.trim()) {
      showMessage("error", "Хоолны нэр оруулна уу");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showMessage("error", "Зарах үнэ буруу байна");
      return;
    }
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      showMessage("error", "Өртөг үнэ буруу байна");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      showMessage("error", "Боломжит порц 0-ээс багагүй бүхэл тоо байна");
      return;
    }
    if (
      !Number.isInteger(preparationMinutes) ||
      preparationMinutes < 0 ||
      preparationMinutes > 1440
    ) {
      showMessage("error", "Бэлтгэх хугацаа 0-1440 минут байна");
      return;
    }
    if (
      !Number.isFinite(cityTaxRate) ||
      cityTaxRate < 0 ||
      cityTaxRate > 100
    ) {
      showMessage("error", "Хотын татвар 0-100 хувь байна");
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch(
        editingId ? `${API}/products/${editingId}` : `${API}/products`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: user.organizationId,
            name: form.name.trim(),
            description: form.description.trim() || null,
            sku: form.sku.trim() || null,
            unit: "порц",
            price,
            costPrice,
            stock,
            supplyType: "IN_STOCK",
            isRestaurantMenuItem: true,
            menuCategory: form.menuCategory,
            kitchenStation: form.kitchenStation,
            preparationMinutes,
            taxType: form.taxType,
            cityTaxRate,
            classificationCode:
              form.classificationCode.trim() || "4711000",
            taxProductCode: form.taxProductCode.trim() || null,
            images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Хоол хадгалахад алдаа гарлаа");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      showMessage(
        "success",
        editingId ? "Хоолны мэдээлэл шинэчлэгдлээ" : "Хоол менюд нэмэгдлээ",
      );
      await loadProducts();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Хоол хадгалахад алдаа гарлаа",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product: RestaurantProduct) => {
    try {
      const response = await authFetch(`${API}/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Төлөв солиход алдаа гарлаа");
      }
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, isActive: !item.isActive } : item,
        ),
      );
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Төлөв солиход алдаа гарлаа",
      );
    }
  };

  const deleteProduct = async (product: RestaurantProduct) => {
    if (!window.confirm(`"${product.name}" хоолыг устгах уу?`)) return;

    setDeletingId(product.id);
    try {
      const response = await authFetch(`${API}/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Хоол устгахад алдаа гарлаа");
      }
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      showMessage("success", "Хоол устгагдлаа");
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Хоол устгахад алдаа гарлаа",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      {message ? (
        <div
          className={`fixed right-5 top-5 z-[70] flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-bold shadow-xl ${
            message.tone === "success"
              ? "border-emerald-200 text-emerald-700"
              : "border-rose-200 text-rose-700"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {message.text}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <UtensilsCrossed className="h-4 w-4" />
            Рестораны меню
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            Хоол, ундааны бүртгэл
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Энд нэмсэн идэвхтэй бүтээгдэхүүн ресторан кассын менюд харагдана.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/reels"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <Clapperboard className="h-4 w-4" />
            Reel оруулах
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Бүтээгдэхүүн нэмэх
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-slate-200 pb-4">
        <Metric label="Нийт меню" value={products.length} />
        <Metric label="Идэвхтэй" value={activeCount} accent="emerald" />
        <Metric label="Гал тогоо" value={kitchenCount} accent="amber" />
        <Metric label="Бар" value={barCount} accent="sky" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          <FilterButton
            active={activeCategory === "ALL"}
            onClick={() => setActiveCategory("ALL")}
            label="Бүгд"
          />
          {menuCategories.map((category) => (
            <FilterButton
              key={category.value}
              active={activeCategory === category.value}
              onClick={() => setActiveCategory(category.value)}
              label={category.label}
            />
          ))}
        </div>

        <label className="relative w-full shrink-0 lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Хоол, SKU хайх..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-slate-400"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 text-center">
          <ChefHat className="h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-black text-slate-900">
            {query ? "Хайлтад тохирох хоол алга" : "Меню хоосон байна"}
          </h2>
          <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
            Шинэ хоол бүртгээд ресторан кассын менюгээ бүрдүүлээрэй.
          </p>
          {!query ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white"
            >
              <Plus className="h-4 w-4" />
              Эхний хоолоо нэмэх
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(240px,1.5fr)_150px_150px_100px_110px_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 max-xl:grid-cols-[minmax(220px,1fr)_140px_100px_120px]">
            <span>Хоол</span>
            <span className="max-xl:hidden">Ангилал</span>
            <span>Гал тогоо</span>
            <span className="text-right max-xl:hidden">Порц</span>
            <span className="text-right">Үнэ</span>
            <span className="text-right">Үйлдэл</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="grid min-h-20 grid-cols-[minmax(240px,1.5fr)_150px_150px_100px_110px_120px] items-center px-4 py-3 max-xl:grid-cols-[minmax(220px,1fr)_140px_100px_120px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProductImage
                    imageUrl={product.images[0]?.url}
                    name={product.name}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-black text-slate-950">
                        {product.name}
                      </h3>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          product.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={product.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                      />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {product.sku || "SKU байхгүй"} ·{" "}
                      {product.preparationMinutes ?? 0} мин
                    </p>
                  </div>
                </div>

                <span className="text-sm font-bold text-slate-600 max-xl:hidden">
                  {categoryLabel(product.menuCategory)}
                </span>
                <span className="text-sm font-bold text-slate-600">
                  {stationLabel(product.kitchenStation)}
                </span>
                <span className="text-right text-sm font-black tabular-nums text-slate-700 max-xl:hidden">
                  {product.stock}
                </span>
                <span className="text-right text-sm font-black tabular-nums text-slate-950">
                  {formatMoney(product.price)}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                    aria-label={`${product.name} засах`}
                    title="Засах"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleProduct(product)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                    aria-label={
                      product.isActive
                        ? `${product.name} идэвхгүй болгох`
                        : `${product.name} идэвхжүүлэх`
                    }
                    title={product.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                  >
                    {product.isActive ? (
                      <ToggleRight className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProduct(product)}
                    disabled={deletingId === product.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label={`${product.name} устгах`}
                    title="Устгах"
                  >
                    {deletingId === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {formOpen ? (
        <MenuItemForm
          form={form}
          editing={Boolean(editingId)}
          saving={saving}
          onChange={setForm}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "slate" | "emerald" | "amber" | "sky";
}) {
  const accentClass = {
    slate: "text-slate-950",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
  }[accent];

  return (
    <div className="flex items-baseline gap-2">
      <strong className={`text-xl font-black tabular-nums ${accentClass}`}>
        {value}
      </strong>
      <span className="text-xs font-bold text-slate-500">{label}</span>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-lg px-3 text-sm font-bold transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}

function ProductImage({ imageUrl, name }: { imageUrl?: string; name: string }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {imageUrl ? (
        // Product images can be hosted on organization-specific domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-5 w-5 text-slate-300" />
      )}
    </div>
  );
}

function MenuItemForm({
  form,
  editing,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: MenuForm;
  editing: boolean;
  saving: boolean;
  onChange: (form: MenuForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const update = <Key extends keyof MenuForm>(key: Key, value: MenuForm[Key]) =>
    onChange({ ...form, [key]: value });

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setImageError("JPG, PNG, WebP эсвэл GIF зураг сонгоно уу");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Зургийн хэмжээ 5MB-аас ихгүй байна");
      return;
    }

    setUploadingImage(true);
    setImageError("");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await authFetch(`${API}/products/upload-image`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message || "Зураг upload хийхэд алдаа гарлаа");
      }
      update("imageUrl", String(payload.url));
    } catch (error) {
      try {
        const preview = await fileToProductImage(file);
        update("imageUrl", preview);
        setImageError(
          "Сервер upload түр ажиллахгүй байгаа тул зураг хоолны мэдээлэлтэй хамт хадгалагдана.",
        );
      } catch {
        setImageError(
          error instanceof Error
            ? error.message
            : "Зураг upload хийхэд алдаа гарлаа",
        );
      }
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <ChefHat className="h-4 w-4" />
              Рестораны меню
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editing ? "Хоолны мэдээлэл засах" : "Шинэ хоол нэмэх"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Хаах"
            title="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          id="restaurant-product-form"
          onSubmit={(event) => {
            if (uploadingImage) {
              event.preventDefault();
              return;
            }
            onSubmit(event);
          }}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <div className="space-y-5">
              <Field label="Хоолны нэр" required>
                <input
                  required
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Жишээ: Үхрийн махан стейк"
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Меню ангилал" required>
                  <select
                    value={form.menuCategory}
                    onChange={(event) =>
                      update("menuCategory", event.target.value as MenuCategory)
                    }
                    className={inputClass}
                  >
                    {menuCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Гал тогооны хэсэг" required>
                  <select
                    value={form.kitchenStation}
                    onChange={(event) =>
                      update(
                        "kitchenStation",
                        event.target.value as KitchenStation,
                      )
                    }
                    className={inputClass}
                  >
                    {kitchenStations.map((station) => (
                      <option key={station.value} value={station.value}>
                        {station.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Зарах үнэ" required suffix="₮">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) => update("price", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Өртөг үнэ" suffix="₮">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.costPrice}
                    onChange={(event) =>
                      update("costPrice", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Боломжит порц" required>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) => update("stock", event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Бэлтгэх хугацаа" required suffix="мин">
                  <input
                    required
                    type="number"
                    min="0"
                    max="1440"
                    step="1"
                    value={form.preparationMinutes}
                    onChange={(event) =>
                      update("preparationMinutes", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="SKU">
                  <input
                    value={form.sku}
                    onChange={(event) => update("sku", event.target.value)}
                    placeholder="FOOD-001"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Тайлбар">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  placeholder="Орц, амт, порцын мэдээлэл..."
                  className={`${inputClass} h-auto resize-none py-3`}
                />
              </Field>
            </div>

            <div className="space-y-5">
              <div className="border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">
                      Хоолны зураг
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      JPG, PNG, WebP, GIF · 5MB хүртэл
                    </p>
                  </div>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        update("imageUrl", "");
                        setImageError("");
                      }}
                      disabled={uploadingImage}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Зураг устгах"
                      title="Зураг устгах"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <label className="group relative block aspect-[16/10] cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white transition hover:border-emerald-500 hover:bg-emerald-50/30">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Хоолны зураг урьдчилан харах"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center text-slate-400">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                        <Upload className="h-5 w-5" />
                      </span>
                      <span className="mt-3 text-sm font-black text-slate-700">
                        Зураг сонгох
                      </span>
                      <span className="mt-1 text-xs font-semibold">
                        Компьютер эсвэл утаснаас upload хийнэ
                      </span>
                    </div>
                  )}

                  {form.imageUrl && !uploadingImage ? (
                    <span className="absolute inset-x-3 bottom-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950/80 text-xs font-black text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                      <Upload className="h-4 w-4" />
                      Зураг солих
                    </span>
                  ) : null}

                  {uploadingImage ? (
                    <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-emerald-700 backdrop-blur-sm">
                      <Loader2 className="h-7 w-7 animate-spin" />
                      <span className="mt-2 text-xs font-black">
                        Зураг upload хийж байна...
                      </span>
                    </span>
                  ) : null}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => void handleImageUpload(event)}
                    disabled={uploadingImage}
                    className="sr-only"
                  />
                </label>

                {imageError ? (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {imageError}
                  </p>
                ) : null}
              </div>

              <div className="border border-slate-200 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-950">
                    eBarimt тохиргоо
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Касс дээр баримт үүсгэхэд ашиглагдана.
                  </p>
                </div>

                <div className="space-y-4">
                  <Field label="Татварын төрөл">
                    <select
                      value={form.taxType}
                      onChange={(event) =>
                        update("taxType", event.target.value as TaxType)
                      }
                      className={inputClass}
                    >
                      {taxTypes.map((taxType) => (
                        <option key={taxType.value} value={taxType.value}>
                          {taxType.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <Field label="Хотын татвар" suffix="%">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.cityTaxRate}
                        onChange={(event) =>
                          update("cityTaxRate", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Ангиллын код">
                      <input
                        value={form.classificationCode}
                        onChange={(event) =>
                          update("classificationCode", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Tax product code">
                    <input
                      value={form.taxProductCode}
                      onChange={(event) =>
                        update("taxProductCode", event.target.value)
                      }
                      placeholder="Шаардлагатай бол"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                <Clock3 className="h-4 w-4 shrink-0" />
                Хадгалсны дараа идэвхтэй хоол кассын менюд шууд харагдана.
              </div>
            </div>
          </div>
        </form>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploadingImage}
            className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-slate-400 disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="submit"
            form="restaurant-product-form"
            disabled={saving || uploadingImage}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving || uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {editing ? "Хадгалах" : "Менюд нэмэх"}
          </button>
        </footer>
      </section>
    </div>
  );
}

async function fileToProductImage(file: File) {
  if (file.type === "image/gif") {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadBrowserImage(objectUrl);
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Зураг боловсруулах боломжгүй байна");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadBrowserImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Зураг уншихад алдаа гарлаа"));
    image.src = source;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("Зураг уншихад алдаа гарлаа"));
    reader.readAsDataURL(file);
  });
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

function Field({
  label,
  required,
  suffix,
  children,
}: {
  label: string;
  required?: boolean;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-slate-600">
        <span>
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </span>
        {suffix ? <span className="text-slate-400">{suffix}</span> : null}
      </span>
      {children}
    </label>
  );
}
