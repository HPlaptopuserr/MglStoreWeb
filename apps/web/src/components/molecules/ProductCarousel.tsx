import { ProductCarouselItem } from "./ProductCarouselItem";
import type { CarouselProduct } from "./product-carousel.types";

interface Props {
  products: CarouselProduct[];
}

export const ProductCarousel = ({ products }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, idx) => (
        <ProductCarouselItem key={product.id} product={product} idx={idx} />
      ))}
    </div>
  );
};
