"use client";

import { Search } from "lucide-react";

interface OrganizationsHeroProps {
  storesCount: number;
  activeCount: number;
  categoriesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function OrganizationsHero({
  storesCount,
  activeCount,
  categoriesCount,
  searchQuery,
  onSearchChange,
}: OrganizationsHeroProps) {
  return (
    <div className="-mt-40 md:-mt-32 relative bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,173,2,0.15),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,173,2,0.08),_transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-44 pb-8 md:pt-36 md:pb-10">
        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-6">
          <h1 className="text-xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
            Албан ёсны <span className="text-[#FFAD02]">Түншүүд</span>
          </h1>

          <p className="text-xs sm:text-lg text-white/50 max-w-lg mx-auto leading-relaxed">
            Баталгаажсан байгууллагуудын жагсаалт
          </p>

          <div className="hidden sm:flex items-center gap-8 pt-4">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{storesCount}</div>
              <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Түнш
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center">
              <div className="text-2xl font-black text-[#FFAD02]">
                {activeCount}
              </div>
              <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Идэвхтэй
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center">
              <div className="text-2xl font-black text-white">
                {categoriesCount}
              </div>
              <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Ангилал
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl pt-1 sm:pt-4">
            <div className="relative group">
              <Search
                className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FFAD02] transition-colors"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Байгууллага хайх..."
                className="w-full pl-11 sm:pl-13 pr-4 py-3 sm:py-4 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder:text-white/30 outline-none focus:border-[#FFAD02]/50 focus:bg-white/10 focus:ring-2 focus:ring-[#FFAD02]/20 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}