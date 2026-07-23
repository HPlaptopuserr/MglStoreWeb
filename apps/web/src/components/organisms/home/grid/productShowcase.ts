export const SHOWCASE_KEY = "product-showcase-shelves";
export const HOMEPAGE_FEATURED_PRODUCTS_KEY = "homepage-featured-products";
export const HOMEPAGE_FEATURED_PRODUCTS_LIMIT = 20;
export const MARKETPLACE_SIDE_BANNER_KEY = "marketplace-side-banner";
export const MARKETPLACE_SERVICES_PROMO_KEY = "marketplace-services-promo";

export type ShelfKind =
  | "BEST_SELLERS"
  | "NEW_ARRIVALS"
  | "EDITOR_PICK"
  | "DISCOUNTED"
  | "CUSTOM";

export type ProductShelf = {
  id: string;
  title: string;
  kind: ShelfKind;
  isActive: boolean;
  productIds: string[];
};

export type ApiProduct = {
  id: string;
  name: string;
  price: number;
  stock?: number | null;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  images: { id: string; url: string }[];
  organization: { id: string; name: string; logoUrl?: string } | null;
  discounts: { percent: number }[];
  businessCategory: { id: string; name: string; slug?: string } | null;
};

export type ResolvedShelf = ProductShelf & {
  products: ApiProduct[];
};

export function resolveHomepageFeaturedProducts(
  raw: string | undefined,
  products: ApiProduct[],
): ApiProduct[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const uniqueIds = [
      ...new Set(
        parsed
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter(Boolean),
      ),
    ];

    return uniqueIds
      .map((id) => productById.get(id))
      .filter((product): product is ApiProduct => Boolean(product))
      .slice(0, HOMEPAGE_FEATURED_PRODUCTS_LIMIT);
  } catch {
    return [];
  }
}

export type MarketplaceSideBannerConfig = {
  isActive: boolean;
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

export type MarketplaceServicesPromoConfig = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
};

export type MarketplaceProjectBannerConfig = {
  id: string;
  title: string;
  summary?: string;
  imageUrl: string;
};

type ProjectLike = {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  imageUrl?: unknown;
  imageUrls?: unknown;
  isActive?: unknown;
};

export function resolveProjectBanners(
  projects: ProjectLike[],
): MarketplaceProjectBannerConfig[] {
  const banners: MarketplaceProjectBannerConfig[] = [];

  for (const project of projects) {
    if (project?.isActive === false) continue;
    const imageUrls = Array.isArray(project.imageUrls) ? project.imageUrls : [];
    const image = [...imageUrls, project.imageUrl]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);

    if (!image) continue;

    banners.push({
      id: String(project.id || image),
      title: String(project.title || "MGL Store төсөл"),
      summary:
        typeof project.summary === "string" ? project.summary : undefined,
      imageUrl: image,
    });

    if (banners.length >= 4) break;
  }

  return banners;
}

export function parseMarketplaceSideBanner(
  raw?: string,
): MarketplaceSideBannerConfig | null {
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

export function parseMarketplaceServicesPromo(
  raw?: string,
): MarketplaceServicesPromoConfig | null {
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

export function parseShowcaseShelves(raw?: string): ProductShelf[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: String(item?.id || ""),
        title: String(item?.title || "Бүтээгдэхүүний мөр").trim(),
        kind: String(item?.kind || "CUSTOM") as ShelfKind,
        isActive: item?.isActive !== false,
        productIds: Array.isArray(item?.productIds)
          ? item.productIds.map((id: unknown) => String(id)).filter(Boolean)
          : [],
      }))
      .filter((shelf) => shelf.id && shelf.title);
  } catch {
    return [];
  }
}

export function resolveConfiguredShelves(
  shelves: ProductShelf[],
  products: ApiProduct[],
): ResolvedShelf[] {
  const productById = new Map(products.map((product) => [product.id, product]));

  return shelves
    .filter((shelf) => shelf.isActive && shelf.productIds.length > 0)
    .map((shelf) => ({
      ...shelf,
      products: shelf.productIds
        .map((id) => productById.get(id))
        .filter((product): product is ApiProduct => Boolean(product)),
    }))
    .filter((shelf) => shelf.products.length > 0);
}

export function buildFallbackShelves(products: ApiProduct[]): ResolvedShelf[] {
  const discounted = products.filter(
    (product) => product.discounts?.[0]?.percent,
  );
  const preorder = products.filter(
    (product) => product.supplyType === "CHINA_PREORDER",
  );
  const shelves: ResolvedShelf[] = [
    {
      id: "fallback-discounted",
      title: "Хямдралтай сонголтууд",
      kind: "DISCOUNTED",
      isActive: true,
      productIds: discounted.map((product) => product.id),
      products: discounted.slice(0, 12),
    },
    {
      id: "fallback-preorder",
      title: "Захиалгаар авах боломжтой",
      kind: "CUSTOM",
      isActive: true,
      productIds: preorder.map((product) => product.id),
      products: preorder.slice(0, 12),
    },
  ];

  return shelves.filter((shelf) => shelf.products.length > 0);
}
