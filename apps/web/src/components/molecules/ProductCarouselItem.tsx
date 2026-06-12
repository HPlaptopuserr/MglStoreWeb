"use client";

import { ProductCard } from "@mgl/ui";
import { resolveApiAssetUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { resolveMemberPricing } from "@/lib/member-pricing";

interface Props {
  product: any;
  idx: number;
  onClick: () => void;
}

export const ProductCarouselItem = ({ product, idx, onClick }: Props) => {
  const { user } = useAuth();
  const mainImage = resolveApiAssetUrl(product.images?.[0]?.url);
  const isMember = Boolean(user?.membership?.active || user?.isPrime);
  const pricing = resolveMemberPricing(product.price, product.discounts, isMember);

  return (
    <div
      onClick={onClick}
      className="min-w-0 cursor-pointer"
    >
      <ProductCard
        href={`/products/${product.id}`}
        image={mainImage}
        price={pricing.price}
        name={product.name}
        category={
          product.businessCategory?.name ??
          ["Performance", "Sportswear", "Originals"][idx % 3]
        }
        originalPrice={pricing.originalPrice ?? undefined}
        memberDiscountLabel={pricing.label}
        storeName={product.organization?.name}
        stock={product.stock}
        isPreorder={product.supplyType === "CHINA_PREORDER"}
        preorderLeadTimeDays={product.preorderLeadTimeDays}
        isPrime={idx % 5 === 0}
        showCartAction={false}
      />
    </div>
  );
};
