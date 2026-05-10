"use client";

import { Search, Store, TrendingUp, Layers } from "lucide-react";

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
    <div className="relative overflow-hidden bg-[#0A0A0A]" style={{ marginTop: "-160px", paddingTop: "160px" }}>
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#FFAD02]/8 blur-[120px]" />
        <div className="absolute -left-40 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-600/6 blur-[80px]" />
        <div className="absolute -right-32 bottom-0 h-56 w-56 rounded-full bg-orange-500/5 blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,173,2,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,173,2,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="flex flex-col items-center gap-5 text-center sm:gap-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFAD02]/20 bg-[#FFAD02]/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FFAD02] shadow-[0_0_6px_#FFAD02]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFAD02]">
              Баталгаажсан байгууллагууд
            </span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              Нэгдсэн{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#FFAD02]">Түншүүд</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFAD02]/60 to-transparent" />
              </span>
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-white/40 sm:text-base">
              MGL Store платформын нэгдсэн байгууллагуудын каталог
            </p>
          </div>

          {/* Stats */}
          <div className="hidden items-center gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] sm:flex">
            <div className="flex items-center gap-3 px-7 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFAD02]/15">
                <Store size={16} className="text-[#FFAD02]" />
              </div>
              <div>
                <div className="text-xl font-black text-white">{storesCount.toLocaleString()}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Нийт түнш</div>
              </div>
            </div>

            <div className="h-12 w-px bg-white/8" />

            <div className="flex items-center gap-3 px-7 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-xl font-black text-white">{activeCount.toLocaleString()}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Идэвхтэй</div>
              </div>
            </div>

            <div className="h-12 w-px bg-white/8" />

            <div className="flex items-center gap-3 px-7 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
                <Layers size={16} className="text-violet-400" />
              </div>
              <div>
                <div className="text-xl font-black text-white">{categoriesCount}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Ангилал</div>
              </div>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="flex items-center gap-6 sm:hidden">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{storesCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Түнш</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-[#FFAD02]">{activeCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Идэвхтэй</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">{categoriesCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Ангилал</div>
            </div>
          </div>

          {/* Search */}
          <div className="w-full max-w-lg">
            <div className="group relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-[#FFAD02]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Байгууллага хайх..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-12 pr-5 text-sm text-white placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-[#FFAD02]/40 focus:bg-white/[0.09] focus:ring-2 focus:ring-[#FFAD02]/15 sm:py-4 sm:text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0D0D0D] to-transparent" />
    </div>
  );
}
