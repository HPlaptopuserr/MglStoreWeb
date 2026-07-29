"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { resolveMemberPricing } from "@/lib/member-pricing";
import { trackMetaCommerceEvent } from "@/lib/meta-events";
import {
  appendProductVisitorId,
  trackProductInteraction,
} from "@/lib/product-interest";
import {
  ProductDetailShell,
  type ProductDetailProduct,
} from "./_components/ProductDetailShell";
import { ProductMaintenanceState } from "@/components/organisms/commerce/ProductMaintenanceState";
import {
  findLocalCatalogProduct,
  LOCAL_MOCK_CATALOG_ENABLED,
} from "@/lib/local-product-catalog";

const WEB_PRODUCTS_SETTING_KEY = "web-products-enabled";

function useCountdown(target?: string | null) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!target) return;
    const end = new Date(target).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      setTime({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return time;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, authFetch } = useAuth();
  const [product, setProduct] = useState<ProductDetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [webProductsEnabled, setWebProductsEnabled] = useState<boolean | null>(
    null,
  );
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<
    ProductDetailProduct[]
  >([]);
  const [vendorProducts, setVendorProducts] = useState<ProductDetailProduct[]>(
    [],
  );

  useEffect(() => {
    setLoading(true);
    const localProduct = LOCAL_MOCK_CATALOG_ENABLED
      ? findLocalCatalogProduct(id)
      : null;
    if (localProduct) {
      Promise.resolve().then(() => {
        setProduct({
          ...localProduct,
          discounts: localProduct.discounts.map((discount) => ({
            ...discount,
            validUntil: "2027-12-31T23:59:59.000Z",
          })),
        });
        setWebProductsEnabled(true);
        setLoading(false);
      });
      return;
    }

    Promise.all([
      authFetch(`${API}/products/${id}`).then((response) =>
        response.ok ? response.json() : null,
      ),
      fetch(`${API}/site-settings`, { cache: "no-store" }).then(
        async (response) => {
          if (!response.ok) return true;
          const settings = (await response.json()) as Record<string, string>;
          const raw = settings[WEB_PRODUCTS_SETTING_KEY];
          return raw === undefined || raw === null || raw === ""
            ? true
            : raw === "1" || raw === "true" || raw === "on";
        },
      ),
    ])
      .then(([data, enabled]) => {
        setProduct(data);
        setWebProductsEnabled(enabled);
      })
      .catch(() => {
        setProduct(null);
        setWebProductsEnabled(true);
      })
      .finally(() => setLoading(false));
  }, [authFetch, id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mgl:wishlist");
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setWishlisted(ids.includes(id));
    } catch {
      setWishlisted(false);
    }
  }, [id]);

  useEffect(() => {
    if (!product) return;

    const loadRecommendations = async () => {
      const params = appendProductVisitorId(
        new URLSearchParams({ limit: "8" }),
      );
      const response = await authFetch(
        `${API}/products/${encodeURIComponent(product.id)}/recommendations?${params.toString()}`,
      );
      const data = response.ok ? await response.json() : {};
      const normalize = (items: unknown) =>
        (Array.isArray(items) ? (items as ProductDetailProduct[]) : [])
          .filter((item) => item.id !== product.id)
          .slice(0, 4);

      setRelatedProducts(normalize(data.relatedProducts));
      setVendorProducts(normalize(data.vendorProducts));
    };

    trackProductInteraction({
      type: "VIEW",
      productId: product.id,
      businessCategoryId: product.businessCategory?.id,
      organizationId: product.organization?.id,
      source: "product-detail",
    });
    trackMetaCommerceEvent("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      currency: "MNT",
      value: Number(product.price),
    });

    loadRecommendations().catch(() => {
      setRelatedProducts([]);
      setVendorProducts([]);
    });
  }, [authFetch, product]);

  const discount = product?.discounts?.[0];
  const isMember = Boolean(user?.membership?.active || user?.isPrime);
  const pricing = product
    ? resolveMemberPricing(product.price, product.discounts, isMember)
    : resolveMemberPricing(0, [], false);
  const discountedPrice = pricing.price;
  const originalPrice = pricing.originalPrice;
  const savings = pricing.savings;
  const countdown = useCountdown(discount?.validUntil);
  const images = product?.images ?? [];
  const isPreorder = product?.supplyType === "CHINA_PREORDER";
  const isOutOfStock = !isPreorder && product?.stock === 0;

  const toggleWishlist = () => {
    if (!product) return;
    let ids: string[] = [];
    try {
      const raw = localStorage.getItem("mgl:wishlist");
      ids = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      ids = [];
    }
    const next = ids.includes(product.id)
      ? ids.filter((item) => item !== product.id)
      : [...ids, product.id];
    localStorage.setItem("mgl:wishlist", JSON.stringify(next));
    setWishlisted(next.includes(product.id));
    if (next.includes(product.id)) {
      trackProductInteraction({
        type: "WISHLIST",
        productId: product.id,
        businessCategoryId: product.businessCategory?.id,
        organizationId: product.organization?.id,
        source: "product-detail",
      });
    }
  };

  const shareProduct = async () => {
    if (!product) return;
    const url = `${window.location.origin}/products/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description ?? product.name,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
      trackProductInteraction({
        type: "SHARE",
        productId: product.id,
        businessCategoryId: product.businessCategory?.id,
        organizationId: product.organization?.id,
        source: "product-detail",
      });
    } catch {
      // User cancelled the native share sheet.
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  if (webProductsEnabled === false) {
    return <ProductMaintenanceState onRetry={() => window.location.reload()} />;
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-lg font-semibold text-slate-400">Бараа олдсонгүй</p>
        <Link
          href="/products"
          className="text-sm font-bold text-orange-600 hover:text-orange-700"
        >
          Бүх бараа харах
        </Link>
      </div>
    );
  }

  return (
    <ProductDetailShell
      product={product}
      activeImg={activeImg}
      setActiveImg={setActiveImg}
      discountedPrice={discountedPrice}
      originalPrice={originalPrice}
      savings={savings}
      countdown={countdown}
      wishlisted={wishlisted}
      shareCopied={shareCopied}
      isPreorder={isPreorder}
      isOutOfStock={Boolean(isOutOfStock)}
      vendorProducts={vendorProducts}
      relatedProducts={relatedProducts}
      isMember={isMember}
      onAddToCart={(quantity) => {
        if (isOutOfStock) return;
        addToCart({
          id: product.id,
          name: product.name,
          price: discountedPrice,
          originalPrice,
          memberDiscountPercent: pricing.active ? pricing.percent : null,
          supplyType: product.supplyType,
          image: images[0]?.url,
          quantity,
        });
        trackMetaCommerceEvent("AddToCart", {
          content_ids: [product.id],
          content_name: product.name,
          content_type: "product",
          currency: "MNT",
          value: discountedPrice,
          num_items: quantity,
        });
      }}
      onToggleWishlist={toggleWishlist}
      onShare={shareProduct}
    />
  );
}
