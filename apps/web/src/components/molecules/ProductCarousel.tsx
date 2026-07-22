import { ProductCarouselItem } from "./ProductCarouselItem";
import type { CarouselProduct } from "./product-carousel.types";

interface Props {
  products: CarouselProduct[];
  onSelect: (id: string) => void;
}

export const ProductCarousel = ({
  products,
  onSelect,
}: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, idx) => (
        <ProductCarouselItem
          key={product.id}
          product={product}
          idx={idx}
          onClick={() => onSelect(product.id)}
        />
      ))}
    </div>
  );
};
