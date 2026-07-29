"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Check, Store } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  appendProductVisitorId,
  trackProductInteraction,
} from "@/lib/product-interest";
import { ProductCommandBar } from "./_components/ProductCommandBar";
import {
  CatalogProductCard,
  ProductResultsGrid,
  type ProductSearchSuggestion,
} from "./_components/ProductResultsGrid";
import { ProductSearchHero } from "./_components/ProductSearchHero";
import { ProductMaintenanceState } from "@/components/organisms/commerce/ProductMaintenanceState";

const PRODUCTS_PER_PAGE = 16;
const WEB_PRODUCTS_SETTING_KEY = "web-products-enabled";

type SortKey =
  | "recommended"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "discount"
  | "name_asc";
type StockKey = "all" | "in_stock" | "low_stock" | "sold_out";
type SupplyKey = "all" | "stock" | "preorder";

interface ApiCategory {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  level?: number;
  productCount?: number;
  directProductCount?: number;
  _count?: { products?: number };
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
  marketplacePriority?: number;
  images: { id: string; url: string }[];
  organization: { id: string; name: string; logoUrl?: string | null } | null;
  discounts: { percent: number }[];
  businessCategoryId: string | null;
  businessCategory: {
    id: string;
    name: string;
    slug?: string;
    parent?: { id: string; name: string; slug?: string } | null;
  } | null;
  createdAt: string;
  searchScore?: number;
}

type ProductsApiResponse =
  | ApiProduct[]
  | {
      products?: ApiProduct[];
      total?: number;
      hasMore?: boolean;
      limit?: number;
      offset?: number;
    };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Ерөнхий" },
  { key: "newest", label: "Шинэ эхэнд" },
  { key: "price_asc", label: "Үнэ: багаас их" },
  { key: "price_desc", label: "Үнэ: ихээс бага" },
  { key: "discount", label: "Хямдралтай эхэнд" },
  { key: "name_asc", label: "Нэрээр A-Z" },
];

const STOCK_OPTIONS: { key: StockKey; label: string; description: string }[] = [
  { key: "all", label: "Бүх төлөв", description: "Нөөц харгалзахгүй" },
  { key: "in_stock", label: "Нөөцтэй", description: "Зөвхөн авах боломжтой" },
  {
    key: "low_stock",
    label: "Цөөн үлдсэн",
    description: "5 болон түүнээс бага",
  },
  { key: "sold_out", label: "Дууссан", description: "Нөөцгүй бараа" },
];

const SUPPLY_OPTIONS: { key: SupplyKey; label: string; description: string }[] =
  [
    { key: "all", label: "Бүх бараа", description: "Каталог бүхэлдээ" },
    { key: "stock", label: "Бэлэн бараа", description: "Нөөцтэй бараанууд" },
    {
      key: "preorder",
      label: "Захиалгаар",
      description: "Урьдчилсан захиалгатай бараа",
    },
  ];

const SEARCH_INTENT_SUGGESTIONS: Array<{
  triggers: string[];
  terms: string[];
}> = [
  {
    triggers: ["хоол", "хүнс", "идэх", "уух", "гал тогоо", "cooking", "food"],
    terms: ["Хоол хүнс", "хүнс", "супермаркет", "мини маркет"],
  },
  {
    triggers: ["бэлэг", "төрсөн", "gift"],
    terms: ["бэлэг", "гоо сайхан", "хямдрал"],
  },
  {
    triggers: ["хувцас", "өмд", "цамц", "гутал", "shoe", "shirt"],
    terms: ["хувцас", "гутал", "онлайн дэлгүүр"],
  },
  {
    triggers: ["кофе", "coffee", "ундаа"],
    terms: ["кофе", "ундаа", "супермаркет"],
  },
  {
    triggers: ["гэр", "ахуй", "цэвэрлэгээ"],
    terms: ["гэр ахуй", "цэвэрлэгээ", "мини маркет"],
  },
];

