import { SECTIONS } from "@/lib/sections/constants";
import type { SectionKey } from "@/lib/sections/types";

type Props = {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
};

export function SectionsSidebar({ active, onSelect }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col pt-4 pb-6 gap-1 px-3">
      {SECTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
            active === key
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </aside>
  );
}
