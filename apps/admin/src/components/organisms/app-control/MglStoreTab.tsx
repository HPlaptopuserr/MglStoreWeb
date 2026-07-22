"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Smartphone,
  Building2,
  ImagePlus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  X,
  Plus,
  MapPin,
  Navigation,
} from "lucide-react";
import Image from "next/image";
import { API, adminFetch } from "@/lib/api";

const MAX_BANNERS = 6;

type BusinessCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  level: number;
};

type StoreBranchLocation = {
  id: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
};

type StoreProduct = {
  id: string;
  name: string;
  price: number;
  images?: { id?: string; url: string }[];
  organization?: { id: string; name: string } | null;
  businessCategory?: { id: string; name: string } | null;
};

/* ── icon helper: data URI / URL → <img>, otherwise emoji/text ── */
function CatIcon({ icon, size = 20 }: { icon: string | null; size?: number }) {
  if (!icon) return <Package size={size} className="text-slate-400" />;
  if (icon.startsWith("data:") || icon.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.85 }}>{icon}</span>;
}

export function MglStoreTab() {
  const [banners, setBanners] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<BusinessCategory[]>([]);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showLocations, setShowLocations] = useState(true);
  const [branchLocations, setBranchLocations] = useState<StoreBranchLocation[]>(
    [],
  );
  const [branchSearch, setBranchSearch] = useState("");
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewBannerIdx, setPreviewBannerIdx] = useState(0);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── load ALL categories (flat) ── */
  useEffect(() => {
    Promise.all([
      adminFetch(`${API}/site-settings`).then((r) => (r.ok ? r.json() : {})),
      fetch(`${API}/business-categories`).then((r) => (r.ok ? r.json() : [])),
      adminFetch(`${API}/products?limit=100`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(
        ([
          settings,
          cats,
          products,
        ]: [
          Record<string, string>,
          BusinessCategory[],
          StoreProduct[] | { products?: StoreProduct[]; data?: StoreProduct[] },
        ]) => {
          if (settings["app-promo-banners"]) {
            try {
              const p = JSON.parse(settings["app-promo-banners"]);
              if (Array.isArray(p)) setBanners(p);
            } catch {}
          }
          if (settings["app-home-categories"]) {
            try {
              const p = JSON.parse(settings["app-home-categories"]);
              if (Array.isArray(p)) setSelectedCatIds(p);
            } catch {}
          }
          if (settings["app-featured-products"]) {
            try {
              const p = JSON.parse(settings["app-featured-products"]);
              if (Array.isArray(p)) setFeaturedProductIds(p);
            } catch {}
          }
          const showLocationsRaw =
            settings["app-show-branch-locations"] ??
            settings["show-branch-map"];
          setShowLocations(
            !["false", "0", "off"].includes(
              String(showLocationsRaw || "").toLowerCase(),
            ),
          );
          setAllCategories(cats);
          setAllProducts(
            Array.isArray(products)
              ? products
              : Array.isArray(products.products)
                ? products.products
                : Array.isArray(products.data)
                  ? products.data
                  : [],
          );
        },
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBranchLoading(true);
    setBranchError("");
    fetch(`${API}/store/branches`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setBranchLocations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setBranchLocations([]);
        setBranchError("Салбарын байршил татахад алдаа гарлаа");
      })
      .finally(() => setBranchLoading(false));
  }, []);

  /* ── derived: roots + children map ── */
  const rootCats = allCategories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) =>
    allCategories.filter((c) => c.parentId === parentId);
  const toggleExpand = (id: string) =>
    setExpandedParents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── banner ── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || banners.length >= MAX_BANNERS) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBanners((p) => [...p, ev.target?.result as string]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const removeBanner = (i: number) =>
    setBanners((p) => p.filter((_, k) => k !== i));
  const swapBanners = (i: number, j: number) => {
    if (j < 0 || j >= banners.length) return;
    setBanners((p) => {
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  /* ── category ── */
  const toggleCat = (id: string) =>
    setSelectedCatIds((p) =>
      p.includes(id) ? p.filter((c) => c !== id) : [...p, id],
    );
  const moveCat = (id: string, dir: -1 | 1) => {
    setSelectedCatIds((p) => {
      const i = p.indexOf(id);
      const t = i + dir;
      if (t < 0 || t >= p.length) return p;
      const n = [...p];
      [n[i], n[t]] = [n[t], n[i]];
      return n;
    });
  };

  const toggleFeaturedProduct = (id: string) =>
    setFeaturedProductIds((p) =>
      p.includes(id) ? p.filter((productId) => productId !== id) : [...p, id],
    );
  const moveFeaturedProduct = (id: string, dir: -1 | 1) => {
    setFeaturedProductIds((p) => {
      const i = p.indexOf(id);
      const t = i + dir;
      if (t < 0 || t >= p.length) return p;
      const n = [...p];
      [n[i], n[t]] = [n[t], n[i]];
      return n;
    });
  };

  /* ── save ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const response = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "app-promo-banners": JSON.stringify(banners),
          "app-home-categories": JSON.stringify(selectedCatIds),
          "app-featured-products": JSON.stringify(featuredProductIds),
          "app-show-branch-locations": showLocations ? "true" : "false",
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Хадгалахад алдаа гарлаа");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Хадгалахад алдаа гарлаа");
    }
    setSaving(false);
  }, [banners, featuredProductIds, selectedCatIds, showLocations]);

  const selectedCats = selectedCatIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter(Boolean) as BusinessCategory[];
  const selectedFeaturedProducts = featuredProductIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as StoreProduct[];
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedProductSearch) return allProducts;
    return allProducts.filter((product) => {
      const haystack = [
        product.name,
        product.organization?.name,
        product.businessCategory?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedProductSearch);
    });
  }, [allProducts, normalizedProductSearch]);
  const normalizedBranchSearch = branchSearch.trim().toLowerCase();
  const filteredBranchLocations = branchLocations.filter((branch) => {
    if (!normalizedBranchSearch) return true;
    const haystack = [
      branch.name,
      branch.address,
      branch.organization?.name,
      branch.organization?.slug,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedBranchSearch);
  });

  const nextBanner = () =>
    setPreviewBannerIdx((i) => (i + 1) % Math.max(banners.length, 1));
  const prevBanner = () =>
    setPreviewBannerIdx(
      (i) =>
        (i - 1 + Math.max(banners.length, 1)) % Math.max(banners.length, 1),
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 p-6">
      {/* ════════ LEFT CONTROLS ════════ */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Header + Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200/50">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                MGL Store — Нүүр хуудас
              </h2>
              <p className="text-xs text-slate-400">
                Баннер болон ангиллын тохиргоог энд удирдана
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-60 ${
              saved
                ? "bg-emerald-500 shadow-emerald-200/50"
                : "bg-violet-600 shadow-violet-200/50 hover:bg-violet-700"
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {saved ? "Хадгалагдлаа" : "Хадгалах"}
          </button>
        </div>

        {/* ── BANNERS ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Промо баннерууд
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Нүүр хуудасны слайдер. Ихдээ {MAX_BANNERS} зураг.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {banners.length}/{MAX_BANNERS}
            </span>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {banners.map((url, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden border border-slate-200 group aspect-[2/1] shadow-sm hover:shadow-md transition-all bg-slate-100"
              >
                <Image
                  src={url}
                  alt={`Banner ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={url.startsWith("data:")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* controls */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-2 pt-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      onClick={() => swapBanners(i, i - 1)}
                      disabled={i === 0}
                      className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors shadow-sm"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => swapBanners(i, i + 1)}
                      disabled={i === banners.length - 1}
                      className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors shadow-sm"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-white/80">
                    {i + 1}/{banners.length}
                  </span>
                  <button
                    onClick={() => removeBanner(i)}
                    className="h-7 w-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {banners.length < MAX_BANNERS && (
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 cursor-pointer hover:border-violet-400 hover:bg-violet-50/40 transition-all aspect-[2/1] group"
              >
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImagePlus size={18} className="text-violet-500" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-violet-600 transition-colors">
                  Баннер нэмэх
                </span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          {banners.length > 0 && (
            <button
              onClick={() => setBanners([])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
            >
              <Trash2 size={12} /> Бүгдийг устгах
            </button>
          )}
        </section>

        {/* ── CATEGORIES ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Ангиллууд</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Үндсэн болон дэд ангиллуудыг сонгож, дарааллыг тохируулна.
            </p>
          </div>

          {/* Category tree */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Ангилал сонгох
          </p>
          <div className="space-y-1 mb-5">
            {rootCats.map((parent) => {
              const children = childrenOf(parent.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents.has(parent.id);
              const parentOn = selectedCatIds.includes(parent.id);
              const selectedChildCount = children.filter((c) =>
                selectedCatIds.includes(c.id),
              ).length;

              return (
                <div key={parent.id}>
                  {/* Parent row */}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-1.5 hover:bg-white hover:border-slate-200 transition-all">
                    {/* Expand toggle */}
                    <button
                      onClick={() => hasChildren && toggleExpand(parent.id)}
                      className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                        hasChildren
                          ? "hover:bg-slate-200 text-slate-500"
                          : "text-transparent cursor-default"
                      }`}
                    >
                      {hasChildren && (
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            isExpanded ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      )}
                    </button>
                    {/* Icon + Name */}
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                      <CatIcon icon={parent.icon} size={17} />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-700 min-w-0 truncate">
                      {parent.name}
                    </span>
                    {/* Child count badge */}
                    {hasChildren && (
                      <span className="text-[10px] font-medium text-slate-400 mr-1">
                        {selectedChildCount > 0 && (
                          <span className="text-violet-500 font-bold">
                            {selectedChildCount}/
                          </span>
                        )}
                        {children.length} дэд
                      </span>
                    )}
                    {/* Select toggle */}
                    <button
                      onClick={() => toggleCat(parent.id)}
                      className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold border transition-all ${
                        parentOn
                          ? "border-violet-300 bg-violet-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      {parentOn ? (
                        <span className="flex items-center gap-1">
                          <Check size={11} /> Сонгосон
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus size={11} /> Сонгох
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Children */}
                  {hasChildren && isExpanded && (
                    <div className="ml-8 mt-1 mb-1 space-y-1 border-l-2 border-slate-100 pl-3">
                      {children.map((child) => {
                        const childOn = selectedCatIds.includes(child.id);
                        const grandchildren = childrenOf(child.id);
                        return (
                          <div key={child.id} className="space-y-1">
                            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-all">
                              <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                <CatIcon icon={child.icon} size={14} />
                              </div>
                              <span className="flex-1 text-[13px] font-medium text-slate-600 min-w-0 truncate">
                                {child.name}
                              </span>
                              {grandchildren.length > 0 && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  {grandchildren.length} дэд
                                </span>
                              )}
                              <button
                                onClick={() => toggleCat(child.id)}
                                className={`h-6 shrink-0 rounded-md px-2 text-[10px] font-bold border transition-all ${
                                  childOn
                                    ? "border-violet-300 bg-violet-500 text-white"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-600"
                                }`}
                              >
                                {childOn ? (
                                  <Check size={10} />
                                ) : (
                                  <Plus size={10} />
                                )}
                              </button>
                            </div>
                            {grandchildren.length > 0 && (
                              <div className="ml-7 space-y-1 border-l border-slate-100 pl-3">
                                {grandchildren.map((grandchild) => {
                                  const grandchildOn = selectedCatIds.includes(
                                    grandchild.id,
                                  );
                                  return (
                                    <div
                                      key={grandchild.id}
                                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-all"
                                    >
                                      <div className="h-6 w-6 rounded-md bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                        <CatIcon
                                          icon={grandchild.icon}
                                          size={13}
                                        />
                                      </div>
                                      <span className="flex-1 text-[12px] font-medium text-slate-500 min-w-0 truncate">
                                        {grandchild.name}
                                      </span>
                                      <button
                                        onClick={() => toggleCat(grandchild.id)}
                                        className={`h-6 shrink-0 rounded-md px-2 text-[10px] font-bold border transition-all ${
                                          grandchildOn
                                            ? "border-violet-300 bg-violet-500 text-white"
                                            : "border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-600"
                                        }`}
                                      >
                                        {grandchildOn ? (
                                          <Check size={10} />
                                        ) : (
                                          <Plus size={10} />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Сонгосон дараалал */}
          {selectedCatIds.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Сонгосон дараалал ({selectedCats.length})
              </p>
              <div className="space-y-1.5">
                {selectedCats.map((cat, i) => {
                  const isChild = !!cat.parentId;
                  const parentName = isChild
                    ? allCategories.find((c) => c.id === cat.parentId)?.name
                    : null;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-150 bg-slate-50/50 px-3 py-2 group hover:bg-white hover:border-slate-200 transition-all"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[11px] font-bold text-violet-600">
                        {i + 1}
                      </span>
                      <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                        <CatIcon icon={cat.icon} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-700 block truncate">
                          {cat.name}
                        </span>
                        {parentName && (
                          <span className="text-[10px] text-slate-400">
                            {parentName} →
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveCat(cat.id, -1)}
                          disabled={i === 0}
                          className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                          <ArrowUp size={12} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => moveCat(cat.id, 1)}
                          disabled={i === selectedCats.length - 1}
                          className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                          <ArrowDown size={12} className="text-slate-600" />
                        </button>
                        <button
                          onClick={() => toggleCat(cat.id)}
                          className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
                        >
                          <X size={12} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ── FEATURED PRODUCTS ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Онцлох бүтээгдэхүүн
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Shop нүүрний жижиг бүтээгдэхүүний мөрөнд харагдах барааг сонгоно.
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
              {featuredProductIds.length} сонгосон
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Бараа, байгууллага, ангиллаар хайх"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {filteredProducts.length}/{allProducts.length}
            </span>
          </div>

          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-400">
                Бүтээгдэхүүн олдсонгүй
              </div>
            ) : (
              filteredProducts.map((product) => {
                const selected = featuredProductIds.includes(product.id);
                const imageUrl = product.images?.[0]?.url;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleFeaturedProduct(product.id)}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-2 text-left transition ${
                      selected
                        ? "border-orange-300 ring-2 ring-orange-100"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={22} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {product.name}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-400">
                        {product.organization?.name || "MGL Store"} · ₮
                        {Number(product.price || 0).toLocaleString()}
                      </p>
                    </div>
                    {selected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {selectedFeaturedProducts.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Харагдах дараалал
                </p>
                <button
                  type="button"
                  onClick={() => setFeaturedProductIds([])}
                  className="text-xs font-bold text-slate-400 hover:text-red-500"
                >
                  Цэвэрлэх
                </button>
              </div>
              <div className="space-y-1.5">
                {selectedFeaturedProducts.map((product, i) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-150 bg-slate-50/50 px-3 py-2 group hover:bg-white hover:border-slate-200 transition-all"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-[11px] font-bold text-orange-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">
                        {product.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {product.organization?.name || "MGL Store"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveFeaturedProduct(product.id, -1)}
                        disabled={i === 0}
                        className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                      >
                        <ArrowUp size={12} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => moveFeaturedProduct(product.id, 1)}
                        disabled={i === selectedFeaturedProducts.length - 1}
                        className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors"
                      >
                        <ArrowDown size={12} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => toggleFeaturedProduct(product.id)}
                        className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
                      >
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── BRANCH LOCATIONS ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Байршил</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                MGL Store app-ийн байршил хэсэгт харагдах салбарууд.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLocations((prev) => !prev)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                showLocations
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {showLocations ? "Идэвхтэй" : "Нуусан"}
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              placeholder="Салбар, байгууллага, хаягаар хайх"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {filteredBranchLocations.length}/{branchLocations.length}
            </span>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {branchLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-8 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Байршил ачаалж байна...
              </div>
            ) : branchError ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-4 text-sm text-rose-600">
                {branchError}
              </div>
            ) : filteredBranchLocations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
                Байршил олдсонгүй
              </div>
            ) : (
              filteredBranchLocations.map((branch) => {
                const lat = branch.latitude ?? branch.lat;
                const lng = branch.longitude ?? branch.lng;
                return (
                  <div
                    key={branch.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {branch.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {branch.address}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} />
                          {branch.organization?.name || "Байгууллага"}
                        </span>
                        {typeof lat === "number" && typeof lng === "number" && (
                          <span>
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                    {branch.mapsUrl && (
                      <a
                        href={branch.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-rose-500"
                      >
                        <Navigation size={14} />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ════════ RIGHT: PHONE PREVIEW ════════ */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Урьдчилж харах
          </p>

          {/* Phone shell */}
          <div className="mx-auto w-[280px] rounded-[2.8rem] bg-gradient-to-b from-slate-800 to-slate-900 p-[5px] shadow-2xl shadow-slate-900/30">
            <div className="rounded-[2.4rem] bg-slate-900 pt-3 pb-2 overflow-hidden">
              {/* Dynamic Island */}
              <div className="mx-auto mb-2 h-[22px] w-[90px] rounded-full bg-black" />

              {/* Screen */}
              <div className="mx-1 rounded-b-[2rem] bg-white overflow-hidden">
                <div
                  className="h-[500px] overflow-y-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {/* App bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-md bg-white/20" />
                      <span className="text-[10px] font-extrabold text-white tracking-wide">
                        MGL Store
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                    </div>
                  </div>

                  {/* Greeting */}
                  <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-amber-50 to-white">
                    <p className="text-[9px] text-slate-400">
                      Сайн байна уу? 👋
                    </p>
                    <p className="text-[11px] font-bold text-slate-800">
                      MGL Store-д тавтай морил
                    </p>
                  </div>

                  {/* Banner */}
                  <div className="px-3 pb-2.5">
                    {banners.length > 0 ? (
                      <div className="relative rounded-2xl overflow-hidden aspect-[2/1] bg-slate-100 shadow-sm">
                        <Image
                          src={banners[previewBannerIdx % banners.length] || ""}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {banners.length > 1 && (
                          <>
                            <button
                              onClick={prevBanner}
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center"
                            >
                              <ChevronLeft size={11} />
                            </button>
                            <button
                              onClick={nextBanner}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center"
                            >
                              <ChevronRight size={11} />
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                              {banners.map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`h-1 rounded-full transition-all ${
                                    idx === previewBannerIdx % banners.length
                                      ? "w-3 bg-white"
                                      : "w-1 bg-white/40"
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 aspect-[2/1] flex flex-col items-center justify-center gap-1 border border-dashed border-slate-200">
                        <ImagePlus size={16} className="text-slate-300" />
                        <span className="text-[9px] text-slate-300 font-medium">
                          Баннер нэмнэ үү
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="px-3 pb-2.5">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
                      <Search size={10} className="text-slate-300" />
                      <span className="text-[9px] text-slate-300">
                        Бараа хайх...
                      </span>
                    </div>
                  </div>

                  {/* Categories */}
                  {selectedCats.length > 0 && (
                    <div className="px-3 pb-3">
                      <p className="text-[9px] font-bold text-slate-500 mb-2">
                        Ангиллууд
                      </p>
                      <div className="flex gap-3 overflow-x-hidden pb-0.5">
                        {selectedCats.slice(0, 5).map((cat) => (
                          <div
                            key={cat.id}
                            className="flex flex-col items-center gap-1 shrink-0 w-[44px]"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-100/50 flex items-center justify-center shadow-sm">
                              <CatIcon icon={cat.icon} size={18} />
                            </div>
                            <span className="text-[7px] font-medium text-slate-500 max-w-[44px] truncate text-center leading-tight">
                              {cat.name}
                            </span>
                          </div>
                        ))}
                        {selectedCats.length > 5 && (
                          <div className="flex flex-col items-center gap-1 shrink-0 w-[44px]">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <Plus size={14} className="text-slate-400" />
                            </div>
                            <span className="text-[7px] font-medium text-slate-400">
                              +{selectedCats.length - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Product skeleton */}
                  <div className="px-3 pb-4">
                    <p className="text-[9px] font-bold text-slate-500 mb-2">
                      Бүтээгдэхүүн
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden"
                        >
                          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50" />
                          <div className="p-2 space-y-1.5">
                            <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
                            <div className="h-1.5 w-3/5 rounded-full bg-slate-100" />
                            <div className="h-2 w-2/5 rounded-full bg-amber-200/60 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Home bar */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-[100px] h-[4px] rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
