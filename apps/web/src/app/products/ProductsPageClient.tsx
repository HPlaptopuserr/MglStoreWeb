"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ShoppingBag,
  Star,
  Store,
  Users,
} from "lucide-react";
import { useInfiniteScroll } from "@mgl/ui";
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
import {
  LOCAL_MOCK_CATALOG_ENABLED,
  localCatalogOrganizations,
  queryLocalCatalog,
} from "@/lib/local-product-catalog";

const PRODUCTS_PER_PAGE = 30;
const ORGANIZATION_PRODUCTS_BATCH_SIZE = 15;
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

export interface ApiCategory {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  level?: number;
  productCount?: number;
  directProductCount?: number;
  _count?: { products?: number };
}

export interface ApiProduct {
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
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    soldCount?: number | null;
    customerCount?: string | null;
    productCount?: number;
  } | null;
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

type OrganizationCatalogResponse = {
  organizations?: Array<{
    organization: NonNullable<ApiProduct["organization"]>;
    products: ApiProduct[];
  }>;
};

export interface ProductsPageInitialData {
  categories: ApiCategory[];
  products: ApiProduct[];
  total: number;
  webProductsEnabled: boolean;
  recommendationSeed: string;
}

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
  options: { sort?: SortKey; discountOnly?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  const query = search.trim();
  if (query) params.set("search", query);
  if (supplyType !== "all") params.set("type", supplyType);
  if (options.sort && options.sort !== "recommended")
    params.set("sort", options.sort);
  if (options.discountOnly) params.set("discount", "1");
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

function prioritizeCatalogReadyProducts(products: ApiProduct[]) {
  return products
    .map((product, originalIndex) => ({ product, originalIndex }))
    .sort((left, right) => {
      const leftHasImage = Boolean(left.product.images?.[0]?.url?.trim());
      const rightHasImage = Boolean(right.product.images?.[0]?.url?.trim());
      const leftIsCatalogReady = leftHasImage && left.product.price >= 100;
      const rightIsCatalogReady = rightHasImage && right.product.price >= 100;
      if (leftIsCatalogReady !== rightIsCatalogReady) {
        return rightIsCatalogReady ? 1 : -1;
      }

      // Preserve the selected server-side sort inside each readiness group.
      return left.originalIndex - right.originalIndex;
    })
    .map(({ product }) => product);
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

export default function ProductsPage({
  initialData,
}: {
  initialData?: ProductsPageInitialData;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
      }
    >
      <ProductsContent initialData={initialData} />
    </Suspense>
  );
}

function ProductsContent({
  initialData,
}: {
  initialData?: ProductsPageInitialData;
}) {
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

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>(
    initialData?.categories ?? [],
  );
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>(
    initialData?.products ?? [],
  );
  const [productsLoading, setProductsLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(
    null,
  );
  const [webProductsEnabled, setWebProductsEnabled] = useState<boolean | null>(
    initialData?.webProductsEnabled ?? null,
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categoryParam,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [retryNonce, setRetryNonce] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(
    initialData?.total ?? 0,
  );

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
      initialData?.recommendationSeed ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [viewMode, setViewMode] = useState<"products" | "stores">("products");
  const [organizationProducts, setOrganizationProducts] = useState<
    ApiProduct[]
  >([]);
  const [organizationProductsLoading, setOrganizationProductsLoading] =
    useState(false);
  const [organizationProductsError, setOrganizationProductsError] = useState<
    string | null
  >(null);
  const [organizationProductsRetry, setOrganizationProductsRetry] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const skipInitialProductFetchRef = useRef(Boolean(initialData));

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
    if (initialData) return;
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
  }, [initialData]);

  useEffect(() => {
    if (skipInitialProductFetchRef.current) {
      skipInitialProductFetchRef.current = false;
      return;
    }
    let cancelled = false;

    const loadProducts = async () => {
      const isFirstBatch = currentPage === 1;
      setProductsLoadError(null);
      if (isFirstBatch) setProductsLoading(true);
      else setLoadingMore(true);
      try {
        if (LOCAL_MOCK_CATALOG_ENABLED) {
          const data = queryLocalCatalog({
            businessCategoryId: activeCategory,
            organizationId: selectedOrganization,
            search: debouncedSearch,
            type: supplyFilter,
            sort: sortKey,
            discountOnly,
            priceMin: priceMin ? Number(priceMin) : undefined,
            priceMax: priceMax ? Number(priceMax) : undefined,
            stock: stockFilter,
            limit: PRODUCTS_PER_PAGE,
            offset: (currentPage - 1) * PRODUCTS_PER_PAGE,
          });
          if (cancelled) return;
          setApiProducts((current) => {
            if (isFirstBatch) return data.products;
            const byId = new Map(
              current.map((product) => [product.id, product]),
            );
            data.products.forEach((product) => byId.set(product.id, product));
            return [...byId.values()];
          });
          setTotalProductCount(data.total);
          return;
        }

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
        if (!res.ok) {
          throw new Error(`Products request failed with ${res.status}`);
        }
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
        setApiProducts((current) => {
          if (isFirstBatch) return products;
          const byId = new Map(current.map((product) => [product.id, product]));
          products.forEach((product) => byId.set(product.id, product));
          return [...byId.values()];
        });
        setTotalProductCount(total);
      } catch {
        if (!cancelled) {
          setProductsLoadError(
            "Бараануудыг ачаалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.",
          );
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
          setLoadingMore(false);
        }
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
    retryNonce,
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
    setCurrentPage(1);
  }, [
    resolvedCategoryParam,
    searchParam,
    supplyParam,
    initialSortKey,
    initialDiscountOnly,
  ]);

  const hasMoreProducts = apiProducts.length < totalProductCount;

  const loadMoreRef = useInfiniteScroll({
    enabled:
      viewMode === "products" &&
      !productsLoading &&
      !loadingMore &&
      !productsLoadError &&
      hasMoreProducts,
    onLoadMore: () => setCurrentPage((page) => page + 1),
  });

  useEffect(() => {
    if (viewMode !== "stores") return;
    let cancelled = false;

    const loadOrganizationCatalog = async () => {
      setOrganizationProducts([]);
      setOrganizationProductsError(null);
      setOrganizationProductsLoading(true);

      try {
        if (LOCAL_MOCK_CATALOG_ENABLED) {
          const products = localCatalogOrganizations.flatMap((organization) => {
            const batch = queryLocalCatalog({
              organizationId: organization.id,
              sort: "newest",
              limit: ORGANIZATION_PRODUCTS_BATCH_SIZE,
              offset: 0,
            });
            return batch.products.map((product) => ({
              ...product,
              organization: {
                ...product.organization,
                productCount: batch.total,
              },
            }));
          });
          if (cancelled) return;
          setOrganizationProducts(products);
          return;
        }

        const params = new URLSearchParams({
          limit: String(ORGANIZATION_PRODUCTS_BATCH_SIZE),
        });
        appendProductVisitorId(params);
        const response = await authFetch(
          `${API}/products/organization-catalog?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error(
            `Organization catalog failed with ${response.status}`,
          );
        }
        const payload = (await response.json()) as OrganizationCatalogResponse;
        const products = (payload.organizations ?? []).flatMap((row) =>
          row.products.map((product) => ({
            ...product,
            organization: row.organization,
          })),
        );
        if (!cancelled) setOrganizationProducts(products);
      } catch {
        if (!cancelled) {
          setOrganizationProductsError(
            "Online shop байгууллагуудын барааг бүрэн ачаалж чадсангүй.",
          );
        }
      } finally {
        if (!cancelled) setOrganizationProductsLoading(false);
      }
    };

    loadOrganizationCatalog();
    return () => {
      cancelled = true;
    };
  }, [authFetch, organizationProductsRetry, viewMode]);

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

  const displayProducts = useMemo(
    () => prioritizeCatalogReadyProducts(apiProducts),
    [apiProducts],
  );

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
        total={
          viewMode === "stores"
            ? organizationProducts.length
            : totalProductCount
        }
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
          displayProducts.length === 0 &&
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
            products={organizationProducts}
            loading={organizationProductsLoading}
            error={organizationProductsError}
            isMember={isMember}
            onRetry={() => setOrganizationProductsRetry((value) => value + 1)}
          />
        ) : (
          <ProductResultsGrid
            products={displayProducts}
            loading={productsLoading}
            hasActiveFilters={activeFilterCount > 0}
            isMember={isMember}
            searchQuery={searchQuery}
            suggestions={searchSuggestions}
            onClearFilters={clearFilters}
            onSuggestionClick={handleSearchSuggestionClick}
          />
        )}
        {viewMode === "products" && (
          <div
            ref={loadMoreRef}
            className="flex min-h-24 items-center justify-center py-6"
            aria-live="polite"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
                Бараа ачаалж байна…
              </div>
            ) : productsLoadError ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-semibold text-rose-600">
                  {productsLoadError}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryNonce((value) => value + 1)}
                  className="h-10 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-orange-500"
                >
                  Дахин оролдох
                </button>
              </div>
            ) : hasMoreProducts ? (
              <span className="sr-only">Дараагийн бараануудыг ачаалах цэг</span>
            ) : displayProducts.length > 0 ? (
              <p className="text-xs font-bold text-slate-400">
                {totalProductCount.toLocaleString()} барааг бүгдийг үзүүллээ
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function OrganizationProductGrid({
  products,
  loading,
  error,
  isMember,
  onRetry,
}: {
  products: ApiProduct[];
  loading: boolean;
  error: string | null;
  isMember: boolean;
  onRetry: () => void;
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

    return [...grouped.values()].sort(
      (left, right) =>
        right.products.length - left.products.length ||
        left.organization.name.localeCompare(right.organization.name),
    );
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

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 px-5 py-14 text-center">
        <p className="text-sm font-bold text-rose-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-10 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-orange-500"
        >
          Дахин оролдох
        </button>
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
    <div>
      <div className="mb-5 flex flex-col gap-1 rounded-2xl border border-orange-100 bg-orange-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Online shop байгууллагууд
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Ангиллын шүүлтээс үл хамааран бүх public барааг байгууллагаар
            харуулж байна.
          </p>
        </div>
        <p className="mt-2 shrink-0 text-sm font-black text-orange-600 sm:mt-0">
          {organizations.length} байгууллага ·{" "}
          {products.length.toLocaleString()} бараа
        </p>
      </div>
      <div className="divide-y divide-slate-100 border-y border-slate-100">
        {organizations.map(
          ({ organization, products: organizationProducts }) => (
            <OrganizationProductRow
              key={organization.id}
              organization={organization}
              products={organizationProducts}
              isMember={isMember}
            />
          ),
        )}
      </div>
    </div>
  );
}

function OrganizationProductRow({
  organization,
  products: initialProducts,
  isMember,
}: {
  organization: NonNullable<ApiProduct["organization"]>;
  products: ApiProduct[];
  isMember: boolean;
}) {
  const { authFetch } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const [products, setProducts] = useState(initialProducts);
  const [loadingMore, setLoadingMore] = useState(false);
  const totalProducts = organization.productCount ?? initialProducts.length;
  const hasMore = products.length < totalProducts;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(
    initialProducts.length > 4 || hasMore,
  );

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const loadMoreProducts = async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      let nextProducts: ApiProduct[] = [];
      if (LOCAL_MOCK_CATALOG_ENABLED) {
        nextProducts = queryLocalCatalog({
          organizationId: organization.id,
          sort: "newest",
          limit: ORGANIZATION_PRODUCTS_BATCH_SIZE,
          offset: products.length,
        }).products;
      } else {
        const params = new URLSearchParams({
          organizationId: organization.id,
          limit: String(ORGANIZATION_PRODUCTS_BATCH_SIZE),
          offset: String(products.length),
          meta: "1",
          sort: "newest",
        });
        appendProductVisitorId(params);
        const response = await authFetch(
          `${API}/products?${params.toString()}`,
        );
        if (!response.ok) return;
        const payload = (await response.json()) as ProductsApiResponse;
        nextProducts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.products)
            ? payload.products
            : [];
      }
      setProducts((current) => {
        const unique = new Map(
          [...current, ...nextProducts].map((product) => [product.id, product]),
        );
        return [...unique.values()];
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const syncScrollButtons = () => {
    const node = scrollRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(
      node.scrollLeft + node.clientWidth < node.scrollWidth - 8 || hasMore,
    );
    if (
      node.scrollLeft + node.clientWidth >= node.scrollWidth - 420 &&
      hasMore &&
      !loadingMore
    ) {
      void loadMoreProducts();
    }
  };

  const scrollProducts = async (direction: "left" | "right") => {
    const node = scrollRef.current;
    if (!node) return;
    if (
      direction === "right" &&
      node.scrollLeft + node.clientWidth >= node.scrollWidth - 420
    ) {
      await loadMoreProducts();
    }
    node.scrollBy({
      left:
        direction === "left"
          ? -Math.round(node.clientWidth * 0.86)
          : Math.round(node.clientWidth * 0.86),
      behavior: "smooth",
    });
    window.setTimeout(syncScrollButtons, 250);
  };

  const categories = [
    ...new Set(
      products
        .map((product) => product.businessCategory?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ].slice(0, 3);

  return (
    <section className="grid gap-4 py-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
      <div className="lg:sticky lg:top-56 lg:self-start">
        <Link
          href={`/o/${organization.id}`}
          className="group block rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          aria-label={`${organization.name} байгууллагын profile руу орох`}
        >
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logoUrl}
                alt=""
                className="h-11 w-11 rounded-xl border border-slate-100 object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-950">
                {organization.name}
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {totalProducts} бүтээгдэхүүн
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-black text-slate-500">
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {(organization.rating ?? 0).toFixed(1)}/10
            </span>
            <span>{organization.reviewCount ?? 0} үнэлгээ</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" aria-hidden="true" />
              {Number(organization.customerCount ?? 0).toLocaleString(
                "mn-MN",
              )}{" "}
              хэрэглэгч
            </span>
            <span className="inline-flex items-center gap-1">
              <ShoppingBag
                className="h-3 w-3 text-orange-500"
                aria-hidden="true"
              />
              {(organization.soldCount ?? 0).toLocaleString("mn-MN")} зарагдсан
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500"
              >
                {category}
              </span>
            ))}
          </div>
          <span className="mt-3 inline-flex items-center text-[10px] font-black text-orange-600 opacity-0 transition group-hover:opacity-100">
            Дэлгүүрийн profile үзэх →
          </span>
        </Link>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollProducts("left")}
            disabled={!canScrollLeft}
            aria-label={`${organization.name} өмнөх бараанууд`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollProducts("right")}
            disabled={!canScrollRight}
            aria-label={`${organization.name} дараагийн бараанууд`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={scrollRef}
          onScroll={syncScrollButtons}
          className="grid auto-cols-[minmax(160px,68vw)] grid-flow-col gap-3 overflow-x-auto pb-3 sm:auto-cols-[175px] xl:auto-cols-[185px]"
          style={{ scrollbarWidth: "thin" }}
        >
          {products.map((product) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              isMember={isMember}
              compact
            />
          ))}
          {loadingMore && (
            <div className="flex min-h-48 w-44 items-center justify-center rounded-xl bg-slate-50 text-orange-500">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="sr-only">Дараагийн 15 барааг татаж байна</span>
            </div>
          )}
        </div>
      </div>
    </section>
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
