"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@mgl/ui";
import { ProductCard } from "@mgl/ui";
import type { CompanyCard } from "@mgl/types";

interface StoreRowProps {
  company: CompanyCard;
}

export const StoreRow = ({ company }: StoreRowProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="group bg-white rounded-4xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative">
      <div className="relative h-32 w-full overflow-hidden">
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

        <div className="absolute top-4 right-4 z-10">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/20 shadow-lg ${company.isOpen ? "bg-amber-500/90 text-white" : "bg-slate-900/90 text-slate-300"}`}
          >
            {company.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 px-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-xl border-2 border-white shadow-xl overflow-hidden bg-white shrink-0">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-white pb-1">
              <h3 className="text-xl font-bold tracking-tight mb-1 drop-shadow-md">
                {company.name}
              </h3>
              <div className="flex items-center gap-3 text-xs font-medium text-white/90">
                <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                  <Star size={12} className="text-orange-400 fill-orange-400" />
                  <span>{company.rating}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                  <Clock size={12} className="text-amber-400" />
                  <span>{company.deliveryTime}</span>
                </div>
              </div>
            </div>
          </div>

          <Link
            href={`/organizations/${company.slug}`}
            className="hidden md:block pb-1"
          >
            <Button
              size="sm"
              className="rounded-lg bg-white text-slate-900 hover:bg-amber-500 hover:text-white border-none shadow-lg transition-all duration-300 font-bold px-4 h-8 text-xs"
            >
              Visit
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative p-6 bg-slate-50/30">
        <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10">
          <button
            onClick={() => scroll("left")}
            className="h-10 w-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-amber-500 hover:scale-110 transition-all disabled:opacity-50"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10">
          <button
            onClick={() => scroll("right")}
            className="h-10 w-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-amber-500 hover:scale-110 transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x scroll-smooth"
        >
          {company.products.map((product) => (
            <div
              key={product.id}
              className="min-w-[240px] md:min-w-[260px] snap-start"
            >
              <ProductCard
                href={`/products/${encodeURIComponent(product.id)}`}
                image={product.image}
                price={product.price}
                originalPrice={product.originalPrice}
                name={product.title}
                category={product.category}
                colorCount={product.colorCount ?? 0}
                tags={product.tags ?? (product.tag ? [product.tag] : [])}
                isPrime={product.isPrime ?? false}
              />
            </div>
          ))}
          <Link
            href={`/organizations/${company.slug}`}
            className="min-w-[200px] snap-start flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-500 hover:bg-amber-50/30 transition-all cursor-pointer group/more h-full min-h-[300px]"
          >
            <div className="h-16 w-16 rounded-full bg-slate-50 group-hover/more:bg-amber-100 flex items-center justify-center transition-colors shadow-sm">
              <ArrowRight size={28} />
            </div>
            <span className="font-bold text-sm uppercase tracking-wide">
              View All Products
            </span>
          </Link>
        </div>

        <div className="mt-6 md:hidden">
          <Link
            href={`/organizations/${company.slug}`}
            className="block w-full"
          >
            <Button className="w-full rounded-xl bg-slate-900 text-white hover:bg-amber-500 shadow-lg transition-all duration-300 font-bold py-6">
              Visit Store
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
