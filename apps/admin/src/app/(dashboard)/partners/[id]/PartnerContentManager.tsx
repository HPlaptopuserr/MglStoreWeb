"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  AlignLeft,
  Camera,
  Check,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { SERVICE_CATEGORY_OPTIONS } from "@mgl/ui";
import { API, adminFetch } from "@/lib/api";

import {
  EMPTY_PRODUCT_FORM,
  EMPTY_SERVICE_FORM,
  FieldLabel,
  ImageGrid,
  SelectInput,
  TextArea,
  TextInput,
  ToggleButton,
  flattenCategories,
  fileToDataUrl,
  formatDate,
  formatMoney,
  normalizeStringArray,
  toDateInputValue,
  toProfileForm,
  uploadImage,
  type BusinessCategory,
  type PartnerProfile,
  type Product,
  type ProductForm,
  type ProfileForm,
  type ServiceForm,
  type ServicePost,
  type SupplyType,
  type TabKey,
  type Toast,
} from "./partner-content.shared";
export function PartnerContentManager({
  partner,
  onPartnerUpdated,
}: {
  partner: PartnerProfile;
  onPartnerUpdated: (next: PartnerProfile) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [profileForm, setProfileForm] = useState<ProfileForm>(() =>
    toProfileForm(partner),
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [servicePosts, setServicePosts] = useState<ServicePost[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [productForm, setProductForm] =
    useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [serviceForm, setServiceForm] =
    useState<ServiceForm>(EMPTY_SERVICE_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [uploadingOrgImage, setUploadingOrgImage] = useState<
    "logoUrl" | "bannerUrl" | null
  >(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<Toast | null>(null);

  const categoryOptions = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await adminFetch(`${API}/business-categories/tree`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        organizationId: partner.id,
        includeExpiredInventory: "1",
        includeInactive: "1",
        limit: "100",
      });
      const res = await adminFetch(`${API}/products?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(
        Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [],
      );
    } catch {
      showToast("error", "Бүтээгдэхүүн ачаалахад алдаа гарлаа");
    } finally {
      setLoadingProducts(false);
    }
  }, [partner.id, showToast]);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await adminFetch(
        `${API}/service-posts?organizationId=${encodeURIComponent(partner.id)}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServicePosts(Array.isArray(data) ? data : []);
    } catch {
      showToast("error", "Үйлчилгээ ачаалахад алдаа гарлаа");
    } finally {
      setLoadingServices(false);
    }
  }, [partner.id, showToast]);

  useEffect(() => {
    setProfileForm(toProfileForm(partner));
  }, [
    partner.id,
    partner.name,
    partner.phone,
    partner.email,
    partner.address,
    partner.logoUrl,
    partner.bannerUrl,
    partner.shortDescription,
    partner.description,
    partner.openingHours,
    partner.deliveryText,
    partner.deliveryPrice,
    partner.operatingYears,
    partner.years,
    partner.businessCategory,
  ]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchServices();
  }, [fetchCategories, fetchProducts, fetchServices]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const matched = query
      ? products.filter((product) => {
          return (
            product.name.toLowerCase().includes(query) ||
            (product.sku || "").toLowerCase().includes(query) ||
            (product.barcode || "").toLowerCase().includes(query)
          );
        })
      : products;
    return [...matched].sort(
      (a, b) =>
        (b.marketplacePriority || 0) - (a.marketplacePriority || 0) ||
        new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
    );
  }, [products, productSearch]);

  const handleOrgImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
    field: "logoUrl" | "bannerUrl",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingOrgImage(field);
    try {
      const url = await uploadImage(file, `${API}/partners/upload-image`);
      setProfileForm((current) => ({ ...current, [field]: url }));
      showToast("success", "Зураг хуулагдлаа");
    } catch (error) {
      try {
        const dataUrl = await fileToDataUrl(file);
        setProfileForm((current) => ({ ...current, [field]: dataUrl }));
        showToast(
          "success",
          "Supabase тохиргоо алга тул зураг түр хадгалагдлаа",
        );
      } catch {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Зураг upload хийхэд алдаа гарлаа",
        );
      }
    } finally {
      setUploadingOrgImage(null);
    }
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profileForm.name.trim()) {
      showToast("error", "Байгууллагын нэр оруулна уу");
      return;
    }

    const operatingYears = parseInt(profileForm.operatingYears || "1", 10);
    setSavingProfile(true);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
          email: profileForm.email.trim() || null,
          address: profileForm.address.trim() || null,
          logoUrl: profileForm.logoUrl || null,
          bannerUrl: profileForm.bannerUrl || null,
          shortDescription: profileForm.shortDescription.trim() || null,
          description: profileForm.description.trim() || null,
          openingHours: normalizeStringArray(profileForm.openingHours),
          deliveryText: profileForm.deliveryText.trim() || null,
          deliveryPrice: profileForm.deliveryPrice.trim() || null,
          operatingYears: Number.isFinite(operatingYears)
            ? Math.max(0, operatingYears)
            : 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Профайл хадгалахад алдаа гарлаа");
      }
      const updatedProfile = await res.json();

      if (profileForm.businessCategory !== (partner.businessCategory || "")) {
        const categoryRes = await adminFetch(
          `${API}/partners/${partner.id}/category`,
          {
            method: "PATCH",
            body: JSON.stringify({
              businessCategory: profileForm.businessCategory || null,
            }),
          },
        );
        if (!categoryRes.ok) {
          const err = await categoryRes.json().catch(() => ({}));
          throw new Error(err.message || "Ангилал хадгалахад алдаа гарлаа");
        }
      }

      onPartnerUpdated({
        ...partner,
        ...updatedProfile,
        businessCategory: profileForm.businessCategory || null,
        years: updatedProfile.operatingYears,
        operatingYears: updatedProfile.operatingYears,
      });
      showToast("success", "Байгууллагын мэдээлэл хадгалагдлаа");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const openAddProduct = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
  };

  const openEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      stock: String(product.stock ?? 0),
      expiryDate: toDateInputValue(product.expiryDate),
      supplyType: product.supplyType || "IN_STOCK",
      preorderLeadTimeDays:
        product.preorderLeadTimeDays != null
          ? String(product.preorderLeadTimeDays)
          : "14",
      preorderNote: product.preorderNote || "",
      marketplacePriority: String(product.marketplacePriority ?? 0),
      businessCategoryId: product.businessCategoryId || "",
      images: product.images.map((image) => image.url),
      isActive: product.isActive,
    });
    setEditingProductId(product.id);
    setActiveTab("products");
  };

  const handleSaveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim()) {
      showToast("error", "Бүтээгдэхүүний нэр оруулна уу");
      return;
    }
    const price = parseFloat(productForm.price);
    if (!Number.isFinite(price) || price < 0) {
      showToast("error", "Үнэ буруу байна");
      return;
    }

    const costPrice = productForm.costPrice.trim()
      ? parseFloat(productForm.costPrice)
      : null;
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      showToast("error", "Авсан үнэ буруу байна");
      return;
    }

    const stock =
      productForm.supplyType === "CHINA_PREORDER"
        ? 0
        : parseInt(productForm.stock || "0", 10);
    if (!Number.isFinite(stock) || stock < 0 || stock > 2_147_483_647) {
      showToast("error", "Нөөц буруу байна");
      return;
    }

    const leadTimeDays = productForm.preorderLeadTimeDays.trim()
      ? parseInt(productForm.preorderLeadTimeDays, 10)
      : null;
    const marketplacePriority = productForm.marketplacePriority.trim()
      ? parseInt(productForm.marketplacePriority, 10)
      : 0;
    if (
      !Number.isInteger(marketplacePriority) ||
      marketplacePriority < 0 ||
      marketplacePriority > 1_000_000
    ) {
      showToast(
        "error",
        "Эхэнд гаргах дараалал 0-1,000,000 хооронд бүхэл тоо байх ёстой",
      );
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        organizationId: partner.id,
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        barcode: productForm.barcode.trim() || null,
        description: productForm.description.trim() || null,
        price,
        costPrice,
        stock,
        expiryDate:
          productForm.supplyType === "CHINA_PREORDER"
            ? null
            : productForm.expiryDate || null,
        supplyType: productForm.supplyType,
        preorderLeadTimeDays:
          productForm.supplyType === "CHINA_PREORDER" ? leadTimeDays : null,
        preorderNote:
          productForm.supplyType === "CHINA_PREORDER"
            ? productForm.preorderNote.trim() || null
            : null,
        marketplacePriority,
        businessCategoryId: productForm.businessCategoryId || null,
        images: productForm.images,
        isActive: productForm.isActive,
      };

      const res = await adminFetch(
        editingProductId
          ? `${API}/products/${editingProductId}`
          : `${API}/products`,
        {
          method: editingProductId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Бүтээгдэхүүн хадгалахад алдаа гарлаа");
      }

      if (!editingProductId) {
        onPartnerUpdated({
          ...partner,
          stats: {
            ...(partner.stats || {}),
            products: (partner.stats?.products || 0) + 1,
          },
        });
      }
      showToast(
        "success",
        editingProductId
          ? "Бүтээгдэхүүн шинэчлэгдлээ"
          : "Бүтээгдэхүүн нэмэгдлээ",
      );
      openAddProduct();
      fetchProducts();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Энэ бүтээгдэхүүнийг устгах уу?")) return;
    setDeletingProductId(id);
    try {
      const res = await adminFetch(`${API}/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setProducts((current) => current.filter((product) => product.id !== id));
      onPartnerUpdated({
        ...partner,
        stats: {
          ...(partner.stats || {}),
          products: Math.max(0, (partner.stats?.products || 0) - 1),
        },
      });
      if (editingProductId === id) openAddProduct();
      showToast("success", "Бүтээгдэхүүн устгагдлаа");
    } catch {
      showToast("error", "Устгахад алдаа гарлаа");
    } finally {
      setDeletingProductId(null);
    }
  };

  const openAddService = () => {
    setServiceForm(EMPTY_SERVICE_FORM);
    setEditingServiceId(null);
  };

  const openEditService = (post: ServicePost) => {
    setServiceForm({
      title: post.title,
      description: post.description || "",
      priceText: post.priceText || "",
      tags: post.tags || [],
      images: post.images.map((image) => image.url),
      isActive: post.isActive,
    });
    setEditingServiceId(post.id);
    setActiveTab("services");
  };

  const toggleServiceTag = (tag: string) => {
    setServiceForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  };

  const handleSaveService = async (event: FormEvent) => {
    event.preventDefault();
    if (!serviceForm.title.trim()) {
      showToast("error", "Үйлчилгээний гарчиг оруулна уу");
      return;
    }

    setSavingService(true);
    try {
      const res = await adminFetch(
        editingServiceId
          ? `${API}/service-posts/${editingServiceId}`
          : `${API}/service-posts`,
        {
          method: editingServiceId ? "PATCH" : "POST",
          body: JSON.stringify({
            organizationId: partner.id,
            title: serviceForm.title.trim(),
            description: serviceForm.description.trim() || null,
            priceText: serviceForm.priceText.trim() || null,
            tags: serviceForm.tags,
            images: serviceForm.images,
            isActive: serviceForm.isActive,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Үйлчилгээ хадгалахад алдаа гарлаа");
      }

      showToast(
        "success",
        editingServiceId ? "Үйлчилгээ шинэчлэгдлээ" : "Үйлчилгээ нэмэгдлээ",
      );
      openAddService();
      fetchServices();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Энэ үйлчилгээний постыг устгах уу?")) return;
    setDeletingServiceId(id);
    try {
      const res = await adminFetch(`${API}/service-posts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setServicePosts((current) => current.filter((post) => post.id !== id));
      if (editingServiceId === id) openAddService();
      showToast("success", "Үйлчилгээ устгагдлаа");
    } catch {
      showToast("error", "Устгахад алдаа гарлаа");
    } finally {
      setDeletingServiceId(null);
    }
  };

  return (
    <section className="mb-4">
      {toast && (
        <div className="fixed right-5 top-5 z-[80] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl">
          {toast.type === "success" ? (
            <CheckCircle2 size={17} className="text-emerald-500" />
          ) : (
            <X size={17} className="text-red-500" />
          )}
          {toast.message}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900">Вэб контент</h2>
          <p className="text-xs font-medium text-slate-500">
            {partner.name} байгууллагын web дээр харагдах мэдээлэл
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { key: "profile" as const, label: "Профайл", icon: AlignLeft },
            { key: "products" as const, label: "Бараа", icon: Package },
            { key: "services" as const, label: "Үйлчилгээ", icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                  selected
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
              Public profile
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              Вэб дээр харагдах үндсэн мэдээлэл
            </h3>
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                <div className="relative aspect-[16/10] bg-slate-100">
                  {profileForm.bannerUrl ? (
                    <img
                      src={profileForm.bannerUrl}
                      alt="Ковер зураг"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
                      <Camera size={30} />
                      <span className="text-xs font-black uppercase tracking-[0.14em]">
                        Cover image
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
                    {profileForm.logoUrl ? (
                      <img
                        src={profileForm.logoUrl}
                        alt="Profile зураг"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={28} className="text-slate-300" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50">
                    {uploadingOrgImage === "bannerUrl" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Ковер
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handleOrgImageChange(event, "bannerUrl")
                      }
                    />
                  </label>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50">
                    {uploadingOrgImage === "logoUrl" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Лого
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handleOrgImageChange(event, "logoUrl")
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-sm font-black text-slate-950">
                  {profileForm.name || "Байгууллагын нэр"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                  {profileForm.shortDescription ||
                    "Богино танилцуулга оруулахад public page дээр илүү ойлгомжтой харагдана."}
                </p>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <AlignLeft size={17} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">
                      Үндсэн мэдээлэл
                    </h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Нэр, ангилал, холбоо барих мэдээлэл.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel>Байгууллагын нэр</FieldLabel>
                    <TextInput
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Бизнес ангилал</FieldLabel>
                    <SelectInput
                      value={profileForm.businessCategory}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          businessCategory: event.target.value,
                        }))
                      }
                    >
                      <option value="">Сонгохгүй</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {"— ".repeat(category.depth)}
                          {category.name}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Утас</FieldLabel>
                    <TextInput
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>И-мэйл</FieldLabel>
                    <TextInput
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <FieldLabel>Хаяг</FieldLabel>
                    <TextInput
                      value={profileForm.address}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <FieldLabel>Богино танилцуулга</FieldLabel>
                    <TextInput
                      value={profileForm.shortDescription}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          shortDescription: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Package size={17} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">
                      Дэлгэрэнгүй тохиргоо
                    </h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Танилцуулга, ажиллах цаг, хүргэлтийн мэдээлэл.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel>Байгууллагын тухай</FieldLabel>
                    <TextArea
                      rows={7}
                      value={profileForm.description}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>Ажиллах цаг</FieldLabel>
                      <TextArea
                        rows={3}
                        value={profileForm.openingHours}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            openingHours: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Хүргэлтийн текст</FieldLabel>
                        <TextInput
                          value={profileForm.deliveryText}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              deliveryText: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Хүргэлтийн үнэ</FieldLabel>
                        <TextInput
                          value={profileForm.deliveryPrice}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              deliveryPrice: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Ажилласан жил</FieldLabel>
                        <TextInput
                          type="number"
                          min="0"
                          value={profileForm.operatingYears}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              operatingYears: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingProfile ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Хадгалах
            </button>
          </div>
        </form>
      )}

      {activeTab === "products" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <TextInput
                  className="pl-9"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Нэр, SKU, barcode"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchProducts}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={14} />
                  Шинэчлэх
                </button>
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Шинэ
                </button>
              </div>
            </div>
            {loadingProducts ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400">
                <Package size={28} className="mb-2" />
                <p className="text-sm font-bold">Бүтээгдэхүүн алга</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex gap-3 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {product.images[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <Package size={22} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {product.sku || product.barcode || "Кодгүй"} ·{" "}
                            {product.businessCategory?.name || "Ангилалгүй"}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(product.marketplacePriority || 0) > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                              Эхэнд #{product.marketplacePriority}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {product.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                        <span>{formatMoney(product.price)}</span>
                        <span>Нөөц: {product.stock ?? 0}</span>
                        {product.expiryDate && (
                          <span>Дуусах: {formatDate(product.expiryDate)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openEditProduct(product)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                        aria-label="Засах"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deletingProductId === product.id}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Устгах"
                      >
                        {deletingProductId === product.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSaveProduct}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingProductId ? "Бүтээгдэхүүн засах" : "Бүтээгдэхүүн нэмэх"}
              </h3>
              {editingProductId && (
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Форм цэвэрлэх"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>Нэр</FieldLabel>
                <TextInput
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>SKU</FieldLabel>
                  <TextInput
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Barcode</FieldLabel>
                  <TextInput
                    value={productForm.barcode}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        barcode: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Зарах үнэ</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Авсан үнэ</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    value={productForm.costPrice}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        costPrice: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Нөөц</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        stock: event.target.value,
                      }))
                    }
                    disabled={productForm.supplyType === "CHINA_PREORDER"}
                  />
                </div>
                <div>
                  <FieldLabel>Дуусах хугацаа</FieldLabel>
                  <TextInput
                    type="date"
                    value={productForm.expiryDate}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        expiryDate: event.target.value,
                      }))
                    }
                    disabled={productForm.supplyType === "CHINA_PREORDER"}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Ангилал</FieldLabel>
                <SelectInput
                  value={productForm.businessCategoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      businessCategoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Сонгохгүй</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {"— ".repeat(category.depth)}
                      {category.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Тайлбар</FieldLabel>
                <TextArea
                  rows={3}
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <ToggleButton
                    checked={Number(productForm.marketplacePriority || 0) > 0}
                    label="Marketplace эхэнд гаргах"
                    onClick={() =>
                      setProductForm((current) => ({
                        ...current,
                        marketplacePriority:
                          Number(current.marketplacePriority || 0) > 0
                            ? "0"
                            : "100",
                      }))
                    }
                  />
                  <div>
                    <FieldLabel>Дараалал</FieldLabel>
                    <TextInput
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      value={productForm.marketplacePriority}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          marketplacePriority: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ToggleButton
                  checked={productForm.supplyType === "CHINA_PREORDER"}
                  label="Захиалгын бараа"
                  onClick={() =>
                    setProductForm((current) => ({
                      ...current,
                      supplyType:
                        current.supplyType === "CHINA_PREORDER"
                          ? "IN_STOCK"
                          : "CHINA_PREORDER",
                    }))
                  }
                />
                <ToggleButton
                  checked={productForm.isActive}
                  label="Идэвхтэй"
                  onClick={() =>
                    setProductForm((current) => ({
                      ...current,
                      isActive: !current.isActive,
                    }))
                  }
                />
              </div>
              {productForm.supplyType === "CHINA_PREORDER" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Ирэх хоног</FieldLabel>
                    <TextInput
                      type="number"
                      min="0"
                      max="365"
                      value={productForm.preorderLeadTimeDays}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          preorderLeadTimeDays: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Нэмэлт тайлбар</FieldLabel>
                    <TextInput
                      value={productForm.preorderNote}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          preorderNote: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
              <ImageGrid
                images={productForm.images}
                uploadEndpoint={`${API}/products/upload-image`}
                onChange={(images) =>
                  setProductForm((current) => ({ ...current, images }))
                }
              />
              <button
                type="submit"
                disabled={savingProduct}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingProduct ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {editingProductId ? "Шинэчлэх" : "Нэмэх"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "services" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="text-sm font-black text-slate-900">
                Үйлчилгээний постууд
              </h3>
              <button
                type="button"
                onClick={openAddService}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Plus size={14} />
                Шинэ
              </button>
            </div>
            {loadingServices ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : servicePosts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400">
                <Wrench size={28} className="mb-2" />
                <p className="text-sm font-bold">Үйлчилгээ алга</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {servicePosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex gap-3 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {post.images[0]?.url ? (
                        <img
                          src={post.images[0].url}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <Wrench size={22} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {post.title}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {post.priceText || "Үнийн мэдээлэлгүй"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${post.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {post.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                        </span>
                      </div>
                      {post.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700"
                            >
                              <Tag size={11} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openEditService(post)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                        aria-label="Засах"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(post.id)}
                        disabled={deletingServiceId === post.id}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Устгах"
                      >
                        {deletingServiceId === post.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSaveService}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingServiceId ? "Үйлчилгээ засах" : "Үйлчилгээ нэмэх"}
              </h3>
              {editingServiceId && (
                <button
                  type="button"
                  onClick={openAddService}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Форм цэвэрлэх"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>Гарчиг</FieldLabel>
                <TextInput
                  value={serviceForm.title}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Үнийн мэдээлэл</FieldLabel>
                <TextInput
                  value={serviceForm.priceText}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      priceText: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Тайлбар</FieldLabel>
                <TextArea
                  rows={4}
                  value={serviceForm.description}
                  onChange={(event) =>
                    setServiceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Үйлчилгээний төрөл</FieldLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SERVICE_CATEGORY_OPTIONS.map((tag) => {
                    const checked = serviceForm.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleServiceTag(tag)}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-left text-xs font-bold transition-colors ${
                          checked
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-200"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300 bg-white"}`}
                        >
                          {checked && <Check size={11} />}
                        </span>
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ImageGrid
                images={serviceForm.images}
                onChange={(images) =>
                  setServiceForm((current) => ({ ...current, images }))
                }
              />
              <ToggleButton
                checked={serviceForm.isActive}
                label="Идэвхтэй"
                onClick={() =>
                  setServiceForm((current) => ({
                    ...current,
                    isActive: !current.isActive,
                  }))
                }
              />
              <button
                type="submit"
                disabled={savingService}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {savingService ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {editingServiceId ? "Шинэчлэх" : "Нэмэх"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
