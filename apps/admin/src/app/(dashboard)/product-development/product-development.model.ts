export const SHOWCASE_KEY = "product-showcase-shelves";
export const HOMEPAGE_FEATURED_PRODUCTS_KEY = "homepage-featured-products";
export const HOMEPAGE_FEATURED_PRODUCTS_LIMIT = 20;
export const MARKETPLACE_SIDE_BANNER_KEY = "marketplace-side-banner";
export const MARKETPLACE_SERVICES_PROMO_KEY = "marketplace-services-promo";
export const AUTH_LOGIN_BANNER_KEY = "auth-login-banner";

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

export type Product = {
  id: string;
  name: string;
  price: number;
  images?: { id: string; url: string }[];
  organization?: { id: string; name: string } | null;
  businessCategory?: { id: string; name: string } | null;
};

export type AdminPanel = "shelves" | "banners";

export type MarketplaceSideBanner = {
  isActive: boolean;
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

export type MarketplaceServicesPromo = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
};

export type AuthLoginBanner = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  quote: string;
  author: string;
  role: string;
  cta: string;
  href: string;
  socialLinks: {
    facebook: string;
    x: string;
    linkedin: string;
  };
};

export const SHELF_KIND_OPTIONS: { value: ShelfKind; label: string }[] = [
  { value: "BEST_SELLERS", label: "Хамгийн их зарагдаж буй бараа" },
  { value: "NEW_ARRIVALS", label: "Шинээр нэмэгдсэн" },
  { value: "EDITOR_PICK", label: "Админы онцлох сонголт" },
  { value: "DISCOUNTED", label: "Хямдралтай бараа" },
  { value: "CUSTOM", label: "Custom shelf" },
];

export function createShelf(): ProductShelf {
  return {
    id: `shelf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Хамгийн их зарагдаж буй бараа",
    kind: "BEST_SELLERS",
    isActive: true,
    productIds: [],
  };
}

export function parseShelves(raw?: string): ProductShelf[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id || `shelf-${Math.random().toString(16).slice(2)}`),
        title: String(item?.title || "Бүтээгдэхүүний мөр"),
        kind: String(item?.kind || "CUSTOM") as ShelfKind,
        isActive: item?.isActive !== false,
        productIds: Array.isArray(item?.productIds)
          ? item.productIds.map((id: unknown) => String(id)).filter(Boolean)
          : [],
      }))
      .filter((item) => item.title.trim());
  } catch {
    return [];
  }
}

export function parseProductIds(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter(Boolean),
      ),
    ].slice(0, HOMEPAGE_FEATURED_PRODUCTS_LIMIT);
  } catch {
    return [];
  }
}

export function createSideBanner(): MarketplaceSideBanner {
  return {
    isActive: true,
    imageUrl: "",
    eyebrow: "Онцлох санал",
    title: "Өнөөдрийн hot deal",
    subtitle: "Баруун хэсгийн хоосон зайг campaign banner болгож ашиглана.",
    cta: "Дэлгэрэнгүй",
    href: "/products?discount=1&sort=discount",
  };
}

export function parseSideBanner(raw?: string): MarketplaceSideBanner {
  const fallback = createSideBanner();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      isActive: parsed.isActive !== false,
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || fallback.eyebrow),
      title: String(parsed.title || fallback.title),
      subtitle: String(parsed.subtitle || fallback.subtitle),
      cta: String(parsed.cta || fallback.cta),
      href: String(parsed.href || fallback.href),
    };
  } catch {
    return fallback;
  }
}

export function createServicesPromo(): MarketplaceServicesPromo {
  return {
    imageUrl: "",
    eyebrow: "MGL үйлчилгээ",
    title: "MGL үйлчилгээний багцууд",
    subtitle: "MGL-ээс гаргаж буй хууль, маркетинг, HR үйлчилгээ",
    cta: "MGL үйлчилгээ",
  };
}

export function parseServicesPromo(raw?: string): MarketplaceServicesPromo {
  const fallback = createServicesPromo();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || fallback.eyebrow),
      title: String(parsed.title || fallback.title),
      subtitle: String(parsed.subtitle || fallback.subtitle),
      cta: String(parsed.cta || fallback.cta),
    };
  } catch {
    return fallback;
  }
}

export function createAuthLoginBanner(): AuthLoginBanner {
  return {
    imageUrl: "",
    eyebrow: "MGL Store",
    title: "Хэрэглэгчид юу хэлдэг вэ?",
    quote:
      "Энэ платформ маш ойлгомжтой, энгийн интерфейстэй. Миний бизнесийн онлайн борлуулалтад их тус болсон.",
    author: "Мөнх Баатар",
    role: "MGL Store хэрэглэгч",
    cta: "Бидэнтэй нэгдэх",
    href: "/",
    socialLinks: {
      facebook: "",
      x: "",
      linkedin: "",
    },
  };
}

export function parseAuthLoginBanner(raw?: string): AuthLoginBanner {
  const fallback = createAuthLoginBanner();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const socials =
      parsed.socialLinks && typeof parsed.socialLinks === "object"
        ? parsed.socialLinks
        : {};
    return {
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || fallback.eyebrow),
      title: String(parsed.title || fallback.title),
      quote: String(parsed.quote || fallback.quote),
      author: String(parsed.author || fallback.author),
      role: String(parsed.role || fallback.role),
      cta: String(parsed.cta || fallback.cta),
      href: String(parsed.href || fallback.href),
      socialLinks: {
        facebook: String(socials.facebook || ""),
        x: String(socials.x || ""),
        linkedin: String(socials.linkedin || ""),
      },
    };
  } catch {
    return fallback;
  }
}
