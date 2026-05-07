"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CarouselArrowButton } from "./CarouselArrowButton";
import { ProductCarouselItem } from "./ProductCarouselItem";

interface Props {
  products: any[];
  onSelect: (id: string) => void;
  onProgressChange?: (value: number) => void;
}

export const ProductCarousel = ({
  products,
  onSelect,
  onProgressChange,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);

    const progress =
      scrollWidth > clientWidth
        ? scrollLeft / (scrollWidth - clientWidth)
        : 0;

    onProgressChange?.(progress);
  }, [onProgressChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scheduleUpdate = () => window.requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const frame = window.requestAnimationFrame(updateScrollState);
    const timeout = window.setTimeout(updateScrollState, 250);

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    resizeObserver.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, products]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.querySelector("div")?.offsetWidth ?? 280;
    const scrollAmount = cardWidth * 4;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <CarouselArrowButton
          direction="left"
          onClick={() => scroll("left")}
        />
      )}

      {canScrollRight && (
        <CarouselArrowButton
          direction="right"
          onClick={() => scroll("right")}
        />
      )}

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
      >
        {products.map((product, idx) => (
          <ProductCarouselItem
            key={product.id}
            product={product}
            idx={idx}
            onClick={() => onSelect(product.id)}
          />
        ))}
      </div>
    </div>
  );
};
