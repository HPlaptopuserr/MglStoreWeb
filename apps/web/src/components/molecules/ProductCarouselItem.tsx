"use client";

import { ProductCard } from "@mgl/ui";
import { resolveApiAssetUrl } from "@/lib/api";

interface Props {
  product: any;
  idx: number;
  onClick: () => void;
}

export const ProductCarouselItem = ({ product, idx, onClick }: Props) => {
  const discount = product.discounts?.[0]?.percent;
  const mainImage = resolveApiAssetUrl(product.images?.[0]?.url);

  const originalPrice = discount ? product.price : undefined;
  const finalPrice = discount ? Math.round(product.price * (1 - discount / 100)) : product.price;

  return (
    <div
      onClick={onClick}
      className="min-w-0 cursor-pointer"
    >
      <ProductCard
        href={`/products/${product.id}`}
        image={mainImage}
        price={finalPrice}
        name={product.name}
        category={
          product.businessCategory?.name ??
          ["Performance", "Sportswear", "Originals"][idx % 3]
        }
        originalPrice={originalPrice}
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
