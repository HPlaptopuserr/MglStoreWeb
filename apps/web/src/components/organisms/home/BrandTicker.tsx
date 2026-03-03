import React from 'react';
import { Star } from 'lucide-react';
import { brands } from '@/lib/mock-data';

export const BrandTicker = () => {
  return (
    <section className="py-12 border-t border-slate-100 bg-white">
      <div className="container mx-auto px-4 text-center mb-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trusted by Top Organic Brands</h3>
      </div>

      <div className="relative flex overflow-hidden group mask-linear-fade">
        <div className="flex animate-marquee whitespace-nowrap gap-16 min-w-full items-center">
          {brands.map((brand, i) => (
            <div key={i} className="flex items-center gap-2 text-2xl font-bold text-slate-300 hover:text-amber-500 transition-colors cursor-pointer shrink-0">
              <Star size={16} className="text-amber-200" />
              {brand}
            </div>
          ))}
          {brands.map((brand, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-2 text-2xl font-bold text-slate-300 hover:text-amber-500 transition-colors cursor-pointer shrink-0">
              <Star size={16} className="text-amber-200" />
              {brand}
            </div>
          ))}
          {brands.map((brand, i) => (
            <div key={`dup2-${i}`} className="flex items-center gap-2 text-2xl font-bold text-slate-300 hover:text-amber-500 transition-colors cursor-pointer shrink-0">
              <Star size={16} className="text-amber-200" />
              {brand}
            </div>
          ))}
        </div>

        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
      </div>
    </section>
  );
};
