"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { API } from "@/lib/api";
import type {
  MarketplaceProjectBanner,
  MarketplaceServicesPromo,
  MarketplaceSideBanner,
} from "@/components/organisms/commerce/MarketplaceBoard";
import { ProductCommandBar } from "./_components/ProductCommandBar";
import { ProductResultsGrid } from "./_components/ProductResultsGrid";
import { ProductSearchHero } from "./_components/ProductSearchHero";

const PRODUCTS_PER_PAGE = 16;
const MARKETPLACE_SIDE_BANNER_KEY = "marketplace-side-banner";
const MARKETPLACE_SERVICES_PROMO_KEY = "marketplace-services-promo";

type SortKey = "newest" | "price_asc" | "price_desc" | "discount" | "name_asc";
type StockKey = "all" | "in_stock" | "low_stock" | "sold_out";
type SupplyKey = "all" | "stock" | "preorder";

interface ApiCategory {
  id: string;
  name: string;
  slug?: string;
}

interface ApiProduct {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  stock?: number;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  preorderNote?: string | null;
  images: { id: string; url: string }[];
  organization: { id: string; name: string; logoUrl?: string | null } | null;
  discounts: { percent: number }[];
  businessCategoryId: string | null;
  businessCategory: { id: string; name: string; slug?: string } | null;
  createdAt: string;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Шинэ эхэнд" },
  { key: "price_asc", label: "Үнэ: багаас их" },
  { key: "price_desc", label: "Үнэ: ихээс бага" },
  { key: "discount", label: "Хямдралтай эхэнд" },
  { key: "name_asc", label: "Нэрээр A-Z" },
];

const STOCK_OPTIONS: { key: StockKey; label: string; description: string }[] = [
  { key: "all", label: "Бүх төлөв", description: "Нөөц харгалзахгүй" },
  { key: "in_stock", label: "Нөөцтэй", description: "Зөвхөн авах боломжтой" },
  { key: "low_stock", label: "Цөөн үлдсэн", description: "5 болон түүнээс бага" },
  { key: "sold_out", label: "Дууссан", description: "Нөөцгүй бараа" },
];

const SUPPLY_OPTIONS: { key: SupplyKey; label: string; description: string }[] = [
  { key: "all", label: "Бүх бараа", description: "Каталог бүхэлдээ" },
  { key: "stock", label: "Бэлэн бараа", description: "Нөөцтэй бараанууд" },
  { key: "preorder", label: "Захиалгаар", description: "Урьдчилсан захиалгатай бараа" },
];

function buildProductsUrl(categoryId: string | null, search: string, supplyType: SupplyKey = "all") {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  const query = search.trim();
  if (query) params.set("search", query);
  if (supplyType !== "all") params.set("type", supplyType);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

function parseSideBanner(raw?: string): MarketplaceSideBanner | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      isActive: parsed.isActive !== false,
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || ""),
      title: String(parsed.title || ""),
      subtitle: String(parsed.subtitle || ""),
      cta: String(parsed.cta || ""),
      href: String(parsed.href || ""),
    };
  } catch {
    return null;
  }
}

function parseServicesPromo(raw?: string): MarketplaceServicesPromo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || ""),
      title: String(parsed.title || ""),
      subtitle: String(parsed.subtitle || ""),
      cta: String(parsed.cta || ""),
    };
  } catch {
    return null;
  }
}

