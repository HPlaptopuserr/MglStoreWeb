"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { ProductCard } from "@mgl/ui";

export interface Store {
  name: string;
  logo?: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag?: string;
  rating: number;
  reviews: number;
  store: Store;
}

const baseProducts: Omit<Product, "id">[] = [
  {
    title: "Organic Bananas",
    price: 1.99,
    originalPrice: 2.49,
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=500&fit=crop",
    tag: "Best Seller",
    rating: 5,
    reviews: 124,
    store: {
      name: "Fresh Farms",
    },
  },
  {
    title: "Fresh Strawberries",
    price: 4.99,
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=500&fit=crop",
    tag: "Local",
    rating: 4,
    reviews: 89,
    store: {
      name: "Berry Good",
    },
  },
  {
    title: "Whole Milk",
    price: 3.49,
    originalPrice: 3.99,
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=500&fit=crop",
    rating: 5,
    reviews: 256,
    store: { name: "Dairy Co." },
  },
  {
    title: "Avocados (Pack of 4)",
    price: 5.99,
    image:
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=500&fit=crop",
    tag: "-15%",
    rating: 4,
    reviews: 42,
    store: { name: "Green Grocers" },
  },
  {
    title: "Sourdough Bread",
    price: 6.49,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=500&fit=crop",
    rating: 5,
    reviews: 210,
    store: {
      name: "Artisan Bakery",
    },
  },
  {
    title: "Free-Range Eggs",
    price: 5.29,
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=500&fit=crop",
    tag: "Organic",
    rating: 5,
    reviews: 155,
    store: { name: "Happy Hens" },
  },
  {
    title: "Fresh Salmon Fillet",
    price: 12.99,
    originalPrice: 15.99,
    image:
      "https://images.unsplash.com/photo-1499125562588-29fb8a56b5d5?w=400&h=500&fit=crop",
    rating: 4,
    reviews: 67,
    store: {
      name: "Ocean Catch",
    },
  },
  {
    title: "Greek Yogurt",
    price: 4.49,
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=500&fit=crop",
    rating: 4,
    reviews: 132,
    store: { name: "Dairy Co." },
  },
];

export const products: Product[] = Array.from({ length: 30 }, (_, index) => {
  const base = baseProducts[index % baseProducts.length];

  return {
    ...base,
    id: `prod_v${index + 1}`,
    title:
      index < baseProducts.length ? base.title : `${base.title} v.${index + 1}`,
    price: Number((base.price + index * 0.15).toFixed(2)),
    originalPrice: base.originalPrice
      ? Number((base.originalPrice + index * 0.15).toFixed(2))
      : undefined,
    image: base.image,
    reviews: base.reviews + index * 13,
    store: base.store,
  };
});

export const ProductGrid = () => {
  const visibleProducts = products.slice(0, 16);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    setScrollProgress(
      scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0,
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

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
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8 border-b border-black pb-4">
          <h2 className="text-base font-bold tracking-widest text-black uppercase">
            Бүтээгдэхүүнүүд
          </h2>
          <a
            href="/products"
            className="text-xs font-medium text-black hover:underline uppercase tracking-widest"
          >
            Цааш үзэх
          </a>
        </div>

        {/* Carousel Wrapper */}
        <div className="relative group/carousel">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/3 -translate-y-1/2 z-20 w-12 h-12 bg-white border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-colors shadow-md"
              aria-label="Scroll left"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/3 -translate-y-1/2 z-20 w-12 h-12 bg-white border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-colors shadow-md"
              aria-label="Scroll right"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
          >
            {visibleProducts.map((product, idx) => (
              <div
                key={product.id}
                className="shrink-0 w-[calc(50%-3px)] sm:w-[calc(33.333%-4px)] md:w-[calc(25%-5px)] border border-transparent hover:border-black transition-colors duration-200"
              >
                <ProductCard
                  image={product.image}
                  price={product.price}
                  name={product.title}
                  category={["Performance", "Sportswear", "Originals"][idx % 3]}
                  originalPrice={product.originalPrice}
                  storeName={product.store?.name}
                  isPrime={idx % 5 === 0}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="h-0.75 bg-gray-200 relative max-w-full">
            <div
              className="absolute top-0 left-0 h-full bg-black transition-all duration-300"
              style={{
                width: "25%",
                left: `${scrollProgress * 75}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-10 flex justify-center md:hidden">
          <a
            href="/products"
            className="w-full text-center py-3.5 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            Shop All
          </a>
        </div>
      </div>
    </section>
  );
};
