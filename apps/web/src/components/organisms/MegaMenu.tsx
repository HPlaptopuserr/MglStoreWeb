"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Tag,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { API, resolveApiAssetUrl } from "@/lib/api";
import {
  appendProductVisitorId,
  trackProductInteraction,
} from "@/lib/product-interest";

type ApiTreeNode = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  level: number;
  children: ApiTreeNode[];
};

type MegaCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  subgroups: {
    id: string;
    title: string;
    items: { id: string; name: string }[];
  }[];
};

type TrendPeriod = "1d" | "1w" | "1m";

type TrendingProduct = {
  id: string;
  name: string;
  price: number;
  images?: { id?: string; url?: string | null }[];
  businessCategory?: { id: string; name: string } | null;
  organization?: { id: string; name: string } | null;
};

const TREND_PERIODS: { key: TrendPeriod; label: string }[] = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
];

function apiTreeToMega(tree: ApiTreeNode[]): MegaCategory[] {
  return tree.map((root) => ({
    id: root.id,
    slug: root.slug,
    name: root.name,
    icon: root.icon,
    subgroups: root.children.map((sub) => ({
      id: sub.id,
      title: sub.name,
      items: sub.children.map((item) => ({ id: item.id, name: item.name })),
    })),
  }));
}

const buildProductUrl = (categoryId: string, subName?: string) => {
  const params = new URLSearchParams();
  params.set("category", categoryId);
  if (subName) params.set("sub", subName);
  return `/products?${params.toString()}`;
};

const productDetailUrl = (productId: string) =>
  `/products/${encodeURIComponent(productId)}`;

function CategoryIcon({
  icon,
  isActive,
  size = 18,
}: {
  icon: string | null;
  isActive: boolean;
  size?: number;
}) {
  if (!icon) {
    return (
      <Tag
        size={size}
        strokeWidth={isActive ? 2 : 1.5}
        className={isActive ? "text-white" : "text-slate-400"}
      />
    );
  }
  if (icon.startsWith("data:image") || icon.startsWith("http")) {
    return (
      <img
        src={icon}
        alt=""
        className="object-contain"
        style={{
          width: size,
          height: size,
          filter: isActive ? "brightness(0) invert(1)" : "none",
        }}
      />
    );
  }
  return <span style={{ fontSize: size - 2 }}>{icon}</span>;
}

function TrendProductTile({
  product,
  onClick,
}: {
  product: TrendingProduct;
  onClick: (product: TrendingProduct) => void;
}) {
  const imageUrl = resolveApiAssetUrl(product.images?.[0]?.url);

  return (
    <Link
      href={productDetailUrl(product.id)}
      onClick={() => onClick(product)}
      title={product.name}
      className="group relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 pb-[120%] transition hover:border-[#ffad02]/60 hover:shadow-sm"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <ImageIcon size={22} />
        </div>
      )}
    </Link>
  );
}

function TrendProductSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-100 pb-[120%]">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200" />
    </div>
  );
}

function TrendPanel({
  activeCategory,
  products,
  loading,
  period,
  onPeriodChange,
  onProductClick,
  onClose,
}: {
  activeCategory: MegaCategory | null;
  products: TrendingProduct[];
  loading: boolean;
  period: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
  onProductClick: (product: TrendingProduct) => void;
  onClose: () => void;
}) {
  const heroProduct = products[0];
  const heroImage = resolveApiAssetUrl(heroProduct?.images?.[0]?.url);
  const heroHref = activeCategory
    ? buildProductUrl(activeCategory.id)
    : "/products";
  const heroTitle = activeCategory?.name || "Ангилал";

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-l border-slate-100 bg-white p-6">
      <Link
        href={heroHref}
        onClick={onClose}
        className="group relative mb-6 h-72 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-100"
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={heroProduct?.name || heroTitle}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#f8fafc_0%,#e2e8f0_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
            Онцлох ангилал
          </p>
          <p className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-white drop-shadow">
            {heroTitle}
          </p>
        </div>
      </Link>

      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Хамгийн их үзсэн
        </h3>
        <div className="flex gap-3 text-[11px] font-bold">
          {TREND_PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onPeriodChange(item.key)}
              className={
                period === item.key
                  ? "text-[#ffad02]"
                  : "text-slate-400 transition-colors hover:text-slate-800"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-hidden">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <TrendProductSkeleton key={index} />
            ))
          : products.length > 0
            ? products.map((product) => (
                <TrendProductTile
                  key={product.id}
                  product={product}
                  onClick={onProductClick}
                />
              ))
            : (
              <div className="col-span-3 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-400">
                <ImageIcon size={22} className="mb-2 opacity-50" />
                Бараа олдсонгүй
              </div>
            )}
      </div>
    </div>
  );
}