function resolveProjectBanners(projects: unknown[]): MarketplaceProjectBanner[] {
  const banners: MarketplaceProjectBanner[] = [];

  for (const project of projects) {
    if (!project || typeof project !== "object") continue;
    const item = project as {
      id?: unknown;
      title?: unknown;
      summary?: unknown;
      imageUrl?: unknown;
      imageUrls?: unknown;
      isActive?: unknown;
    };
    if (item.isActive === false) continue;

    const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
    const image = [...imageUrls, item.imageUrl]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);

    if (!image) continue;

    banners.push({
      id: String(item.id || image),
      title: String(item.title || "MGL Store төсөл"),
      summary: typeof item.summary === "string" ? item.summary : undefined,
      imageUrl: image,
    });

    if (banners.length >= 4) break;
  }

  return banners;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const searchParam = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();
  const typeParam = searchParams.get("type");
  const sortParam = searchParams.get("sort");
  const discountParam = searchParams.get("discount");
  const supplyParam: SupplyKey =
    typeParam === "preorder" ? "preorder" : typeParam === "stock" ? "stock" : "all";
  const initialSortKey: SortKey = SORT_OPTIONS.some((option) => option.key === sortParam)
    ? (sortParam as SortKey)
    : "newest";
  const initialDiscountOnly = discountParam === "1" || discountParam === "true";

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [sideBanner, setSideBanner] = useState<MarketplaceSideBanner | null>(null);
  const [servicesPromo, setServicesPromo] = useState<MarketplaceServicesPromo | null>(null);
  const [projectBanners, setProjectBanners] = useState<MarketplaceProjectBanner[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Sort state
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(initialDiscountOnly);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [stockFilter, setStockFilter] = useState<StockKey>("all");
  const [supplyFilter, setSupplyFilter] = useState<SupplyKey>(supplyParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const resolvedCategoryParam = useMemo(() => {
    if (!categoryParam) return null;
    const category = apiCategories.find((c) => c.id === categoryParam || c.slug === categoryParam);
    return category?.id ?? categoryParam;
  }, [apiCategories, categoryParam]);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterPanelOpen(false);
      }
    };
    if (filterPanelOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterPanelOpen]);

  useEffect(() => {
    const loadChromeData = async () => {
      try {
        const [categoryRes, settingsRes, projectRes] = await Promise.all([
          fetch(`${API}/business-categories`),
          fetch(`${API}/site-settings`),
          fetch(`${API}/site-settings/projects`),
        ]);
        if (categoryRes.ok) setApiCategories(await categoryRes.json());
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setSideBanner(parseSideBanner(settings?.[MARKETPLACE_SIDE_BANNER_KEY]));
          setServicesPromo(parseServicesPromo(settings?.[MARKETPLACE_SERVICES_PROMO_KEY]));
        }
        if (projectRes.ok) {
          const data = await projectRes.json();
          setProjectBanners(resolveProjectBanners(Array.isArray(data?.projects) ? data.projects : []));
        }
      } catch {}
    };
    loadChromeData();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeCategory) params.set("businessCategoryId", activeCategory);
        if (debouncedSearch) params.set("search", debouncedSearch);
        const query = params.toString();
        const url = `${API}/products${query ? `?${query}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setApiProducts(Array.isArray(data) ? data : []);
        }
      } catch {}
      finally { setProductsLoading(false); }
    };
    loadProducts();
  }, [activeCategory, debouncedSearch]);

  useEffect(() => {
    setActiveCategory(resolvedCategoryParam);
    setSearchQuery(searchParam);
    setDebouncedSearch(searchParam);
    setSupplyFilter(supplyParam);
    setSortKey(initialSortKey);
    setDiscountOnly(initialDiscountOnly);
    setCurrentPage(1);
  }, [resolvedCategoryParam, searchParam, supplyParam, initialSortKey, initialDiscountOnly]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setCurrentPage(1);
    router.push(buildProductsUrl(catId, searchQuery, supplyFilter), { scroll: false });
  };

  const handleSupplyClick = (nextSupply: SupplyKey) => {
    setSupplyFilter(nextSupply);
    setCurrentPage(1);
    router.push(buildProductsUrl(activeCategory, searchQuery, nextSupply), { scroll: false });
  };

  const submitSearch = () => {
    router.replace(buildProductsUrl(activeCategory, searchQuery, supplyFilter), { scroll: false });
  };

  const clearFilters = () => {
    setDiscountOnly(false);
    setPriceMin("");
    setPriceMax("");
    setSelectedOrganization("");
    setStockFilter("all");
    setSupplyFilter("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setSortKey("newest");
    setCurrentPage(1);
    router.replace(buildProductsUrl(activeCategory, ""), { scroll: false });
  };

  const activeFilterCount = [
    discountOnly,
    priceMin !== "",
    priceMax !== "",
    selectedOrganization !== "",
    stockFilter !== "all",
    supplyFilter !== "all",
    searchQuery !== "",
    sortKey !== "newest",
  ].filter(Boolean).length;

  const supplyCounts = useMemo(() => ({
    all: apiProducts.length,
    stock: apiProducts.filter((p) => p.supplyType !== "CHINA_PREORDER").length,
    preorder: apiProducts.filter((p) => p.supplyType === "CHINA_PREORDER").length,
  }), [apiProducts]);

  const availableOrganizations = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();

    for (const product of apiProducts) {
      if (!product.organization) continue;
      const current = byId.get(product.organization.id);
      byId.set(product.organization.id, {
        id: product.organization.id,
        name: product.organization.name,
        count: (current?.count ?? 0) + 1,
      });
    }

    return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [apiProducts]);

  // Apply filters + sort client-side
  const processedProducts = useMemo(() => {
    let list = [...apiProducts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          [
            p.name,
            p.description,
            p.sku,
            p.barcode,
            p.organization?.name,
            p.businessCategory?.name,
            p.businessCategory?.slug,
          ].some((value) => value?.toLowerCase().includes(q))
      );
    }

    // Discount only
    if (discountOnly) {
      list = list.filter((p) => p.discounts.length > 0);
    }

    if (selectedOrganization) {
      list = list.filter((p) => p.organization?.id === selectedOrganization);
    }

    if (supplyFilter === "stock") {
      list = list.filter((p) => p.supplyType !== "CHINA_PREORDER");
    } else if (supplyFilter === "preorder") {
      list = list.filter((p) => p.supplyType === "CHINA_PREORDER");
    }

    if (stockFilter === "in_stock") {
      list = list.filter((p) => p.supplyType === "CHINA_PREORDER" || (p.stock ?? 0) > 0);
    } else if (stockFilter === "low_stock") {
      list = list.filter((p) => {
        const stock = p.stock ?? 0;
        return p.supplyType !== "CHINA_PREORDER" && stock > 0 && stock <= 5;
      });
    } else if (stockFilter === "sold_out") {
      list = list.filter((p) => p.supplyType !== "CHINA_PREORDER" && (p.stock ?? 0) <= 0);
    }

    // Price range
    const min = priceMin !== "" ? parseFloat(priceMin) : null;
    const max = priceMax !== "" ? parseFloat(priceMax) : null;
    if (min !== null) list = list.filter((p) => p.price >= min);
    if (max !== null) list = list.filter((p) => p.price <= max);

    // Sort
    switch (sortKey) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "discount":
        list.sort((a, b) => (b.discounts[0]?.percent ?? 0) - (a.discounts[0]?.percent ?? 0));
        break;
      case "name_asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return list;
  }, [apiProducts, searchQuery, discountOnly, selectedOrganization, supplyFilter, stockFilter, priceMin, priceMax, sortKey]);

  const totalPages = Math.max(1, Math.ceil(processedProducts.length / PRODUCTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [processedProducts.length, discountOnly, priceMin, priceMax, selectedOrganization, supplyFilter, stockFilter, sortKey]);

  const displayProducts = processedProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );

  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeOrganizationName = availableOrganizations.find((org) => org.id === selectedOrganization)?.name;
  const activeSupplyName = SUPPLY_OPTIONS.find((option) => option.key === supplyFilter)?.label;

  // Price bounds for hints
  const prices = apiProducts.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="min-h-screen bg-white">
      <ProductSearchHero
        categories={apiCategories}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        total={processedProducts.length}
        products={apiProducts}
        onCategoryClick={handleCategoryClick}
        sideBanner={sideBanner}
        servicesPromo={servicesPromo}
        projectBanners={projectBanners}
      />

      <ProductCommandBar
        total={processedProducts.length}
        activeFilterCount={activeFilterCount}
        sortOptions={SORT_OPTIONS}
        sortKey={sortKey}
        supplyOptions={SUPPLY_OPTIONS}
        supplyFilter={supplyFilter}
        supplyCounts={supplyCounts}
        discountOnly={discountOnly}
        filterPanelOpen={filterPanelOpen}
        onSortChange={(key) => {
          setSortKey(key);
          setCurrentPage(1);
        }}
        onSupplyClick={handleSupplyClick}
        onDiscountToggle={() => {
          setDiscountOnly((value) => !value);
          setCurrentPage(1);
        }}
        onToggleFilters={() => setFilterPanelOpen((value) => !value)}
      />

      <div className="container relative mx-auto px-4 lg:px-8" ref={filterPanelRef}>
        {filterPanelOpen && (
          <div className="absolute right-4 top-2 z-50 max-h-[75vh] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-950">Шүүлт & Эрэмбэ</span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-slate-400 underline transition hover:text-slate-950"
              >
                Цэвэрлэх
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Дэлгүүр</p>
                <select
                  value={selectedOrganization}
                  onChange={(event) => {
                    setSelectedOrganization(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400"
                >
                  <option value="">Бүх дэлгүүр</option>
                  {availableOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Нөөц</p>
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setStockFilter(option.key);
                        setCurrentPage(1);
                      }}
                      className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${
                        stockFilter === option.key
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 text-slate-700 hover:border-orange-200"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-black">
                        {stockFilter === option.key && <Check className="h-3.5 w-3.5" />}
                        {option.label}
                      </span>
                      <span className={`mt-1 block text-[11px] ${
                        stockFilter === option.key ? "text-white/70" : "text-slate-400"
                      }`}>
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Үнийн хязгаар</p>
                {maxPrice > 0 && (
                  <p className="mb-2 text-[11px] font-semibold text-slate-400">
                    ₮{minPrice.toLocaleString()} - ₮{maxPrice.toLocaleString()}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Доод"
                    value={priceMin}
                    min={0}
                    onChange={(event) => {
                      setPriceMin(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-orange-400"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="number"
                    placeholder="Дээд"
                    value={priceMax}
                    min={0}
                    onChange={(event) => {
                      setPriceMax(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                className="h-11 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-500"
              >
                Хэрэглэх
              </button>
            </div>
          </div>
        )}

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Идэвхтэй:</span>
            {sortKey !== "newest" && (
              <FilterChip label={SORT_OPTIONS.find((option) => option.key === sortKey)?.label} onClear={() => setSortKey("newest")} />
            )}
            {discountOnly && (
              <FilterChip label="Хямдралтай" onClear={() => setDiscountOnly(false)} />
            )}
            {(priceMin !== "" || priceMax !== "") && (
              <FilterChip label={`₮${priceMin || "0"} - ₮${priceMax || "∞"}`} onClear={() => { setPriceMin(""); setPriceMax(""); }} />
            )}
            {selectedOrganization && (
              <FilterChip label={activeOrganizationName} onClear={() => setSelectedOrganization("")} />
            )}
            {stockFilter !== "all" && (
              <FilterChip label={STOCK_OPTIONS.find((option) => option.key === stockFilter)?.label} onClear={() => setStockFilter("all")} />
            )}
            {supplyFilter !== "all" && (
              <FilterChip label={activeSupplyName} onClear={() => handleSupplyClick("all")} />
            )}
            {searchQuery && (
              <FilterChip
                label={`"${searchQuery}"`}
                onClear={() => {
                  setSearchQuery("");
                  setDebouncedSearch("");
                  setCurrentPage(1);
                  router.replace(buildProductsUrl(activeCategory, "", supplyFilter), { scroll: false });
                }}
              />
            )}
            <button type="button" onClick={clearFilters} className="text-[11px] font-bold text-slate-400 underline hover:text-slate-950">
              Бүгдийг арилгах
            </button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 pb-12 pt-4 lg:px-8">
        <ProductResultsGrid
          products={displayProducts}
          loading={productsLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalProducts={processedProducts.length}
          pageSize={PRODUCTS_PER_PAGE}
          hasActiveFilters={activeFilterCount > 0}
          onClearFilters={clearFilters}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label?: string; onClear: () => void }) {
  if (!label) return null;

  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-slate-400 transition hover:text-slate-950"
        aria-label={`${label} шүүлтийг арилгах`}
      >
        ×
      </button>
    </span>
  );
}
