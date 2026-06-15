"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { resolveMemberPricing } from "@/lib/member-pricing";
import { ProductDetailShell, type ProductDetailProduct } from "./_components/ProductDetailShell";

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

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductDetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetailProduct[]>([]);
  const [vendorProducts, setVendorProducts] = useState<ProductDetailProduct[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setProduct(data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

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
      const response = await fetch(
        `${API}/products/${encodeURIComponent(product.id)}/recommendations?limit=8`,
      );
      const data = response.ok ? await response.json() : {};
      const normalize = (items: unknown) =>
        (Array.isArray(items) ? (items as ProductDetailProduct[]) : [])
          .filter((item) => item.id !== product.id)
          .slice(0, 4);

      setRelatedProducts(normalize(data.relatedProducts));
      setVendorProducts(normalize(data.vendorProducts));
    };

    loadRecommendations().catch(() => {
      setRelatedProducts([]);
      setVendorProducts([]);
    });
  }, [product]);

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
  };

  const shareProduct = async () => {
    if (!product) return;
    const url = `${window.location.origin}/products/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description ?? product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
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

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-lg font-semibold text-slate-400">Бараа олдсонгүй</p>
        <Link href="/products" className="text-sm font-bold text-orange-600 hover:text-orange-700">
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
      onAddToCart={() => {
        if (isOutOfStock) return;
        addToCart({
          id: product.id,
          name: product.name,
          price: discountedPrice,
          originalPrice,
          memberDiscountPercent: pricing.active ? pricing.percent : null,
          image: images[0]?.url,
          quantity: 1,
        });
      }}
      onToggleWishlist={toggleWishlist}
      onShare={shareProduct}
    />
  );
}