export const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<MegaCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<MegaCategory | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("1d");
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>(
    [],
  );
  const [trendingLoading, setTrendingLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/business-categories/tree?hasProducts=1`)
      .then((r) => r.json())
      .then((data: ApiTreeNode[]) => {
        const mega = apiTreeToMega(data);
        setCategories(mega);
        if (mega.length > 0) {
          setActiveCategory(mega[0]);
        }
      })
      .catch(() => {
        setCategories([]);
        setActiveCategory(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeCategory) return;

    let cancelled = false;
    const params = appendProductVisitorId(
      new URLSearchParams({
        businessCategoryId: activeCategory.id,
        period: trendPeriod,
        limit: "6",
      }),
    );

    setTrendingLoading(true);
    fetch(`${API}/products/trending?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const products = Array.isArray(data?.products)
          ? (data.products as TrendingProduct[])
          : [];
        setTrendingProducts(products);
      })
      .catch(() => {
        if (!cancelled) setTrendingProducts([]);
      })
      .finally(() => {
        if (!cancelled) setTrendingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, isOpen, trendPeriod]);

  const toggleMenu = () => {
    if (isOpen) closeMenu();
    else setIsOpen(true);
  };

  const handleTrendingClick = (product: TrendingProduct) => {
    trackProductInteraction({
      type: "RECOMMENDATION_CLICK",
      productId: product.id,
      businessCategoryId:
        product.businessCategory?.id || activeCategory?.id || null,
      organizationId: product.organization?.id,
      source: "mega-menu-trending",
      metadata: { period: trendPeriod },
    });
    closeMenu();
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((cat) => {
      if (cat.name.toLowerCase().includes(q)) return true;
      return cat.subgroups.some(
        (sg) =>
          sg.title.toLowerCase().includes(q) ||
          sg.items.some((item) => item.name.toLowerCase().includes(q)),
      );
    });
  }, [searchQuery, categories]);

  const getFilteredSubgroups = (subgroups: MegaCategory["subgroups"]) => {
    if (!searchQuery.trim()) return subgroups;
    const q = searchQuery.toLowerCase();
    return subgroups
      .map((sg) => ({
        ...sg,
        items: sg.items.filter((item) => item.name.toLowerCase().includes(q)),
      }))
      .filter(
        (sg) => sg.title.toLowerCase().includes(q) || sg.items.length > 0,
      );
  };

  useEffect(() => {
    if (
      filteredCategories.length > 0 &&
      activeCategory &&
      !filteredCategories.find((c) => c.id === activeCategory.id)
    ) {
      setActiveCategory(filteredCategories[0]);
    }
  }, [filteredCategories, activeCategory]);

  return (
    <div className="relative h-full flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className={`flex items-center gap-2 text-sm font-bold transition-colors h-full px-4 rounded-xl cursor-pointer ${
          isOpen ? "bg-black text-white" : "text-gray-900 hover:bg-slate-50"
        }`}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
        <span className="hidden xl:inline-block text-sm font-bold">Бүх ангилал</span>
        <ChevronDown
          size={14}
          className={`ml-1 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white/60" : "text-gray-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-[900px] min-h-[500px] max-h-[750px] bg-white rounded-r-2xl rounded-bl-2xl shadow-xl border border-slate-200 z-50 flex overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="w-[260px] bg-white border-r border-slate-100 flex flex-col pb-6 shrink-0">
            <div className="px-3 pt-3 pb-2 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ангилал хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffad02]/40 focus:border-[#ffad02] transition-colors placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-3 pt-2 relative"
              data-lenis-prevent="true"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search size={24} className="mb-2 opacity-50" />
                  <span className="text-sm">Илэрц олдсонгүй</span>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const isActive = activeCategory?.id === category.id;
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center justify-between px-4 py-2.5 mt-1 rounded-lg cursor-pointer text-sm transition-colors ${
                        isActive
                          ? "bg-[#ffad02] text-white font-medium shadow-sm transition-none"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveCategory(category)}
                      onMouseEnter={() => setActiveCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          icon={category.icon}
                          isActive={isActive}
                        />
                        <span>{category.name}</span>
                      </div>
                      {isActive && (
                        <ChevronRight
                          size={16}
                          className="text-white opacity-80"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Content: Subgroups + Items ── */}
          <div
            className="flex-1 bg-white p-6 overflow-y-auto overscroll-contain"
            data-lenis-prevent="true"
          >
            {activeCategory ? (
              <>
                <div className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-lg mb-6">
                  <h2 className="text-lg font-bold text-slate-800">
                    {activeCategory.name}
                  </h2>
                  <Link
                    href={buildProductUrl(activeCategory.id)}
                    onClick={closeMenu}
                    className="text-sm font-medium text-[#ffad02] hover:underline transition-colors shrink-0"
                  >
                    Бүгдийг үзэх
                  </Link>
                </div>

                {getFilteredSubgroups(activeCategory.subgroups).length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-12 gap-y-10 pl-2">
                    {getFilteredSubgroups(activeCategory.subgroups).map(
                      (group) => (
                        <div key={group.id} className="flex flex-col">
                          <h3 className="text-[13px] uppercase tracking-wide font-bold text-slate-900 mb-4">
                            {group.title}
                          </h3>
                          {group.items.length > 0 ? (
                            <ul className="space-y-3 mb-4">
                              {group.items.map((item) => (
                                <li key={item.id}>
                                  <Link
                                    href={buildProductUrl(
                                      activeCategory.id,
                                      item.name,
                                    )}
                                    onClick={closeMenu}
                                    className="text-[13px] text-slate-500 hover:text-[#ffad02] transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-300 mb-4">
                              Бүтээгдэхүүний төрөл нэмэгдээгүй
                            </p>
                          )}
                          <Link
                            href={buildProductUrl(activeCategory.id)}
                            onClick={closeMenu}
                            className="text-[13px] font-semibold text-[#ffad02] group flex items-center gap-1 mt-auto shrink-0 w-fit"
                          >
                            Бүгдийг үзэх{" "}
                            <span className="transform group-hover:translate-x-1 transition-transform">
                              →
                            </span>
                          </Link>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                    <Tag size={32} className="opacity-30" />
                    <p>Дэд ангилал нэмэгдээгүй байна</p>
                    <p className="text-xs text-slate-300">
                      Админ хэсгээс дэд ангилал нэмнэ үү
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  "Ангилал сонгоно уу"
                )}
              </div>
            )}
          </div>

          <TrendPanel
            activeCategory={activeCategory}
            products={trendingProducts}
            loading={trendingLoading}
            period={trendPeriod}
            onPeriodChange={setTrendPeriod}
            onProductClick={handleTrendingClick}
            onClose={closeMenu}
          />
        </div>
      )}
    </div>
  );
};
