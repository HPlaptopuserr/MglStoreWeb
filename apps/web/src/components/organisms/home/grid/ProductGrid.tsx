"use client";

import { useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api";
import { ProductDetailOverlay } from "@/components/organisms/ProductDetailOverlay";
import { ProductCarousel } from "../../../molecules/ProductCarousel";
import { HomeCommerceDock } from "./HomeCommerceDock";
import { ProductShelfRow } from "./ProductShelfRow";
import {
  buildFallbackShelves,
  MARKETPLACE_SERVICES_PROMO_KEY,
  MARKETPLACE_SIDE_BANNER_KEY,
  parseMarketplaceSideBanner,
  parseMarketplaceServicesPromo,
  parseShowcaseShelves,
  resolveProjectBanners,
  resolveConfiguredShelves,
  SHOWCASE_KEY,
  type ApiProduct,
  type MarketplaceServicesPromoConfig,
  type MarketplaceSideBannerConfig,
  type MarketplaceProjectBannerConfig,
  type ResolvedShelf,
} from "./productShowcase";

type HomeReelPreview = {
  id: string;
  title?: string | null;
  caption?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  organization?: { name?: string | null; logoUrl?: string | null } | null;
};

export const ProductGrid = () => {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [reels, setReels] = useState<HomeReelPreview[]>([]);
  const [configuredShelves, setConfiguredShelves] = useState<ResolvedShelf[]>(
    [],
  );
  const [sideBanner, setSideBanner] =
    useState<MarketplaceSideBannerConfig | null>(null);
  const [servicesPromo, setServicesPromo] =
    useState<MarketplaceServicesPromoConfig | null>(null);
  const [projectBanners, setProjectBanners] = useState<
    MarketplaceProjectBannerConfig[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/products?limit=100`).then((res) =>
        res.ok ? res.json() : [],
      ),
      fetch(`${API}/reels?limit=6`).then((res) =>
        res.ok ? res.json() : { items: [] },
      ),
      fetch(`${API}/site-settings`).then((res) =>
        res.ok ? res.json() : ({} as Record<string, string>),
      ),
      fetch(`${API}/site-settings/projects`).then((res) =>
        res.ok ? res.json() : { projects: [] },
      ),
    ])
      .then(([productData, reelData, settings, projectData]) => {
        const nextProducts = Array.isArray(productData)
          ? productData.slice(0, 100)
          : [];
        setReels(
          Array.isArray(reelData?.items) ? reelData.items.slice(0, 6) : [],
        );
        const nextShelves = parseShowcaseShelves(settings?.[SHOWCASE_KEY]);
        setProducts(nextProducts);
        setConfiguredShelves(
          resolveConfiguredShelves(nextShelves, nextProducts),
        );
        setSideBanner(
          parseMarketplaceSideBanner(settings?.[MARKETPLACE_SIDE_BANNER_KEY]),
        );
        setServicesPromo(
          parseMarketplaceServicesPromo(
            settings?.[MARKETPLACE_SERVICES_PROMO_KEY],
          ),
        );
        setProjectBanners(
          resolveProjectBanners(
            Array.isArray(projectData?.projects) ? projectData.projects : [],
          ),
        );
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const shelves = useMemo(
    () =>
      configuredShelves.length > 0
        ? configuredShelves
        : buildFallbackShelves(products),
    [configuredShelves, products],
  );

  return (
    <>
      <HomeCommerceDock
        products={products}
        sideBanner={sideBanner}
        servicesPromo={servicesPromo}
        projectBanners={projectBanners}
        reels={reels}
      />

      <section className="bg-white py-5 sm:py-7">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="space-y-7">
            {isLoading ? (
              <>
                <div className="h-7 w-72 animate-pulse rounded-lg bg-slate-100" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[245px] animate-pulse rounded-xl border border-slate-100 bg-slate-50 sm:h-[270px]"
                    />
                  ))}
                </div>
              </>
            ) : shelves.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                Одоогоор бүтээгдэхүүн олдсонгүй
              </div>
            ) : (
              shelves.map((shelf) => (
                <ProductShelfRow
                  key={shelf.id}
                  title={shelf.title}
                  products={shelf.products}
                  onSelect={(id) => setSelectedId(id)}
                />
              ))
            )}

            {!isLoading && products.length > 0 && (
              <section className="pt-1">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                      Catalog
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                      Бүх бүтээгдэхүүн
                    </h2>
                  </div>
                  <a
                    href="/products"
                    className="text-sm font-black text-orange-600"
                  >
                    Бүгдийг харах
                  </a>
                </div>
                <ProductCarousel
                  products={products.slice(0, 10)}
                  onSelect={(id) => setSelectedId(id)}
                />
              </section>
            )}
          </div>
        </div>

        {selectedId && (
          <ProductDetailOverlay
            productId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </section>
    </>
  );
};
