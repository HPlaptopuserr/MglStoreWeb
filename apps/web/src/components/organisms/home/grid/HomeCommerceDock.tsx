"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MarketplaceBoard,
  type MarketplaceCategory,
  type MarketplaceProjectBanner,
  type MarketplaceServicesPromo,
} from "@/components/organisms/commerce/MarketplaceBoard";
import { API } from "@/lib/api";
import type { ApiProduct } from "./productShowcase";
import type { MarketplaceSideBannerConfig } from "./productShowcase";

type ApiCategory = {
  id: string;
  slug?: string;
  name: string;
  icon?: string | null;
  productCount?: number;
  directProductCount?: number;
  _count?: { products?: number };
};

interface HomeCommerceDockProps {
  products: ApiProduct[];
  reels?: Array<{
    id: string;
    title?: string | null;
    caption?: string | null;
    videoUrl: string;
    thumbnailUrl?: string | null;
    organization?: { name?: string | null; logoUrl?: string | null } | null;
  }>;
  sideBanner?: MarketplaceSideBannerConfig | null;
  servicesPromo?: MarketplaceServicesPromo | null;
  projectBanners?: MarketplaceProjectBanner[];
}

const FALLBACK_CATEGORIES: MarketplaceCategory[] = [
  { id: "shopping", slug: "shopping", name: "Худалдаа", icon: "🛒" },
  { id: "food", slug: "food", name: "Хоол хүнс", icon: "🍽️" },
  { id: "beauty", slug: "beauty", name: "Загвар, гоо сайхан", icon: "✨" },
  { id: "tech", slug: "tech", name: "Цахилгаан бараа", icon: "📱" },
  { id: "home", slug: "home", name: "Гэр ахуй, тавилга", icon: "🏠" },
  { id: "health", slug: "health", name: "Эрүүл мэнд", icon: "🏥" },
];

export function HomeCommerceDock({
  products,
  reels = [],
  sideBanner,
  servicesPromo,
  projectBanners = [],
}: HomeCommerceDockProps) {
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    let mounted = true;

    fetch(`${API}/business-categories?level=0&hasProducts=1`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted && Array.isArray(data)) setApiCategories(data);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const productCategoryCounts = useMemo(
    () =>
      products.reduce((map, product) => {
        const category = product.businessCategory;
        if (!category) return map;
        const current = map.get(category.id) || {
          id: category.id,
          slug: category.slug,
          name: category.name,
          _count: { products: 0 },
        };
        current._count = { products: (current._count?.products || 0) + 1 };
        map.set(category.id, current);
        return map;
      }, new Map<string, MarketplaceCategory>()),
    [products],
  );

  const categories = useMemo(() => {
    const fromApi = apiCategories
      .map((category) => {
        const counted = productCategoryCounts.get(category.id);
        return {
          id: category.id,
          slug: category.slug,
          name: category.name,
          icon: category.icon || counted?.icon,
          _count: {
            products:
              category.productCount ??
              category._count?.products ??
              counted?._count?.products ??
              0,
          },
        };
      })
      .filter((category) => category.name)
      .slice(0, 6);

    if (fromApi.length) return fromApi;
    const fromProducts = Array.from(productCategoryCounts.values()).slice(0, 6);
    return fromProducts.length ? fromProducts : FALLBACK_CATEGORIES;
  }, [apiCategories, productCategoryCounts]);

  return (
    <MarketplaceBoard
      categories={categories}
      products={products}
      reels={reels}
      total={products.length}
      sideBanner={sideBanner}
      servicesPromo={servicesPromo}
      projectBanners={projectBanners}
      allHref="/products"
      categoryHref={(category) =>
        `/products?category=${encodeURIComponent(category.slug || category.id)}`
      }
    />
  );
}
