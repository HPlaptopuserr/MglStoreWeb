"use client";

import { ProductCard } from "@mgl/ui";
import { addToCart } from "@/lib/cart";

interface Props {
  product: any;
  idx: number;
  onClick: () => void;
}

export const ProductCarouselItem = ({ product, idx, onClick }: Props) => {
  const discount = product.discounts?.[0]?.percent;
  const mainImage = product.images?.[0]?.url;

  const originalPrice = discount ? product.price : undefined;
  const finalPrice = discount ? Math.round(product.price * (1 - discount / 100)) : product.price;

  return (
    <div
      onClick={onClick}
      className="w-[82%] shrink-0 cursor-pointer sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
    >
      <ProductCard
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
        onAddToCart={() =>
          addToCart({
            id: product.id,
            name: product.name,
            price: finalPrice,
            image: mainImage,
            quantity: 1,
          })
        }
      />
    </div>
  );
};
