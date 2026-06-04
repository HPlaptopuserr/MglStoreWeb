"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { ProductCarouselItem } from "../../../molecules/ProductCarouselItem";
import type { ApiProduct } from "./productShowcase";

interface ProductShelfRowProps {
  title: string;
  products: ApiProduct[];
  onSelect: (id: string) => void;
}

export function ProductShelfRow({ title, products, onSelect }: ProductShelfRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(products.length > 4);

  const checkScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    setCanLeft(node.scrollLeft > 8);
    setCanRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
  };

  const scroll = (direction: "left" | "right") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction === "left" ? -Math.round(node.clientWidth * 0.86) : Math.round(node.clientWidth * 0.86),
      behavior: "smooth",
    });
    window.setTimeout(checkScroll, 240);
  };

  return (
    <section className="group/shelf">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {products.length} бүтээгдэхүүн
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="hidden h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-600 sm:inline-flex"
          >
            Бүгд <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Өмнөх бараанууд"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Дараагийн бараанууд"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="-mx-4 grid auto-cols-[minmax(150px,43vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide sm:auto-cols-[190px] lg:auto-cols-[208px] xl:auto-cols-[220px]"
        style={{ scrollbarWidth: "none" }}
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
    </section>
  );
}
