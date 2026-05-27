import { SECTIONS } from "@/lib/sections/constants";
import type { SectionKey } from "@/lib/sections/types";

type Props = {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  visibleSections?: typeof SECTIONS;
};

export function SectionsSidebar({ active, onSelect, visibleSections }: Props) {
  const items = visibleSections ?? SECTIONS;
  return (
    <aside className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Sections
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-800">
            Засах хэсгээ сонгоно уу
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          {items.length}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {items.map(({ key, label, icon: Icon }, index) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`group flex min-h-[76px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                isActive
                  ? "border-violet-200 bg-violet-50 shadow-sm ring-2 ring-violet-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-black ${isActive ? "text-violet-900" : "text-slate-800"}`}>
                  {label}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                  Section {String(index + 1).padStart(2, "0")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
