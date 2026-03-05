"use client";

import React from "react";
import { CategoryCard } from "@mgl/ui";
import { categories } from "@/lib/mock-data";

export const CategoryRail = () => {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="text-2xl font-bold text-slate-800">Ангилал</h2>
        <a
          href="#"
          className="text-sm font-medium text-amber-500 hover:text-amber-600 hover:underline"
        >
          View All
        </a>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 px-4 scrollbar-hide snap-x">
        {categories.map((cat, idx) => (
          <div key={idx} className="snap-start">
            <CategoryCard {...cat} />
          </div>
        ))}
      </div>
    </section>
  );
};
