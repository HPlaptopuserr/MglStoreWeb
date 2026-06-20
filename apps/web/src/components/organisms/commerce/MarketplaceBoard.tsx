"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clapperboard,
  PackageSearch,
  Play,
  Search,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";
import { API } from "@/lib/api";
import { AccountStatusPanel } from "./AccountStatusPanel";

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug?: string;
  icon?: string | null;
  _count?: { products?: number };
};

function isImageIcon(icon: string) {
  return (
    icon.startsWith("data:image/") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/")
  );
}

function isSafeTextIcon(icon: string) {
  const trimmed = icon.trim();
  if (!trimmed || trimmed.length > 8) return false;
  if (/^[A-Za-z0-9+/=]{6,}$/.test(trimmed)) return false;
  return true;
}

function SafeCategoryIcon({
  icon,
  name,
  className = "h-3.5 w-3.5 text-orange-500",
}: {
  icon?: string | null;
  name: string;
  className?: string;
}) {
  const value = String(icon || "").trim();

  if (value && isImageIcon(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt={name}
        className="h-4 w-4 rounded-sm object-contain"
      />
    );
  }

  if (value && isSafeTextIcon(value)) {
    return (
      <span className="block max-w-[1.25rem] overflow-hidden text-base leading-none">
        {value}
      </span>
    );
  }

  return <PackageSearch className={className} />;
}

export type MarketplaceProduct = {
  id: string;
  name: string;
  price: number;
  images?: { id: string; url: string }[];
  discounts?: { percent: number }[];
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  businessCategory?: { id: string; name: string; slug?: string } | null;
};

export type MarketplaceSideBanner = {
  isActive?: boolean;
  imageUrl?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  href?: string;
};

export type MarketplaceServicesPromo = {
  imageUrl?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
};

export type MarketplaceProjectBanner = {
  id: string;
  title: string;
  summary?: string;
  imageUrl: string;
};

export type MarketplaceReelPreview = {
  id: string;
  title?: string | null;
  caption?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  organization?: { name?: string | null; logoUrl?: string | null } | null;
};

type MarketplaceBoardProps = {
  categories: MarketplaceCategory[];
  activeCategory?: string | null;
  searchQuery?: string;
  total: number;
  products: MarketplaceProduct[];
  reels?: MarketplaceReelPreview[];
  onCategoryClick?: (categoryId: string | null) => void;
  categoryHref?: (category: MarketplaceCategory) => string;
  allHref?: string;
  sideBanner?: MarketplaceSideBanner | null;
  servicesPromo?: MarketplaceServicesPromo | null;
  projectBanners?: MarketplaceProjectBanner[];
  onSearchSubmit?: (query: string) => void;
  showSearch?: boolean;
};

