"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  GripVertical,
  ImagePlus,
  Images,
  LayoutGrid,
  Loader2,
  PackageSearch,
  PanelRight,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

const SHOWCASE_KEY = "product-showcase-shelves";
const HOMEPAGE_FEATURED_PRODUCTS_KEY = "homepage-featured-products";
const MARKETPLACE_SIDE_BANNER_KEY = "marketplace-side-banner";
const MARKETPLACE_SERVICES_PROMO_KEY = "marketplace-services-promo";
const AUTH_LOGIN_BANNER_KEY = "auth-login-banner";

type ShelfKind =
  | "BEST_SELLERS"
  | "NEW_ARRIVALS"
  | "EDITOR_PICK"
  | "DISCOUNTED"
  | "CUSTOM";

type ProductShelf = {
  id: string;
  title: string;
  kind: ShelfKind;
  isActive: boolean;
  productIds: string[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  images?: { id: string; url: string }[];
  organization?: { id: string; name: string } | null;
  businessCategory?: { id: string; name: string } | null;
};

type AdminPanel = "shelves" | "banners";

type MarketplaceSideBanner = {
  isActive: boolean;
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

type MarketplaceServicesPromo = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
};

type AuthLoginBanner = {
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

const SHELF_KIND_OPTIONS: { value: ShelfKind; label: string }[] = [
  { value: "BEST_SELLERS", label: "Хамгийн их зарагдаж буй бараа" },
  { value: "NEW_ARRIVALS", label: "Шинээр нэмэгдсэн" },
  { value: "EDITOR_PICK", label: "Админы онцлох сонголт" },
  { value: "DISCOUNTED", label: "Хямдралтай бараа" },
  { value: "CUSTOM", label: "Custom shelf" },
];

function createShelf(): ProductShelf {
  return {
    id: `shelf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Хамгийн их зарагдаж буй бараа",
    kind: "BEST_SELLERS",
    isActive: true,
    productIds: [],
  };
}

function parseShelves(raw?: string): ProductShelf[] {
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

function parseProductIds(raw?: string): string[] {
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
    ].slice(0, 10);
  } catch {
    return [];
  }
}

function createSideBanner(): MarketplaceSideBanner {
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

function parseSideBanner(raw?: string): MarketplaceSideBanner {
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

function createServicesPromo(): MarketplaceServicesPromo {
  return {
    imageUrl: "",
    eyebrow: "MGL үйлчилгээ",
    title: "MGL үйлчилгээний багцууд",
    subtitle: "MGL-ээс гаргаж буй хууль, маркетинг, HR үйлчилгээ",
    cta: "MGL үйлчилгээ",
  };
}

function parseServicesPromo(raw?: string): MarketplaceServicesPromo {
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

function createAuthLoginBanner(): AuthLoginBanner {
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

function parseAuthLoginBanner(raw?: string): AuthLoginBanner {
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

export default function ProductDevelopmentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shelves, setShelves] = useState<ProductShelf[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [sideBanner, setSideBanner] = useState<MarketplaceSideBanner>(() =>
    createSideBanner(),
  );
  const [servicesPromo, setServicesPromo] = useState<MarketplaceServicesPromo>(
    () => createServicesPromo(),
  );
  const [authLoginBanner, setAuthLoginBanner] = useState<AuthLoginBanner>(() =>
    createAuthLoginBanner(),
  );
  const [activePanel, setActivePanel] = useState<AdminPanel>("shelves");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      adminFetch(`${API}/site-settings/admin`).then((res) => res.json()),
      adminFetch(`${API}/products?limit=100`).then((res) => res.json()),
    ])
      .then(([settings, productData]) => {
        if (!mounted) return;
        const parsedShelves = parseShelves(settings?.[SHOWCASE_KEY]);
        setShelves(parsedShelves.length ? parsedShelves : [createShelf()]);
        setFeaturedProductIds(
          parseProductIds(settings?.[HOMEPAGE_FEATURED_PRODUCTS_KEY]),
        );
        setSideBanner(parseSideBanner(settings?.[MARKETPLACE_SIDE_BANNER_KEY]));
        setServicesPromo(
          parseServicesPromo(settings?.[MARKETPLACE_SERVICES_PROMO_KEY]),
        );
        setAuthLoginBanner(
          parseAuthLoginBanner(settings?.[AUTH_LOGIN_BANNER_KEY]),
        );
        setProducts(Array.isArray(productData) ? productData : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Өгөгдөл авахад алдаа гарлаа",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return products;
    return products.filter((product) => {
      const text = [
        product.name,
        product.organization?.name,
        product.businessCategory?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(value);
    });
  }, [products, query]);

  const activeShelfCount = shelves.filter((shelf) => shelf.isActive).length;
  const selectedProductCount = shelves.reduce(
    (total, shelf) => total + shelf.productIds.length,
    0,
  );
  const selectedFeaturedProducts = useMemo(() => {
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    return featuredProductIds
      .map((id) => productById.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [featuredProductIds, products]);
  const configuredBannerCount = [
    servicesPromo.imageUrl,
    sideBanner.imageUrl,
    authLoginBanner.imageUrl,
  ].filter(Boolean).length;

  const updateShelf = (id: string, patch: Partial<ProductShelf>) => {
    setShelves((current) =>
      current.map((shelf) =>
        shelf.id === id ? { ...shelf, ...patch } : shelf,
      ),
    );
    setSaved(false);
  };

  const toggleProduct = (shelfId: string, productId: string) => {
    setShelves((current) =>
      current.map((shelf) => {
        if (shelf.id !== shelfId) return shelf;
        const exists = shelf.productIds.includes(productId);
        return {
          ...shelf,
          productIds: exists
            ? shelf.productIds.filter((id) => id !== productId)
            : [...shelf.productIds, productId],
        };
      }),
    );
    setSaved(false);
  };

  const toggleFeaturedProduct = (productId: string) => {
    setFeaturedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      return current.length >= 10 ? current : [...current, productId];
    });
    setSaved(false);
  };

  const updateSideBanner = (patch: Partial<MarketplaceSideBanner>) => {
    setSideBanner((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const updateServicesPromo = (patch: Partial<MarketplaceServicesPromo>) => {
    setServicesPromo((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const updateAuthLoginBanner = (patch: Partial<AuthLoginBanner>) => {
    setAuthLoginBanner((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const uploadSideBanner = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingBanner(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Banner upload алдаа гарлаа");
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) throw new Error("Upload URL олдсонгүй");
      updateSideBanner({ imageUrl: body.url });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Banner upload алдаа гарлаа",
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const uploadServicesPromo = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingBanner(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Service promo upload алдаа гарлаа");
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) throw new Error("Upload URL олдсонгүй");
      updateServicesPromo({ imageUrl: body.url });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Service promo upload алдаа гарлаа",
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const uploadAuthLoginBanner = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingBanner(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Login banner upload алдаа гарлаа");
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) throw new Error("Upload URL олдсонгүй");
      updateAuthLoginBanner({ imageUrl: body.url });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login banner upload алдаа гарлаа",
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveShelves = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    const payload = shelves.map((shelf) => ({
      ...shelf,
      title: shelf.title.trim(),
      productIds: shelf.productIds.filter(Boolean),
    }));

    try {
      const res = await adminFetch(`${API}/site-settings/${SHOWCASE_KEY}`, {
        method: "PUT",
        body: JSON.stringify({ value: JSON.stringify(payload) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Хадгалахад алдаа гарлаа");
      }
      const featuredRes = await adminFetch(
        `${API}/site-settings/${HOMEPAGE_FEATURED_PRODUCTS_KEY}`,
        {
          method: "PUT",
          body: JSON.stringify({
            value: JSON.stringify(featuredProductIds.slice(0, 10)),
          }),
        },
      );
      if (!featuredRes.ok) {
        const body = await featuredRes.json().catch(() => ({}));
        throw new Error(
          body?.message || "Нүүр хуудасны сонголтыг хадгалахад алдаа гарлаа",
        );
      }
      const bannerRes = await adminFetch(
        `${API}/site-settings/${MARKETPLACE_SIDE_BANNER_KEY}`,
        {
          method: "PUT",
          body: JSON.stringify({ value: JSON.stringify(sideBanner) }),
        },
      );
      if (!bannerRes.ok) {
        const body = await bannerRes.json().catch(() => ({}));
        throw new Error(body?.message || "Banner хадгалахад алдаа гарлаа");
      }
      const servicePromoRes = await adminFetch(
        `${API}/site-settings/${MARKETPLACE_SERVICES_PROMO_KEY}`,
        {
          method: "PUT",
          body: JSON.stringify({ value: JSON.stringify(servicesPromo) }),
        },
      );
      if (!servicePromoRes.ok) {
        const body = await servicePromoRes.json().catch(() => ({}));
        throw new Error(
          body?.message || "Service promo хадгалахад алдаа гарлаа",
        );
      }
      const authBannerRes = await adminFetch(
        `${API}/site-settings/${AUTH_LOGIN_BANNER_KEY}`,
        {
          method: "PUT",
          body: JSON.stringify({ value: JSON.stringify(authLoginBanner) }),
        },
      );
      if (!authBannerRes.ok) {
        const body = await authBannerRes.json().catch(() => ({}));
        throw new Error(
          body?.message || "Login banner хадгалахад алдаа гарлаа",
        );
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6 md:p-7">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-72 rounded-bl-full bg-orange-50" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange-600">
                <PackageSearch className="h-4 w-4" />
                Merchandising control
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">
                Бүтээгдэхүүн хөгжүүлэлт
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Home болон products дээр харагдах ecommerce showcase-ийг эндээс
                удирдана. Барааны үндсэн logic, захиалга, нөөцөөс тусдаа зөвхөн
                харагдах байршил, banner, онцлох мөрүүдийг засна.
              </p>
            </div>

            <button
              type="button"
              onClick={saveShelves}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-orange-500 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Бүх тохиргоо хадгалах
            </button>
          </div>
        </div>

        <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
          <div className="border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950">
              {activeShelfCount}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Идэвхтэй мөр
            </p>
          </div>
          <div className="border-b border-slate-100 p-5 sm:border-b-0 sm:border-r">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950">
              {featuredProductIds.length} / {selectedProductCount}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Урд / мөрөнд сонгосон
            </p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Images className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950">
              {configuredBannerCount}/3
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Зурагтай banner
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Амжилттай хадгаллаа.
        </div>
      )}

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-2">
        <button
          type="button"
          onClick={() => setActivePanel("shelves")}
          className={`flex items-center gap-4 rounded-2xl p-4 text-left transition ${
            activePanel === "shelves"
              ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              activePanel === "shelves"
                ? "bg-white/10 text-orange-200"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black">
              Бүтээгдэхүүний мөрүүд
            </span>
            <span
              className={`mt-1 block text-xs font-semibold ${
                activePanel === "shelves" ? "text-white/65" : "text-slate-400"
              }`}
            >
              Home/products дээр гаргах row, барааны дараалал
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel("banners")}
          className={`flex items-center gap-4 rounded-2xl p-4 text-left transition ${
            activePanel === "banners"
              ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              activePanel === "banners"
                ? "bg-white/10 text-orange-200"
                : "bg-sky-50 text-sky-600"
            }`}
          >
            <Settings2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black">Marketplace banner</span>
            <span
              className={`mt-1 block text-xs font-semibold ${
                activePanel === "banners" ? "text-white/65" : "text-slate-400"
              }`}
            >
              MGL үйлчилгээ, right panel, login banner
            </span>
          </span>
        </button>
      </div>

      {activePanel === "shelves" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm ring-4 ring-orange-50">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-600">
                    <Sparkles className="h-4 w-4" />
                    Нүүр хуудасны урд хэсэг
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    Онцлох бүтээгдэхүүн
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Энд сонгосон бараа web-ийн нүүр хуудасны урд carousel-д
                    сонгосон дарааллаараа харагдана. Хамгийн ихдээ 10 бараа
                    сонгоно.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedProductIds([]);
                    setSaved(false);
                  }}
                  disabled={featuredProductIds.length === 0}
                  className="text-xs font-black text-slate-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Сонголт цэвэрлэх
                </button>
              </div>

              {selectedFeaturedProducts.length > 0 && (
                <div className="mb-4 grid gap-2 rounded-xl bg-orange-50/60 p-3 sm:grid-cols-2">
                  {selectedFeaturedProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-orange-100"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="truncate">{product.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const selectedIndex = featuredProductIds.indexOf(product.id);
                  const selected = selectedIndex >= 0;
                  const selectionDisabled =
                    !selected && featuredProductIds.length >= 10;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleFeaturedProduct(product.id)}
                      disabled={selectionDisabled}
                      className={`flex items-center gap-3 rounded-xl border bg-white p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        selected
                          ? "border-orange-300 ring-2 ring-orange-100"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {product.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <PackageSearch className="m-3 h-6 w-6 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {product.name}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {product.organization?.name || "MGL Store"} · ₮
                          {product.price.toLocaleString()}
                        </p>
                      </div>
                      {selected && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
                          {selectedIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {shelves.map((shelf, shelfIndex) => (
              <section
                key={shelf.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-black text-slate-400">
                      #{shelfIndex + 1}
                    </div>
                  </div>

                  <input
                    value={shelf.title}
                    onChange={(event) =>
                      updateShelf(shelf.id, { title: event.target.value })
                    }
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    placeholder="Жишээ: Хамгийн их зарагдаж буй бараа"
                  />

                  <select
                    value={shelf.kind}
                    onChange={(event) =>
                      updateShelf(shelf.id, {
                        kind: event.target.value as ShelfKind,
                      })
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  >
                    {SHELF_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={shelf.isActive}
                      onChange={(event) =>
                        updateShelf(shelf.id, {
                          isActive: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-orange-500"
                    />
                    Идэвхтэй
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShelves((current) =>
                        current.filter((item) => item.id !== shelf.id),
                      )
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 px-3 text-red-500 transition hover:bg-red-50"
                    aria-label="Устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-700">
                    Сонгосон бараа: {shelf.productIds.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => updateShelf(shelf.id, { productIds: [] })}
                    className="text-xs font-bold text-slate-400 hover:text-red-500"
                  >
                    Цэвэрлэх
                  </button>
                </div>

                <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const selected = shelf.productIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(shelf.id, product.id)}
                        className={`flex items-center gap-3 rounded-xl border bg-white p-2 text-left transition ${
                          selected
                            ? "border-orange-300 ring-2 ring-orange-100"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {product.images?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <PackageSearch className="m-3 h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {product.name}
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-400">
                            {product.organization?.name || "MGL Store"} · ₮
                            {product.price.toLocaleString()}
                          </p>
                        </div>
                        {selected && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <button
              type="button"
              onClick={() =>
                setShelves((current) => [...current, createShelf()])
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
            >
              <Plus className="h-4 w-4" />
              Шинэ мөр нэмэх
            </button>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-3 block text-sm font-black text-slate-700">
              Бараа хайх
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Нэр, байгууллага, ангилал..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              <p className="font-black text-slate-700">Зөвлөмж</p>
              <p className="mt-1">
                Netflix-style мөр шиг ажиллана: гарчиг нь row title, сонгосон
                бүтээгдэхүүнүүд нь тухайн мөрөнд дарааллаараа харагдана.
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-sm leading-6 text-orange-900">
              <p className="font-black text-slate-900">
                Энэ хэсэг юунд нөлөөлөх вэ?
              </p>
              <p className="mt-1 font-semibold">
                Энд сонгосон бараанууд зөвхөн web-ийн showcase мөрүүдэд
                харагдана. Барааны үнэ, нөөц, захиалга, vendor approval-д
                нөлөөлөхгүй.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                    <Sparkles className="h-4 w-4" />
                    MGL service card
                  </div>
                  <h3 className="text-xl font-black text-slate-950">
                    MGL үйлчилгээний card
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Marketplace board-ийн зүүн дээд талд харагдах үйлчилгээний
                    сурталчилгаа. Энэ card дарахад web дээр MGL үйлчилгээ page
                    рүү аваачна.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateServicesPromo({ imageUrl: "" })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                >
                  <ImagePlus className="h-4 w-4" />
                  Default
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
                <label className="group relative flex min-h-[250px] cursor-pointer overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
                  {servicesPromo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={servicesPromo.imageUrl}
                      alt={servicesPromo.title}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_74%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(135deg,#111827,#fb5b2f)]" />
                  )}
                  <div
                    className={`absolute inset-0 ${
                      servicesPromo.imageUrl
                        ? "bg-gradient-to-t from-slate-950/86 via-slate-950/22 to-slate-950/10"
                        : "bg-gradient-to-br from-slate-950/78 via-slate-950/30 to-orange-500/45"
                    }`}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex min-w-0 max-w-full items-center rounded-2xl bg-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-orange-100 backdrop-blur-sm">
                        <span className="truncate">
                          {servicesPromo.eyebrow}
                        </span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/14 backdrop-blur-sm">
                        <ImagePlus className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-3xl font-black leading-tight">
                        {servicesPromo.title}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-white/78">
                        {servicesPromo.subtitle}
                      </p>
                      <span className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/14 px-4 py-2 text-sm font-black backdrop-blur-sm">
                        <span className="truncate">
                          {uploadingBanner
                            ? "Uploading..."
                            : "Зураг upload хийх"}
                        </span>
                        <ImagePlus className="h-4 w-4 shrink-0" />
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadServicesPromo}
                    disabled={uploadingBanner}
                    className="sr-only"
                  />
                </label>

                <div className="grid gap-3">
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Label
                    <input
                      value={servicesPromo.eyebrow}
                      onChange={(event) =>
                        updateServicesPromo({ eyebrow: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Гарчиг
                    <input
                      value={servicesPromo.title}
                      onChange={(event) =>
                        updateServicesPromo({ title: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Тайлбар
                    <textarea
                      value={servicesPromo.subtitle}
                      onChange={(event) =>
                        updateServicesPromo({ subtitle: event.target.value })
                      }
                      rows={4}
                      className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case leading-6 tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Button text
                    <input
                      value={servicesPromo.cta}
                      onChange={(event) =>
                        updateServicesPromo({ cta: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
                    <PanelRight className="h-4 w-4" />
                    Right panel campaign
                  </div>
                  <h3 className="text-xl font-black text-slate-950">
                    Баруун panel banner
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Login panel-ийн доорх хоосон зайд харагдах campaign. Image
                    байвал зураг, байхгүй бол default gradient ашиглана.
                  </p>
                </div>
                <label className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    checked={sideBanner.isActive}
                    onChange={(event) =>
                      updateSideBanner({ isActive: event.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  Идэвхтэй
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
                <label className="group relative flex min-h-[230px] cursor-pointer overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
                  {sideBanner.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sideBanner.imageUrl}
                      alt={sideBanner.title}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.45),transparent_30%),linear-gradient(135deg,#111827,#f97316)]" />
                  )}
                  <div
                    className={`absolute inset-0 ${
                      sideBanner.imageUrl
                        ? "bg-gradient-to-t from-slate-950/84 via-slate-950/24 to-slate-950/10"
                        : "bg-gradient-to-br from-slate-950/75 to-orange-500/40"
                    }`}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex min-w-0 max-w-full rounded-2xl bg-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-100 backdrop-blur-sm">
                        <span className="truncate">{sideBanner.eyebrow}</span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/14 backdrop-blur-sm">
                        <ImagePlus className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-2xl font-black leading-tight">
                        {sideBanner.title}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/75">
                        {sideBanner.subtitle}
                      </p>
                      <span className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/14 px-4 py-2 text-sm font-black backdrop-blur-sm">
                        <span className="truncate">
                          {uploadingBanner
                            ? "Uploading..."
                            : "Зураг upload хийх"}
                        </span>
                        <ImagePlus className="h-4 w-4 shrink-0" />
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadSideBanner}
                    disabled={uploadingBanner}
                    className="sr-only"
                  />
                </label>

                <div className="grid gap-3">
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Label
                    <input
                      value={sideBanner.eyebrow}
                      onChange={(event) =>
                        updateSideBanner({ eyebrow: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Гарчиг
                    <input
                      value={sideBanner.title}
                      onChange={(event) =>
                        updateSideBanner({ title: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Тайлбар
                    <textarea
                      value={sideBanner.subtitle}
                      onChange={(event) =>
                        updateSideBanner({ subtitle: event.target.value })
                      }
                      rows={3}
                      className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case leading-6 tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      CTA
                      <input
                        value={sideBanner.cta}
                        onChange={(event) =>
                          updateSideBanner({ cta: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Link
                      <input
                        value={sideBanner.href}
                        onChange={(event) =>
                          updateSideBanner({ href: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSideBanner({ imageUrl: "" })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Default gradient ашиглах
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                    <Images className="h-4 w-4" />
                    Login / auth banner
                  </div>
                  <h3 className="text-xl font-black text-slate-950">
                    Нэвтрэх modal-ийн баруун banner
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    /login page болон header-ээс нээгдэх login modal-ийн баруун
                    талын зураг, текст, social холбоос.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateAuthLoginBanner({ imageUrl: "" })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                >
                  <ImagePlus className="h-4 w-4" />
                  Default
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
                <label className="group relative flex min-h-[300px] cursor-pointer overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
                  {authLoginBanner.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={authLoginBanner.imageUrl}
                      alt={authLoginBanner.title}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,#f59e0b,#f97316,#ef4444)]" />
                  )}
                  <div
                    className={`absolute inset-0 ${
                      authLoginBanner.imageUrl
                        ? "bg-gradient-to-t from-slate-950/86 via-slate-950/28 to-slate-950/12"
                        : "bg-gradient-to-br from-orange-500/24 to-red-500/35"
                    }`}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between p-6 text-center">
                    <span className="mx-auto inline-flex max-w-full rounded-2xl bg-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
                      <span className="truncate">
                        {authLoginBanner.eyebrow}
                      </span>
                    </span>
                    <div>
                      <p className="text-3xl font-black leading-tight">
                        {authLoginBanner.title}
                      </p>
                      <p className="mt-4 line-clamp-4 text-base font-semibold leading-7 text-white/86">
                        "{authLoginBanner.quote}"
                      </p>
                      <p className="mt-5 text-lg font-black">
                        {authLoginBanner.author}
                      </p>
                      <p className="text-sm font-semibold text-white/70">
                        {authLoginBanner.role}
                      </p>
                    </div>
                    <span className="mx-auto inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/14 px-4 py-2 text-sm font-black backdrop-blur-sm">
                      <span className="truncate">
                        {uploadingBanner ? "Uploading..." : "Зураг upload хийх"}
                      </span>
                      <ImagePlus className="h-4 w-4 shrink-0" />
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAuthLoginBanner}
                    disabled={uploadingBanner}
                    className="sr-only"
                  />
                </label>

                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Label
                      <input
                        value={authLoginBanner.eyebrow}
                        onChange={(event) =>
                          updateAuthLoginBanner({ eyebrow: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      CTA
                      <input
                        value={authLoginBanner.cta}
                        onChange={(event) =>
                          updateAuthLoginBanner({ cta: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Гарчиг
                    <input
                      value={authLoginBanner.title}
                      onChange={(event) =>
                        updateAuthLoginBanner({ title: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Quote
                    <textarea
                      value={authLoginBanner.quote}
                      onChange={(event) =>
                        updateAuthLoginBanner({ quote: event.target.value })
                      }
                      rows={4}
                      className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case leading-6 tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Author
                      <input
                        value={authLoginBanner.author}
                        onChange={(event) =>
                          updateAuthLoginBanner({ author: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Role
                      <input
                        value={authLoginBanner.role}
                        onChange={(event) =>
                          updateAuthLoginBanner({ role: event.target.value })
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    CTA link
                    <input
                      value={authLoginBanner.href}
                      onChange={(event) =>
                        updateAuthLoginBanner({ href: event.target.value })
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={authLoginBanner.socialLinks.facebook}
                      onChange={(event) =>
                        updateAuthLoginBanner({
                          socialLinks: {
                            ...authLoginBanner.socialLinks,
                            facebook: event.target.value,
                          },
                        })
                      }
                      placeholder="Facebook URL"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-orange-300"
                    />
                    <input
                      value={authLoginBanner.socialLinks.x}
                      onChange={(event) =>
                        updateAuthLoginBanner({
                          socialLinks: {
                            ...authLoginBanner.socialLinks,
                            x: event.target.value,
                          },
                        })
                      }
                      placeholder="X URL"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-orange-300"
                    />
                    <input
                      value={authLoginBanner.socialLinks.linkedin}
                      onChange={(event) =>
                        updateAuthLoginBanner({
                          socialLinks: {
                            ...authLoginBanner.socialLinks,
                            linkedin: event.target.value,
                          },
                        })
                      }
                      placeholder="LinkedIn URL"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-orange-300"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <Images className="h-4 w-4" />
              Хаана харагдах вэ
            </div>
            <div className="space-y-3 text-sm font-semibold leading-6 text-slate-500">
              <p>
                <span className="font-black text-slate-900">
                  MGL үйлчилгээ card
                </span>{" "}
                нь marketplace board-ийн эхний том card дээр харагдана.
              </p>
              <p>
                <span className="font-black text-slate-900">
                  Баруун panel banner
                </span>{" "}
                нь login/user panel-ийн доод сул зайг campaign болгон ашиглана.
              </p>
              <p>
                <span className="font-black text-slate-900">Login banner</span>{" "}
                нь /login page болон бүх нэвтрэх modal-ийн баруун талын visual
                хэсэгт харагдана.
              </p>
              <p>
                Хадгалах товч нь бүх banner болон бүтээгдэхүүний мөрүүдийг нэг
                дор хадгална.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