function buildProductsUrl(
  categoryId: string | null,
  search: string,
  supplyType: SupplyKey = "all",
  options: { sort?: SortKey; discountOnly?: boolean; page?: number } = {},
) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  const query = search.trim();
  if (query) params.set("search", query);
  if (supplyType !== "all") params.set("type", supplyType);
  if (options.sort && options.sort !== "recommended")
    params.set("sort", options.sort);
  if (options.discountOnly) params.set("discount", "1");
  if (options.page && options.page > 1)
    params.set("page", String(options.page));
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchSuggestions({
  query,
  categories,
  products,
}: {
  query: string;
  categories: ApiCategory[];
  products: ApiProduct[];
}): ProductSearchSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const suggestions = new Map<string, ProductSearchSuggestion>();
  const add = (suggestion: ProductSearchSuggestion) => {
    const key = `${suggestion.type}:${suggestion.value}`;
    if (!suggestions.has(key)) suggestions.set(key, suggestion);
  };

  for (const category of categories) {
    const categoryText = normalizeSearchText(
      `${category.name} ${category.slug || ""}`,
    );
    if (
      categoryText.includes(normalizedQuery) ||
      normalizedQuery
        .split(" ")
        .some((token) => token.length > 1 && categoryText.includes(token))
    ) {
      add({
        type: "category",
        label: category.name,
        value: category.id,
        description: "Энэ ангиллаар шүүж харах",
      });
    }
  }

  for (const intent of SEARCH_INTENT_SUGGESTIONS) {
    if (
      intent.triggers.some((trigger) =>
        normalizedQuery.includes(normalizeSearchText(trigger)),
      )
    ) {
      for (const term of intent.terms) {
        const matchedCategory = categories.find((category) =>
          normalizeSearchText(category.name).includes(
            normalizeSearchText(term),
          ),
        );
        if (matchedCategory) {
          add({
            type: "category",
            label: matchedCategory.name,
            value: matchedCategory.id,
            description: "Ойролцоо ангилал",
          });
        } else {
          add({
            type: "search",
            label: term,
            value: term,
            description: "Ойролцоо хайлт",
          });
        }
      }
    }
  }

  const productTerms = products
    .flatMap((product) => [
      product.businessCategory?.name,
      product.organization?.name,
      product.name,
    ])
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const normalized = normalizeSearchText(value);
      return normalizedQuery
        .split(" ")
        .some((token) => token.length > 2 && normalized.includes(token));
    })
    .slice(0, 4);

  for (const term of productTerms) {
    add({
      type: "search",
      label: term,
      value: term,
      description: "Каталог дотор ойролцоо үг байна",
    });
  }

  if (suggestions.size === 0) {
    ["хүнс", "супермаркет", "хямдрал"].forEach((term) =>
      add({
        type: "search",
        label: term,
        value: term,
        description: "Түгээмэл хайлт",
      }),
    );
  }

  return [...suggestions.values()].slice(0, 5);
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
  const { user, authFetch } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const searchParam = (
    searchParams.get("search") ??
    searchParams.get("q") ??
    ""
  ).trim();
  const typeParam = searchParams.get("type");
  const sortParam = searchParams.get("sort");
  const discountParam = searchParams.get("discount");
  const pageParam = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const supplyParam: SupplyKey =
    typeParam === "preorder"
      ? "preorder"
      : typeParam === "stock"
        ? "stock"
        : "all";
  const initialSortKey: SortKey = SORT_OPTIONS.some(
    (option) => option.key === sortParam,
  )
    ? (sortParam as SortKey)
    : "recommended";
  const initialDiscountOnly = discountParam === "1" || discountParam === "true";
  const isMember = Boolean(user?.membership?.active || user?.isPrime);

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [webProductsEnabled, setWebProductsEnabled] = useState<boolean | null>(
    null,
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categoryParam,
  );
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [totalProductCount, setTotalProductCount] = useState(0);

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
  const [recommendationSeed] = useState(
    () =>
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [viewMode, setViewMode] = useState<"products" | "stores">("products");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const resolvedCategoryParam = useMemo(() => {
    if (!categoryParam) return null;
    const category = apiCategories.find(
      (c) => c.id === categoryParam || c.slug === categoryParam,
    );
    return category?.id ?? categoryParam;
  }, [apiCategories, categoryParam]);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target as Node)
      ) {
        setFilterPanelOpen(false);
      }
    };
    if (filterPanelOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterPanelOpen]);

  useEffect(() => {
    const loadChromeData = async () => {
      try {
        const [categoryRes, siteSettingsRes] = await Promise.all([
          fetch(`${API}/business-categories?hasProducts=1`),
          fetch(`${API}/site-settings`, { cache: "no-store" }),
        ]);
        if (categoryRes.ok) setApiCategories(await categoryRes.json());
        if (siteSettingsRes.ok) {
          const settings = (await siteSettingsRes.json()) as Record<
            string,
            string
          >;
          const raw = settings[WEB_PRODUCTS_SETTING_KEY];
          setWebProductsEnabled(
            raw === undefined || raw === null || raw === ""
              ? true
              : raw === "1" || raw === "true" || raw === "on",
          );
        } else {
          setWebProductsEnabled(true);
        }
      } catch {
        setWebProductsEnabled(true);
      }
    };
    loadChromeData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeCategory) params.set("businessCategoryId", activeCategory);
        if (selectedOrganization)
          params.set("organizationId", selectedOrganization);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (supplyFilter !== "all") params.set("type", supplyFilter);
        params.set("sort", sortKey);
        if (sortKey === "recommended") {
          params.set("recommendationSeed", recommendationSeed);
        }
        if (discountOnly) params.set("discount", "1");
        if (priceMin) params.set("priceMin", priceMin);
        if (priceMax) params.set("priceMax", priceMax);
        if (stockFilter !== "all") params.set("stock", stockFilter);
        params.set("limit", String(PRODUCTS_PER_PAGE));
        params.set("offset", String((currentPage - 1) * PRODUCTS_PER_PAGE));
        params.set("meta", "1");
        appendProductVisitorId(params);
        const query = params.toString();
        const url = `${API}/products?${query}`;
        const res = await authFetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as ProductsApiResponse;
        const products = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [];
        const total = Array.isArray(data)
          ? data.length
          : (data.total ?? products.length);
        if (cancelled) return;
        setApiProducts(products);
        setTotalProductCount(total);
      } catch {
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [
    activeCategory,
    authFetch,
    currentPage,
    debouncedSearch,
    discountOnly,
    priceMax,
    priceMin,
    recommendationSeed,
    selectedOrganization,
    sortKey,
    stockFilter,
    supplyFilter,
  ]);

  useEffect(() => {
    if (!activeCategory) return;
    trackProductInteraction({
      type: "CATEGORY_VIEW",
      businessCategoryId: activeCategory,
      source: "products-page",
    });
  }, [activeCategory]);

  useEffect(() => {
    if (debouncedSearch.length < 2) return;
    trackProductInteraction({
      type: "SEARCH",
      businessCategoryId: activeCategory,
      searchQuery: debouncedSearch,
      source: "products-page",
    });
  }, [activeCategory, debouncedSearch]);

  useEffect(() => {
    setActiveCategory(resolvedCategoryParam);
    setSearchQuery(searchParam);
    setDebouncedSearch(searchParam);
    setSupplyFilter(supplyParam);
    setSortKey(initialSortKey);
    setDiscountOnly(initialDiscountOnly);
    setCurrentPage(pageParam);
  }, [
    resolvedCategoryParam,
    searchParam,
    supplyParam,
    initialSortKey,
    initialDiscountOnly,
    pageParam,
  ]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setCurrentPage(1);
    router.push(
      buildProductsUrl(catId, searchQuery, supplyFilter, {
        sort: sortKey,
        discountOnly,
      }),
      { scroll: false },
    );
  };

  const handleSupplyClick = (nextSupply: SupplyKey) => {
    setSupplyFilter(nextSupply);
    setCurrentPage(1);
    router.push(
      buildProductsUrl(activeCategory, searchQuery, nextSupply, {
        sort: sortKey,
        discountOnly,
      }),
      { scroll: false },
    );
  };

  const handleSortChange = (nextSort: SortKey) => {
    setSortKey(nextSort);
    setCurrentPage(1);
    router.replace(
      buildProductsUrl(activeCategory, searchQuery, supplyFilter, {
        sort: nextSort,
        discountOnly,
      }),
      { scroll: false },
    );
  };

  const handleDiscountToggle = () => {
    const nextDiscountOnly = !discountOnly;
    setDiscountOnly(nextDiscountOnly);
    setCurrentPage(1);
    router.replace(
      buildProductsUrl(activeCategory, searchQuery, supplyFilter, {
        sort: sortKey,
        discountOnly: nextDiscountOnly,
      }),
      { scroll: false },
    );
  };

  const submitSearch = () => {
    router.replace(
      buildProductsUrl(activeCategory, searchQuery, supplyFilter, {
        sort: sortKey,
        discountOnly,
      }),
      { scroll: false },
    );
  };

  const submitHeroSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedSearch(query);
    setCurrentPage(1);
    router.replace(
      buildProductsUrl(activeCategory, query, supplyFilter, {
        sort: sortKey,
        discountOnly,
      }),
      { scroll: false },
    );
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
    setSortKey("recommended");
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
    sortKey !== "recommended",
  ].filter(Boolean).length;

  const supplyCounts = useMemo(
    () => ({
      all: totalProductCount,
      stock: apiProducts.filter((p) => p.supplyType !== "CHINA_PREORDER")
        .length,
      preorder: apiProducts.filter((p) => p.supplyType === "CHINA_PREORDER")
        .length,
    }),
    [apiProducts, totalProductCount],
  );

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

    return [...byId.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [apiProducts]);

  const processedProducts = apiProducts;

  const totalPages = Math.max(
    1,
    Math.ceil(totalProductCount / PRODUCTS_PER_PAGE),
  );

  const displayProducts = processedProducts;

  const goToPage = (p: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, p));
    setCurrentPage(nextPage);
    router.push(
      buildProductsUrl(activeCategory, searchQuery, supplyFilter, {
        sort: sortKey,
        discountOnly,
        page: nextPage,
      }),
      { scroll: false },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeOrganizationName = availableOrganizations.find(
    (org) => org.id === selectedOrganization,
  )?.name;
  const activeSupplyName = SUPPLY_OPTIONS.find(
    (option) => option.key === supplyFilter,
  )?.label;
  const searchSuggestions = useMemo(
    () =>
      buildSearchSuggestions({
        query: searchQuery,
        categories: apiCategories,
        products: apiProducts,
      }),
    [apiCategories, apiProducts, searchQuery],
  );
  const handleSearchSuggestionClick = (suggestion: ProductSearchSuggestion) => {
    setCurrentPage(1);
    if (suggestion.type === "category") {
      setSearchQuery("");
      setDebouncedSearch("");
      setActiveCategory(suggestion.value);
      router.replace(
        buildProductsUrl(suggestion.value, "", supplyFilter, {
          sort: sortKey,
          discountOnly,
        }),
        { scroll: false },
      );
      return;
    }
    setSearchQuery(suggestion.value);
    setDebouncedSearch(suggestion.value);
    router.replace(
      buildProductsUrl(activeCategory, suggestion.value, supplyFilter, {
        sort: sortKey,
        discountOnly,
      }),
      { scroll: false },
    );
  };

  // Price bounds for hints
  const prices = apiProducts.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  if (webProductsEnabled === false) {
    return <ProductMaintenanceState onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <ProductSearchHero
        categories={apiCategories}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        total={totalProductCount}
        onCategoryClick={handleCategoryClick}
        onSearchSubmit={submitHeroSearch}
        showSearch={false}
      />

      <ProductCommandBar
        total={totalProductCount}
        activeFilterCount={activeFilterCount}
        sortOptions={SORT_OPTIONS}
        sortKey={sortKey}
        supplyOptions={SUPPLY_OPTIONS}
        supplyFilter={supplyFilter}
        supplyCounts={supplyCounts}
        discountOnly={discountOnly}
        filterPanelOpen={filterPanelOpen}
        onSortChange={handleSortChange}
        onSupplyClick={handleSupplyClick}
        onDiscountToggle={handleDiscountToggle}
        onToggleFilters={() => setFilterPanelOpen((value) => !value)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div
        className="container relative mx-auto px-4 lg:px-8"
        ref={filterPanelRef}
      >
        {filterPanelOpen && (
          <div className="absolute right-4 top-2 z-50 max-h-[75vh] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-950">
                Шүүлт & Эрэмбэ
              </span>
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
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Дэлгүүр
                </p>
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
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Нөөц
                </p>
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
                        {stockFilter === option.key && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {option.label}
                      </span>
                      <span
                        className={`mt-1 block text-[11px] ${
                          stockFilter === option.key
                            ? "text-white/70"
                            : "text-slate-400"
                        }`}
                      >
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Үнийн хязгаар
                </p>
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
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Идэвхтэй:
            </span>
            {sortKey !== "recommended" && (
              <FilterChip
                label={
                  SORT_OPTIONS.find((option) => option.key === sortKey)?.label
                }
                onClear={() => handleSortChange("recommended")}
              />
            )}
            {discountOnly && (
              <FilterChip label="Хямдралтай" onClear={handleDiscountToggle} />
            )}
            {(priceMin !== "" || priceMax !== "") && (
              <FilterChip
                label={`₮${priceMin || "0"} - ₮${priceMax || "∞"}`}
                onClear={() => {
                  setPriceMin("");
                  setPriceMax("");
                }}
              />
            )}
            {selectedOrganization && (
              <FilterChip
                label={activeOrganizationName}
                onClear={() => setSelectedOrganization("")}
              />
            )}
            {stockFilter !== "all" && (
              <FilterChip
                label={
                  STOCK_OPTIONS.find((option) => option.key === stockFilter)
                    ?.label
                }
                onClear={() => setStockFilter("all")}
              />
            )}
            {supplyFilter !== "all" && (
              <FilterChip
                label={activeSupplyName}
                onClear={() => handleSupplyClick("all")}
              />
            )}
            {searchQuery && (
              <FilterChip
                label={`"${searchQuery}"`}
                onClear={() => {
                  setSearchQuery("");
                  setDebouncedSearch("");
                  setCurrentPage(1);
                  router.replace(
                    buildProductsUrl(activeCategory, "", supplyFilter, {
                      sort: sortKey,
                      discountOnly,
                    }),
                    { scroll: false },
                  );
                }}
              />
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-bold text-slate-400 underline hover:text-slate-950"
            >
              Бүгдийг арилгах
            </button>
          </div>
        )}

        {!productsLoading &&
          processedProducts.length === 0 &&
          searchSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-500">
                Санал:
              </span>
              {searchSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => handleSearchSuggestionClick(suggestion)}
                  className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95 hover:text-orange-600 hover:ring-orange-200"
                >
                  <span className="truncate">{suggestion.label}</span>
                  <span className="text-[10px] text-slate-400">
                    {suggestion.type === "category" ? "ангилал" : "хайлт"}
                  </span>
                </button>
              ))}
            </div>
          )}
      </div>

      <div className="container mx-auto px-4 pb-12 pt-5 lg:px-8">
        {viewMode === "stores" ? (
          <OrganizationProductGrid
            products={displayProducts}
            loading={productsLoading}
            isMember={isMember}
          />
        ) : (
          <ProductResultsGrid
            products={displayProducts}
            loading={productsLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalProducts={totalProductCount}
            pageSize={PRODUCTS_PER_PAGE}
            hasActiveFilters={activeFilterCount > 0}
            isMember={isMember}
            searchQuery={searchQuery}
            suggestions={searchSuggestions}
            onClearFilters={clearFilters}
            onSuggestionClick={handleSearchSuggestionClick}
            onPageChange={goToPage}
          />
        )}
      </div>
    </div>
  );
}

function OrganizationProductGrid({
  products,
  loading,
  isMember,
}: {
  products: ApiProduct[];
  loading: boolean;
  isMember: boolean;
}) {
  const organizations = useMemo(() => {
    const grouped = new Map<
      string,
      {
        organization: NonNullable<ApiProduct["organization"]>;
        products: ApiProduct[];
      }
    >();

    products.forEach((product) => {
      if (!product.organization) return;
      const existing = grouped.get(product.organization.id);
      if (existing) {
        existing.products.push(product);
        return;
      }
      grouped.set(product.organization.id, {
        organization: product.organization,
        products: [product],
      });
    });

    return [...grouped.values()];
  }, [products]);

  if (loading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 py-20 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm font-black text-slate-600">
          Бараа нийтэлсэн байгууллага олдсонгүй
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border-y border-slate-100">
      {organizations.map(({ organization, products: organizationProducts }) => (
        <section
          key={organization.id}
          className="grid gap-6 py-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8"
        >
          <div className="lg:sticky lg:top-56 lg:self-start">
            <div className="flex items-center gap-3">
              {organization.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={organization.logoUrl}
                  alt=""
                  className="h-14 w-14 rounded-2xl border border-slate-100 object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Store className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-slate-950">
                  {organization.name}
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {organizationProducts.length} бүтээгдэхүүн
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ...new Set(
                  organizationProducts
                    .map((product) => product.businessCategory?.name)
                    .filter((name): name is string => Boolean(name)),
                ),
              ]
                .slice(0, 3)
                .map((category) => (
                  <span
                    key={category}
                    className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500"
                  >
                    {category}
                  </span>
                ))}
            </div>
          </div>

          <div className="grid gap-x-4 gap-y-7 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
            {organizationProducts.slice(0, 5).map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                isMember={isMember}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label?: string;
  onClear: () => void;
}) {
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
