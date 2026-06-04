"use client";

import {
  MarketplaceBoard,
  type MarketplaceCategory,
  type MarketplaceProjectBanner,
  type MarketplaceProduct,
  type MarketplaceServicesPromo,
  type MarketplaceSideBanner,
} from "@/components/organisms/commerce/MarketplaceBoard";

type ProductSearchHeroProps = {
  categories: MarketplaceCategory[];
  activeCategory: string | null;
  searchQuery: string;
  total: number;
  products: MarketplaceProduct[];
  onCategoryClick: (categoryId: string | null) => void;
  sideBanner?: MarketplaceSideBanner | null;
  servicesPromo?: MarketplaceServicesPromo | null;
  projectBanners?: MarketplaceProjectBanner[];
};

export function ProductSearchHero(props: ProductSearchHeroProps) {
  return <MarketplaceBoard {...props} />;
}
