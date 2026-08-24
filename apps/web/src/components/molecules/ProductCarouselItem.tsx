"use client";

import { ProductCard } from "@mgl/ui";
import { resolveApiAssetUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  resolveMarketplacePricingAudience,
  resolveMemberPricing,
} from "@/lib/member-pricing";
import type { CarouselProduct } from "./product-carousel.types";

interface Props {
  product: CarouselProduct;
  idx: number;
}

export const ProductCarouselItem = ({ product, idx }: Props) => {
  const { user } = useAuth();
  const mainImage = resolveApiAssetUrl(product.images?.[0]?.url);
  const pricing = resolveMemberPricing(
    product.price,
    product.discounts,
    resolveMarketplacePricingAudience(user),
    product.supplyType,
  );

  return (
    <div className="min-w-0">
      <ProductCard
        href={`/products/${encodeURIComponent(product.id)}`}
        image={mainImage}
        price={pricing.price}
        name={product.name}
        category={
          product.businessCategory?.name ??
          ["Performance", "Sportswear", "Originals"][idx % 3]
        }
        originalPrice={pricing.originalPrice ?? undefined}
        memberDiscountLabel={pricing.label}
        storeName={product.organization?.name ?? undefined}
        stock={product.stock ?? 0}
        isPreorder={product.supplyType === "CHINA_PREORDER"}
        preorderLeadTimeDays={product.preorderLeadTimeDays}
        preorderCapacity={product.preorderCapacity}
        preorderParticipantCount={product.preorderParticipantCount}
        preorderIsFull={product.preorderIsFull}
        isPrime={idx % 5 === 0}
        showCartAction={false}
      />
    </div>
  );
};
