"use client";
import { useEffect, useState, type RefObject } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Search, ShoppingBag, Store } from "lucide-react";
import { StoreUtilityBar } from "@/components/organisms/layouts/StoreUtilityBar";
import type { SharedWarehouse } from "./types";
export function SharedStoreTopbar({
  profileRef,
  warehouse,
  search,
  onSearch,
  onBasket,
  count,
}: {
  profileRef: RefObject<HTMLDivElement | null>;
  warehouse?: SharedWarehouse;
  search: string;
  onSearch: (value: string) => void;
  onBasket: () => void;
  count: number;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const element = profileRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: "-88px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [profileRef]);
  return (
    <>
      <StoreUtilityBar
        containerClassName="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8"
        showCart={false}
        cartHref="/shared-store#shared-catalog"
        ordersHref="/shared-store#shared-orders"
      />
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2 sm:gap-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label={compact ? "Дундын дэлгүүр · Нүүр" : "MGL Store · Нүүр"}
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {compact ? (
              <>
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-950 text-orange-300">
                  <Store size={22} />
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-black">
                    Дундын дэлгүүр
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">
                    Агуулахаас шууд
                  </span>
                </span>
              </>
            ) : (
              <Image
                src="/logo-storefront.webp"
                alt="MGL Store"
                width={86}
                height={38}
                className="h-7 w-[67px] object-contain sm:h-[38px] sm:w-[86px]"
                priority
              />
            )}
          </Link>
          <form
            className="relative ml-auto flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 sm:max-w-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("shared-catalog")?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "instant"
                  : "smooth",
              });
            }}
          >
            <Search size={17} className="ml-2 shrink-0 text-slate-400" />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Дундын дэлгүүрээс хайх</span>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Дундын дэлгүүрээс бараа хайх…"
                className="min-h-10 w-full min-w-0 bg-transparent px-2 text-xs outline-none sm:text-sm"
              />
            </label>
            <button
              type="submit"
              className="hidden min-h-10 shrink-0 rounded-lg bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 sm:block"
            >
              Хайх
            </button>
          </form>
          {compact && warehouse?.phone && (
            <a
              href={`tel:${warehouse.phone}`}
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 lg:inline-flex"
            >
              <Phone size={16} />
              Холбогдох
            </a>
          )}
          {compact && (
            <button
              type="button"
              onClick={onBasket}
              aria-label={`Сагс харах, ${count} бараа`}
              className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 transition hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-5 text-white">
                  {count}
                </span>
              )}
            </button>
          )}
        </div>
      </header>
    </>
  );
}
