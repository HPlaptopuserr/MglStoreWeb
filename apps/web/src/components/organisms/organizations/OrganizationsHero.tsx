"use client";

import { Layers, Search, ShieldCheck, Store, TrendingUp } from "lucide-react";

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
    <section
      className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)]"
      style={{ marginTop: "-160px", paddingTop: "160px" }}
    >
      <div className="relative px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 text-center">
          <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[11px] font-bold uppercase tracking-widest text-slate-600 shadow-sm">
            <ShieldCheck size={14} className="text-[#FFAD02]" />
            Баталгаажсан байгууллагууд
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl md:text-6xl">
              Нэгдсэн{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-slate-950">Түншүүд</span>
                <span className="absolute -bottom-1 left-0 right-0 h-2 rounded-full bg-[#FFAD02]/35" />
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              MGL Store платформын нэгдсэн байгууллагуудын каталог
            </p>
          </div>

          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-lg shadow-slate-200/70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Store size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-950">
                  {storesCount.toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Нийт түнш
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-lg shadow-slate-200/70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-950">
                  {activeCount.toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Идэвхтэй
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-lg shadow-slate-200/70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#FFAD02]">
                <Layers size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-950">
                  {categoriesCount}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Ангилал
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-3xl">
            <div className="group relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#FFAD02]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Байгууллага хайх..."
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-5 text-base text-slate-950 shadow-lg shadow-slate-200/70 outline-none transition-all placeholder:text-slate-400 focus:border-[#FFAD02]/70 focus:ring-4 focus:ring-[#FFAD02]/15"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-xl leading-none text-slate-400 transition-colors hover:text-slate-700"
                >
                  x
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
