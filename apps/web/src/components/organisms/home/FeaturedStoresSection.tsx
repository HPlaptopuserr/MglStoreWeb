"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { companies } from "@/lib/mock-data";
import { FeaturedStoreCard } from "./FeaturedStoreCard";

export const FeaturedStoresSection = () => {
  const railRef = useRef<HTMLDivElement>(null);

  console.log("companies:", companies);

  const scroll = (direction: "left" | "right") => {
    if (!railRef.current) return;

    railRef.current.scrollBy({
      left: direction === "left" ? -900 : 900,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Хамтрагч дэлгүүрүүд
        </h2>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Дэлгүүрийн өгөгдөл олдсонгүй
        </div>
      ) : (
        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {companies.map((company) => (
            <FeaturedStoreCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </section>
  );
};
