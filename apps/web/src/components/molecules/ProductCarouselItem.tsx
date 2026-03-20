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

  const originalPrice = discount
    ? product.price / (1 - discount / 100)
    : undefined;

  const finalPrice = discount
    ? Math.round(product.price * (1 - discount / 100))
    : product.price;

  return (
    <div
      onClick={onClick}
      className="shrink-0 w-[calc(48%-3px)] sm:w-[calc(26.667%-4px)] md:w-[calc(20%-5px)] cursor-pointer"
    >
      <ProductCard
        image={mainImage}
        price={product.price}
        name={product.name}
        category={
          product.businessCategory?.name ??
          ["Performance", "Sportswear", "Originals"][idx % 3]
        }
        originalPrice={originalPrice}
        storeName={product.organization?.name}
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