export function MarketplaceBoard({
  categories,
  activeCategory = null,
  searchQuery = "",
  total,
  products,
  reels = [],
  onCategoryClick,
  categoryHref,
  allHref = "/products",
  sideBanner,
  servicesPromo,
  projectBanners = [],
  onSearchSubmit,
  showSearch = false,
}: MarketplaceBoardProps) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const visibleCategories = categories.slice(0, 6);
  const spotlightProducts = products.slice(0, 4);
  const discounted = products.find(
    (product) => product.discounts?.[0]?.percent,
  );
  const preorder = products.find(
    (product) => product.supplyType === "CHINA_PREORDER",
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = localSearch.trim();
    if (!query) return;
    if (onSearchSubmit) {
      onSearchSubmit(query);
      return;
    }
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4 py-4 lg:px-8">
        {showSearch && (
          <form
            onSubmit={submitSearch}
            className="mb-3 flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm lg:hidden"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Бүтээгдэхүүн хайх..."
                className="h-12 w-full rounded-xl bg-slate-50 pl-11 pr-3 text-sm font-bold text-slate-900 outline-none transition focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={!localSearch.trim()}
              className="h-12 shrink-0 rounded-xl bg-orange-500 px-4 text-sm font-black text-white transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400"
            >
              Хайх
            </button>
          </form>
        )}

        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <aside className="hidden rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm lg:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-base font-black text-slate-950">
                <PackageSearch className="h-4 w-4 text-orange-500" />
                Ангилал
              </span>
              <CategoryLink
                href={allHref}
                onClick={
                  onCategoryClick ? () => onCategoryClick(null) : undefined
                }
                className="inline-flex items-center gap-1 text-xs font-black text-orange-600"
              >
                Бүгд <ArrowRight className="h-3.5 w-3.5" />
              </CategoryLink>
            </div>

            <div className="space-y-1.5">
              {visibleCategories.map((category) => {
                const href =
                  categoryHref?.(category) ||
                  `/products?category=${encodeURIComponent(category.slug || category.id)}`;

                return (
                  <CategoryLink
                    key={category.id}
                    href={href}
                    onClick={
                      onCategoryClick
                        ? () => onCategoryClick(category.id)
                        : undefined
                    }
                    className={`group flex h-10 w-full items-center justify-between gap-3 rounded-xl px-2.5 text-left text-sm font-black transition ${
                      activeCategory === category.id
                        ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                        : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base ${
                          activeCategory === category.id
                            ? "bg-white/20"
                            : "bg-white ring-1 ring-slate-100"
                        }`}
                      >
                        <SafeCategoryIcon
                          icon={category.icon}
                          name={category.name}
                          className={
                            activeCategory === category.id
                              ? "h-3.5 w-3.5 text-white"
                              : "h-3.5 w-3.5 text-orange-500"
                          }
                        />
                      </span>
                      <span className="truncate">{category.name}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                  </CategoryLink>
                );
              })}
            </div>
          </aside>

          <div className="grid gap-3">
            <div className="grid gap-3 min-[430px]:grid-cols-2 md:grid-cols-2">
              <div className="lg:hidden">
                <MglServicesPromoPanel promo={servicesPromo} />
              </div>
              <ProjectHeroBanner projects={projectBanners} />
              <div className="hidden lg:block">
                {reels.length > 0 ? (
                  <ReelEntryCard reels={reels} />
                ) : (
                  <DealStrip
                    products={spotlightProducts.slice(0, 3)}
                    total={total}
                  />
                )}
              </div>
            </div>

            <div className="hidden grid-cols-4 gap-3 lg:grid">
              {reels.length > 0 && <CompactReelTile reel={reels[0]} />}
              <ServiceSpotlightTile promo={servicesPromo} />
              <SpotlightTile
                href={discounted ? `/products/${discounted.id}` : "/products"}
                label="Хямдрал"
                title={discounted?.name || "Хямдралтай бараа"}
                value={discounted ? formatPrice(discounted.price) : "Удахгүй"}
                product={discounted}
                tint="rose"
              />
              <SpotlightTile
                href={
                  preorder
                    ? `/products/${preorder.id}`
                    : "/products?type=preorder"
                }
                label="Захиалга"
                title={preorder?.name || "Захиалгын бараа"}
                value={
                  preorder?.preorderLeadTimeDays
                    ? `${preorder.preorderLeadTimeDays} хоног`
                    : "Удахгүй"
                }
                product={preorder}
                tint="emerald"
              />
              {!reels.length && (
                <SpotlightTile
                  href="/organizations"
                  label="Дэлгүүрүүд"
                  title="Баталгаатай vendor"
                  value="Store"
                  tint="sky"
                />
              )}
            </div>
          </div>

          <aside className="hidden h-full xl:flex xl:flex-col">
            <AccountStatusPanel searchQuery={searchQuery} />
            <SideBanner banner={sideBanner} />
          </aside>
        </div>

        <div className="scrollbar-hide mt-3 flex w-full max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:hidden">
          <CategoryLink
            href={allHref}
            onClick={onCategoryClick ? () => onCategoryClick(null) : undefined}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black transition sm:h-10 sm:px-4 ${
              !activeCategory
                ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100"
                : "border-slate-200 bg-white/90 text-slate-700 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Бүх бараа
          </CategoryLink>
          {visibleCategories.map((category) => {
            const href =
              categoryHref?.(category) ||
              `/products?category=${encodeURIComponent(category.slug || category.id)}`;

            return (
              <CategoryLink
                key={category.id}
                href={href}
                onClick={
                  onCategoryClick
                    ? () => onCategoryClick(category.id)
                    : undefined
                }
                className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black transition sm:h-10 sm:px-4 ${
                  activeCategory === category.id
                    ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100"
                    : "border-slate-200 bg-white/90 text-slate-700 hover:border-orange-200 hover:text-orange-600"
                }`}
              >
                <SafeCategoryIcon
                  icon={category.icon}
                  name={category.name}
                  className={
                    activeCategory === category.id
                      ? "h-4 w-4 text-white"
                      : "h-4 w-4 text-orange-500"
                  }
                />
                {category.name}
              </CategoryLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getMarketplaceMediaUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API.replace(/\/api$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function ReelEntryCard({ reels }: { reels: MarketplaceReelPreview[] }) {
  const first = reels[0];
  const videoUrl = getMarketplaceMediaUrl(first?.videoUrl);
  const poster = getMarketplaceMediaUrl(first?.thumbnailUrl);

  return (
    <Link
      href="/reels"
      className="group relative flex h-[172px] overflow-hidden rounded-2xl bg-slate-950 p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-100/70 sm:h-[190px] sm:p-4 lg:h-[230px]"
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          poster={poster || undefined}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-78 transition group-hover:scale-105 group-hover:opacity-90"
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(249,115,22,0.34),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(112,26,117,0.68))]" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/16 px-3 py-1 text-xs font-black backdrop-blur-sm">
            <Clapperboard className="h-3.5 w-3.5" />
            Reels
          </span>
          <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-black">
            {reels.length}
          </span>
        </div>
        <div>
          <p className="max-w-[13rem] text-2xl font-black leading-[1.02] tracking-tight lg:text-xl xl:text-2xl">
            Store video үзэх
          </p>
          <p className="mt-1 line-clamp-2 max-w-[14rem] text-xs font-bold leading-5 text-white/78">
            Бараа, байгууллагын богино video танилцуулга.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950 transition group-hover:bg-orange-500 group-hover:text-white">
            Reel үзэх <Play className="h-3.5 w-3.5 fill-current" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactReelTile({ reel }: { reel: MarketplaceReelPreview }) {
  const videoUrl = getMarketplaceMediaUrl(reel.videoUrl);
  const poster = getMarketplaceMediaUrl(reel.thumbnailUrl);

  return (
    <Link
      href="/reels"
      className="group relative h-[126px] overflow-hidden rounded-2xl border border-fuchsia-100 bg-slate-950 p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200"
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          poster={poster || undefined}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-72 transition group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/78 via-slate-950/34 to-fuchsia-700/52" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-black backdrop-blur">
          <Clapperboard className="h-3 w-3" />
          Reel
        </span>
        <div>
          <p className="line-clamp-2 text-sm font-black leading-4">
            {reel.title || reel.caption || "Video танилцуулга"}
          </p>
          <p className="mt-1 text-[11px] font-bold text-white/72">Үзэх</p>
        </div>
      </div>
    </Link>
  );
}

function ProjectHeroBanner({
  projects,
}: {
  projects: MarketplaceProjectBanner[];
}) {
  const slides = projects.slice(0, 4).filter((project) => project.imageUrl);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = slides[activeIndex % Math.max(slides.length, 1)];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!active) {
    return (
      <Link
        href="/products"
        className="relative h-[150px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_28%,rgba(255,255,255,0.28),transparent_28%),linear-gradient(135deg,#fb5b2f_0%,#ef4444_54%,#8b3f2b_100%)] p-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/70 sm:h-[190px] sm:p-5 lg:h-[230px]"
      >
        <div className="relative z-10 flex h-full max-w-[340px] flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/16 px-3 py-1 text-xs font-black backdrop-blur-sm">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              MGL Store
            </span>
            <h1 className="mt-2 text-lg font-black leading-tight tracking-tight sm:mt-3 sm:text-2xl">
              Бараагаа хурдан олж, шууд захиал
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black sm:gap-2 sm:text-sm">
            Худалдаа эхлэх <ArrowRight className="h-4 w-4" />
          </span>
        </div>
        <div className="absolute -bottom-20 -right-8 h-52 w-52 rounded-full bg-white/18" />
      </Link>
    );
  }

  return (
    <Link
      href="/projects"
      className="group relative h-[150px] overflow-hidden rounded-2xl bg-slate-950 p-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/70 sm:h-[190px] sm:p-5 lg:h-[230px]"
    >
      {slides.map((project, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={project.id}
          src={project.imageUrl}
          alt={project.title}
          className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 ${
            index === activeIndex % slides.length ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/78 via-slate-950/30 to-orange-500/42" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/72 to-transparent" />
      <div className="relative z-10 flex h-full max-w-[360px] flex-col justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/16 px-3 py-1 text-xs font-black backdrop-blur-sm">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Төслийн онцлох
          </span>
          <h1 className="mt-2 line-clamp-2 text-lg font-black leading-[1.03] tracking-tight sm:mt-3 sm:text-2xl">
            {active.title}
          </h1>
          {active.summary && (
            <p className="mt-1 line-clamp-1 text-[11px] font-bold leading-4 text-white/78 sm:line-clamp-2 sm:text-xs">
              {active.summary}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black sm:gap-2 sm:text-sm">
            Төсөл үзэх <ArrowRight className="h-4 w-4" />
          </span>
          <div className="hidden gap-1.5 min-[420px]:flex">
            {slides.map((project, index) => (
              <span
                key={`${project.id}-dot`}
                className={`h-2 rounded-full transition ${
                  index === activeIndex % slides.length
                    ? "w-5 bg-white"
                    : "w-2 bg-white/45"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SideBanner({ banner }: { banner?: MarketplaceSideBanner | null }) {
  const resolved =
    banner?.isActive === false
      ? null
      : {
          imageUrl: banner?.imageUrl || "",
          eyebrow: banner?.eyebrow || "Онцлох санал",
          title: banner?.title || "Өнөөдрийн hot deal",
          subtitle:
            banner?.subtitle ||
            "Admin-аас banner тохируулж энэ зайг campaign болгон ашиглана.",
          cta: banner?.cta || "Дэлгэрэнгүй",
          href: banner?.href || "/products?discount=1&sort=discount",
        };

  if (!resolved) return null;

  return (
    <Link
      href={resolved.href}
      className="group relative mt-4 flex min-h-[118px] flex-1 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#111827,#fb6b14)] p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/60"
    >
      {resolved.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved.imageUrl}
          alt={resolved.title}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
        />
      )}
      <div
        className={`absolute inset-0 ${
          resolved.imageUrl
            ? "bg-gradient-to-t from-slate-950/84 via-slate-950/24 to-slate-950/10"
            : "bg-gradient-to-br from-slate-950/72 via-slate-950/36 to-orange-500/50"
        }`}
      />
      <div className="relative z-10 flex h-full max-w-[210px] flex-col justify-between">
        <div>
          <span className="inline-flex max-w-full rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
            <span className="truncate">{resolved.eyebrow}</span>
          </span>
          <p className="mt-2 line-clamp-2 text-lg font-black leading-tight">
            {resolved.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-white/78">
            {resolved.subtitle}
          </p>
        </div>
        <span className="mt-3 inline-flex max-w-full items-center gap-1 text-xs font-black">
          <span className="truncate">{resolved.cta}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </span>
      </div>
      {!resolved.imageUrl && (
        <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/18" />
      )}
    </Link>
  );
}

function CategoryLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SpotlightTile({
  href,
  label,
  title,
  value,
  product,
  tint,
}: {
  href: string;
  label: string;
  title: string;
  value: string;
  product?: MarketplaceProduct;
  tint: "rose" | "emerald" | "sky" | "slate";
}) {
  const tintClass = {
    rose: "text-rose-600 bg-rose-50",
    emerald: "text-emerald-600 bg-emerald-50",
    sky: "text-sky-600 bg-sky-50",
    slate: "text-slate-700 bg-slate-100",
  };

  return (
    <Link
      href={href}
      className="group relative h-[96px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-orange-100/40"
    >
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${tintClass[tint]}`}
      >
        {label}
      </span>
      <div className="mt-3 max-w-[68%]">
        <p className="line-clamp-1 text-sm font-black text-slate-950">
          {title}
        </p>
        <p className="mt-0.5 text-sm font-black text-orange-600">{value}</p>
      </div>
      <ProductThumb product={product} />
    </Link>
  );
}

function ServiceSpotlightTile({
  promo,
}: {
  promo?: MarketplaceServicesPromo | null;
}) {
  const resolved = {
    eyebrow: promo?.eyebrow || "MGL үйлчилгээ",
    title: promo?.title || "Үйлчилгээний багцууд",
    cta: promo?.cta || "Үзэх",
    imageUrl: promo?.imageUrl || "",
  };

  return (
    <Link
      href="/our-services"
      className="group relative h-[96px] overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-orange-100/50"
    >
      {resolved.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved.imageUrl}
          alt={resolved.title}
          className="absolute inset-0 h-full w-full object-cover opacity-35 transition group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-orange-50/55" />
      <div className="relative z-10">
        <span className="inline-flex max-w-[72%] items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-700">
          <Wrench className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{resolved.eyebrow}</span>
        </span>
        <p className="mt-3 line-clamp-1 max-w-[68%] text-sm font-black text-slate-950">
          {resolved.title}
        </p>
        <p className="mt-0.5 text-sm font-black text-orange-600">
          {resolved.cta}
        </p>
      </div>
      <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm ring-1 ring-orange-100">
        <ArrowRight className="h-5 w-5" />
      </div>
    </Link>
  );
}

function ProductThumb({ product }: { product?: MarketplaceProduct }) {
  const image = product?.images?.[0]?.url;

  if (!image) {
    return (
      <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
        <Store className="h-5 w-5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={product?.name || "Онцлох бүтээгдэхүүн"}
      className="absolute bottom-2.5 right-2.5 h-14 w-14 rounded-xl object-contain transition group-hover:scale-105"
    />
  );
}

function MglServicesPromoPanel({
  promo,
}: {
  promo?: MarketplaceServicesPromo | null;
}) {
  const resolved = {
    imageUrl: promo?.imageUrl || "",
    eyebrow: promo?.eyebrow || "MGL үйлчилгээ",
    title: promo?.title || "MGL үйлчилгээний багцууд",
    subtitle:
      promo?.subtitle || "MGL-ээс гаргаж буй хууль, маркетинг, HR үйлчилгээ",
    cta: promo?.cta || "MGL үйлчилгээ",
  };

  return (
    <Link
      href="/our-services"
      className="group relative flex h-[150px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_78%,rgba(255,255,255,0.20),transparent_25%),linear-gradient(135deg,#111827_0%,#fb5b2f_58%,#f97316_100%)] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-100/70 sm:h-[190px] lg:h-[230px]"
    >
      {resolved.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved.imageUrl}
          alt={resolved.title}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
        />
      )}
      <div
        className={`absolute inset-0 ${
          resolved.imageUrl
            ? "bg-gradient-to-t from-slate-950/86 via-slate-950/24 to-slate-950/12"
            : "bg-gradient-to-br from-slate-950/76 via-slate-950/34 to-orange-500/56"
        }`}
      />
      <div className="relative z-10 flex min-h-full w-full flex-col justify-between p-3 xl:p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-white/16 px-2 py-1 text-[10px] font-black backdrop-blur-sm xl:text-[11px]">
            <Wrench className="h-3 w-3 shrink-0 xl:h-3.5 xl:w-3.5" />
            <span className="truncate">{resolved.eyebrow}</span>
          </span>
          <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/14 backdrop-blur-sm sm:flex">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div>
          <p className="line-clamp-2 max-w-[11rem] text-lg font-black leading-[1.02] tracking-tight sm:max-w-[15rem] sm:text-xl lg:max-w-[10rem] lg:text-lg xl:max-w-[13rem] xl:text-xl">
            {resolved.title}
          </p>
          <p className="mt-1 line-clamp-1 max-w-[11rem] text-[11px] font-bold leading-4 text-white/78 sm:mt-1.5 sm:max-w-[15rem] lg:max-w-[10rem] xl:max-w-[13rem] xl:text-xs">
            {resolved.subtitle}
          </p>
          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/16 px-2.5 py-1.5 text-[11px] font-black backdrop-blur-sm xl:text-xs">
            <span className="truncate">{resolved.cta}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
      </div>
      {!resolved.imageUrl && (
        <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-white/18" />
      )}
    </Link>
  );
}

function DealStrip({
  products,
  total,
}: {
  products: MarketplaceProduct[];
  total: number;
}) {
  const items = products.slice(0, 3);

  return (
    <Link
      href="/products"
      className="group relative flex h-[172px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(135deg,#db2777,#fb7185)] p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-100/70 sm:h-[190px] sm:p-4 md:col-span-2 lg:col-span-1 lg:h-[230px]"
    >
      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-2 md:grid md:grid-cols-[0.82fr_1.18fr] md:gap-3 lg:flex lg:h-full lg:flex-col">
        <div className="flex items-start justify-between gap-3 md:block lg:mb-0">
          <div>
            <span className="inline-flex rounded-full bg-white/16 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur-sm sm:text-[10px]">
              Product picks
            </span>
            <p className="mt-2 max-w-[12rem] text-[25px] font-black leading-[1.02] tracking-tight sm:max-w-[13rem] sm:text-2xl lg:line-clamp-2 lg:text-base lg:leading-tight xl:text-lg">
              Онцлох бүтээгдэхүүн
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-white/18 px-2.5 py-1 text-xs font-black md:mt-3">
            {total}+
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:mt-auto lg:gap-1.5 xl:gap-2">
          {items.length > 0
            ? items.map((product) => (
                <MiniDealProduct key={product.id} product={product} />
              ))
            : Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[86px] rounded-xl bg-white/18"
                />
              ))}
        </div>
      </div>
      <div className="absolute -bottom-16 -right-8 h-40 w-40 rounded-full bg-white/12 transition group-hover:scale-110" />
    </Link>
  );
}

function MiniDealProduct({ product }: { product: MarketplaceProduct }) {
  const image = product.images?.[0]?.url;
  const discount = product.discounts?.[0]?.percent;

  return (
    <div className="min-w-0 rounded-xl bg-white/94 p-1.5 text-slate-950 shadow-sm ring-1 ring-white/60 xl:p-2">
      <div className="flex h-11 items-center justify-center overflow-hidden rounded-lg bg-slate-50 sm:h-16 lg:h-14 xl:h-16">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Store className="h-6 w-6 text-slate-300" />
        )}
      </div>
      {discount ? (
        <p className="mt-1 truncate text-center text-[9px] font-black leading-none text-emerald-600">
          Member -{discount}%
        </p>
      ) : null}
      <p className="mt-1 text-center text-[10px] font-black leading-none text-orange-600 xl:text-[11px]">
        {formatCompactPrice(product.price)}
      </p>
    </div>
  );
}

function formatCompactPrice(value: number) {
  if (value >= 1_000_000) return `₮${Math.round(value / 100_000) / 10}M`;
  if (value >= 10_000) return `₮${Math.round(value / 1000)}K`;
  return formatPrice(value);
}

function formatPrice(value: number) {
  return `₮${value.toLocaleString()}`;
}
