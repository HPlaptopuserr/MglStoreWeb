"use client";

import {
  Building2,
  CheckCircle2,
  Layers3,
  MapPinned,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";

interface OrganizationsHeroProps {
  storesCount: number;
  activeCount: number;
  categoriesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLocalMode?: boolean;
}

const metricTones = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
} as const;

export function OrganizationsHero({
  storesCount,
  activeCount,
  categoriesCount,
  searchQuery,
  onSearchChange,
  isLocalMode = false,
}: OrganizationsHeroProps) {
  const metrics = isLocalMode
    ? [
        { label: "Орон нутгийн түнш", value: storesCount, icon: Store, tone: "blue" as const },
        { label: "Аймаг, бүс нутаг", value: 21, icon: MapPinned, tone: "emerald" as const },
        { label: "Үйл ажиллагааны чиглэл", value: categoriesCount, icon: Layers3, tone: "amber" as const },
      ]
    : [
        { label: "Нийт түнш", value: storesCount, icon: Store, tone: "blue" as const },
        { label: "Идэвхтэй", value: activeCount, icon: CheckCircle2, tone: "emerald" as const },
        { label: "Ангилал", value: categoriesCount, icon: Layers3, tone: "amber" as const },
      ];

  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#f7f9fc]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_20%,rgba(245,158,11,0.13),transparent_26%),radial-gradient(circle_at_88%_15%,rgba(37,99,235,0.14),transparent_32%)]"
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur sm:px-4 sm:text-[11px]">
              {isLocalMode ? (
                <MapPinned size={14} className="text-blue-700" />
              ) : (
                <ShieldCheck size={14} className="text-amber-500" />
              )}
              {isLocalMode ? "Монгол орны 21 аймагт" : "Баталгаажсан байгууллагууд"}
            </div>

            <h1 className="mt-5 text-[2.55rem] font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
              {isLocalMode ? (
                <>Орон нутгийн <span className="text-blue-700">бизнесүүд</span></>
              ) : (
                <>Нэгдсэн <span className="text-blue-700">түншүүд</span></>
              )}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
              {isLocalMode
                ? "Аймаг, орон нутгийн шилдэг үйлдвэрлэгч, үйлчилгээ, худалдааны байгууллагуудыг нэг дороос нээгээрэй."
                : "MGL Store платформын баталгаажсан байгууллагуудын нэгдсэн каталог."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                <ShieldCheck size={13} className="text-emerald-600" /> Баталгаажсан
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                <Building2 size={13} className="text-blue-700" /> Монгол бизнес
              </span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white bg-white/85 p-3 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.25)] backdrop-blur sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {metrics.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3 sm:flex sm:items-center sm:gap-3 sm:p-4">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ring-1 sm:h-10 sm:w-10 ${metricTones[tone]}`}>
                    <Icon size={17} />
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-lg font-black leading-none text-slate-950 sm:text-xl">{value.toLocaleString()}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase leading-3 tracking-wide text-slate-500 sm:text-[10px]">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="group relative mt-3">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-700" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={isLocalMode ? "Орон нутгийн байгууллага хайх..." : "Байгууллага хайх..."}
                aria-label="Байгууллага хайх"
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-medium text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Хайлтыг цэвэрлэх"
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
