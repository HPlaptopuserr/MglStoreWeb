"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@mgl/ui";
import { API } from "@/lib/api";

const PRODUCTS_PER_PAGE = 16;

type SortKey = "newest" | "price_asc" | "price_desc" | "discount";

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
  images: { id: string; url: string }[];
  organization: { id: string; name: string } | null;
  discounts: { percent: number }[];
  businessCategoryId: string | null;
  businessCategory: { id: string; name: string; slug?: string } | null;
  createdAt: string;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Шинэ эхэнд" },
  { key: "price_asc", label: "Үнэ: Бага → Их" },
  { key: "price_desc", label: "Үнэ: Их → Бага" },
  { key: "discount", label: "Хямдралтай эхэнд" },
];

function buildProductsUrl(categoryId: string | null, search: string) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  const query = search.trim();
  if (query) params.set("search", query);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
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

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Sort state
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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

  // Category tabs scroll
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsCanLeft, setTabsCanLeft] = useState(false);
  const [tabsCanRight, setTabsCanRight] = useState(false);

  const checkTabsScroll = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setTabsCanLeft(el.scrollLeft > 2);
    setTabsCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkTabsScroll();
    const el = tabsScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkTabsScroll, { passive: true });
    const ro = new ResizeObserver(checkTabsScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkTabsScroll);
      ro.disconnect();
    };
  }, [apiCategories, checkTabsScroll]);

  const scrollTabs = (dir: "left" | "right") => {
    tabsScrollRef.current?.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${API}/business-categories`);
        if (res.ok) setApiCategories(await res.json());
      } catch {}
    };
    loadCategories();
  }, []);

  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeCategory) params.set("businessCategoryId", activeCategory);
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("page", String(currentPage));
        params.set("limit", "24");
        const url = `${API}/products?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
          setApiProducts(list);
          const tot = data.total ?? list.length;
          setTotalProducts(tot);
          setTotalPages(data.pages ?? Math.max(1, Math.ceil(tot / 24)));
        }
      } catch {}
      finally { setProductsLoading(false); }
    };
    loadProducts();
  }, [activeCategory, debouncedSearch, currentPage]);

  useEffect(() => {
    setActiveCategory(resolvedCategoryParam);
    setSearchQuery(searchParam);
    setDebouncedSearch(searchParam);
    setCurrentPage(1);
  }, [resolvedCategoryParam, searchParam]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setCurrentPage(1);
    router.push(buildProductsUrl(catId, searchQuery), { scroll: false });
  };

  const submitSearch = () => {
    router.replace(buildProductsUrl(activeCategory, searchQuery), { scroll: false });
  };

  const clearFilters = () => {
    setDiscountOnly(false);
    setPriceMin("");
    setPriceMax("");
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
    searchQuery !== "",
    sortKey !== "newest",
  ].filter(Boolean).length;

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
      case "newest":
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return list;
  }, [apiProducts, searchQuery, discountOnly, priceMin, priceMax, sortKey]);

  // Server-side pagination: API already returns only the current page's products
  // Client-side filters (price range, discount) still apply on the current page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setCurrentPage(1); }, [activeCategory, debouncedSearch, discountOnly, priceMin, priceMax, sortKey]);

  // processedProducts is already the current page slice from API
  const displayProducts = processedProducts;
  const effectiveTotalPages = (discountOnly || priceMin || priceMax)
    ? Math.max(1, Math.ceil(processedProducts.length / PRODUCTS_PER_PAGE))
    : totalPages;

  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCategoryName = apiCategories.find((c) => c.id === activeCategory)?.name;

  // Price bounds for hints
  const prices = apiProducts.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Нүүр</Link>
          <span>/</span>
          <Link href="/products" className="hover:underline">Дэлгүүр</Link>
          <span>/</span>
          <span className="text-gray-400">{activeCategoryName ?? "Бүх бараа"}</span>
        </nav>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-black uppercase">
            {activeCategoryName ?? "Бүх бараа бүтээгдэхүүн"}{" "}
            <span className="text-[#FFAD02] text-sm md:text-base font-bold align-middle">
              ({totalProducts})
            </span>
          </h1>
        </div>

        {/* Search bar */}
        <div className="mb-6 relative max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDebouncedSearch("");
                setCurrentPage(1);
                router.replace(buildProductsUrl(activeCategory, ""), { scroll: false });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category tabs + filter button row */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-0">
          <div className="relative flex-1 min-w-0">
            {tabsCanLeft && (
              <button
                onClick={() => scrollTabs("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-black hover:shadow-md transition-all"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div
              ref={tabsScrollRef}
              className="flex items-center gap-0 overflow-x-auto scrollbar-hide -mb-px px-8"
            >
              <button
                onClick={() => handleCategoryClick(null)}
                className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                  !activeCategory ? "text-black" : "text-gray-400 hover:text-black"
                }`}
              >
                Бүгд
                {!activeCategory && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFAD02]" />}
              </button>
              {apiCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`relative px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                    activeCategory === cat.id ? "text-black" : "text-gray-400 hover:text-black"
                  }`}
                >
                  {cat.name}
                  {activeCategory === cat.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFAD02]" />}
                </button>
              ))}
            </div>
            {tabsCanRight && (
              <button
                onClick={() => scrollTabs("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-black hover:shadow-md transition-all"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Filter trigger button */}
          <div className="relative shrink-0 ml-4" ref={filterPanelRef}>
            <button
              onClick={() => setFilterPanelOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 border text-xs font-bold uppercase tracking-wider transition-colors ${
                filterPanelOpen || activeFilterCount > 0
                  ? "bg-black text-white border-black"
                  : "text-black border-black hover:bg-black hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Шүүлт & Эрэмбэ
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-[#FFAD02] text-black text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {filterPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 shadow-xl z-50">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-black">Шүүлт & Эрэмбэ</span>
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-gray-400 hover:text-black underline transition-colors"
                  >
                    Цэвэрлэх
                  </button>
                </div>

                <div className="p-4 space-y-5">
                  {/* Sort */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Эрэмбэлэх</p>
                    <div className="space-y-1">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortKey(opt.key); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                            sortKey === opt.key
                              ? "bg-black text-white font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {sortKey === opt.key && (
                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={sortKey === opt.key ? "" : "ml-[22px]"}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Price range */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Үнийн хязгаар</p>
                    {maxPrice > 0 && (
                      <p className="text-[11px] text-gray-400 mb-2">
                        ₮{minPrice.toLocaleString()} – ₮{maxPrice.toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Доод"
                        value={priceMin}
                        min={0}
                        onChange={(e) => { setPriceMin(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-1.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                      <span className="text-gray-300 text-sm">—</span>
                      <input
                        type="number"
                        placeholder="Дээд"
                        value={priceMax}
                        min={0}
                        onChange={(e) => { setPriceMax(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-1.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Discount toggle */}
                  <div>
                    <button
                      onClick={() => { setDiscountOnly((v) => !v); setCurrentPage(1); }}
                      className="w-full flex items-center justify-between group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-black">Зөвхөн хямдралтай</p>
                        <p className="text-[11px] text-gray-400">
                          {apiProducts.filter((p) => p.discounts.length > 0).length} бараа хямдралтай
                        </p>
                      </div>
                      <div className={`w-10 h-5.5 rounded-full transition-colors relative ${
                        discountOnly ? "bg-black" : "bg-gray-200"
                      }`}
                        style={{ minWidth: "40px", height: "22px" }}
                      >
                        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${
                          discountOnly ? "left-[18px]" : "left-0.5"
                        }`}
                          style={{ width: "18px", height: "18px", left: discountOnly ? "20px" : "2px" }}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Apply/close button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setFilterPanelOpen(false)}
                    className="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#FFAD02] hover:text-black transition-colors"
                  >
                    Хэрэглэх
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 pb-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">Идэвхтэй:</span>
            {sortKey !== "newest" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-xs font-medium">
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                <button onClick={() => setSortKey("newest")} className="ml-1 text-gray-400 hover:text-black">×</button>
              </span>
            )}
            {discountOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-xs font-medium">
                Хямдралтай
                <button onClick={() => setDiscountOnly(false)} className="ml-1 text-gray-400 hover:text-black">×</button>
              </span>
            )}
            {(priceMin !== "" || priceMax !== "") && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-xs font-medium">
                ₮{priceMin || "0"} – ₮{priceMax || "∞"}
                <button onClick={() => { setPriceMin(""); setPriceMax(""); }} className="ml-1 text-gray-400 hover:text-black">×</button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-xs font-medium">
                "{searchQuery}"
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDebouncedSearch("");
                    setCurrentPage(1);
                    router.replace(buildProductsUrl(activeCategory, ""), { scroll: false });
                  }}
                  className="ml-1 text-gray-400 hover:text-black"
                >
                  ×
                </button>
              </span>
            )}
            <button onClick={clearFilters} className="text-[11px] text-gray-400 hover:text-black underline ml-1">
              Бүгдийг арилгах
            </button>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="container mx-auto px-4 lg:px-8 pb-12 mt-6">
        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="py-24 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-400 text-sm font-medium">
              {searchQuery || discountOnly || priceMin || priceMax
                ? "Шүүлтэд тохирох бараа олдсонгүй"
                : "Энэ ангилалд бараа байхгүй байна"}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-xs underline text-gray-400 hover:text-black"
              >
                Шүүлтийг цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {displayProducts.map((product) => {
              const discount = product.discounts?.[0]?.percent;
              const originalPrice = discount ? product.price : undefined;
              const finalPrice = discount ? Math.round(product.price * (1 - discount / 100)) : product.price;
              return (
                <div
                  key={product.id}
                >
                  <ProductCard
                    href={`/products/${product.id}`}
                    image={product.images?.[0]?.url}
                    price={finalPrice}
                    name={product.name}
                    category={product.businessCategory?.name}
                    originalPrice={originalPrice}
                    storeName={product.organization?.name}
                    stock={product.stock}
                  />
                </div>
              );
            })}
          </div>
        )}


        {/* Pagination */}
        {effectiveTotalPages > 1 && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <p className="text-xs text-gray-400">
              Хуудас {currentPage} / {effectiveTotalPages} ({totalProducts} бараа)
            </p>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center border border-black text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: (number | "…")[] = [];
                if (effectiveTotalPages <= 7) {
                  for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push("…");
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(effectiveTotalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < effectiveTotalPages - 2) pages.push("…");
                  pages.push(effectiveTotalPages);
                }
                return pages.map((p, idx) =>
                  p === "…" ? (
                    <span key={`e${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-300">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p as number)}
                      className={`flex h-9 w-9 items-center justify-center border text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPage === p
                          ? "border-black bg-black text-white"
                          : "border-gray-200 text-black hover:border-black hover:bg-black hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              {/* Next */}
              <button
                onClick={() => goToPage(Math.min(effectiveTotalPages, currentPage + 1))}
                disabled={currentPage === effectiveTotalPages}
                className="flex h-9 w-9 items-center justify-center border border-black text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

