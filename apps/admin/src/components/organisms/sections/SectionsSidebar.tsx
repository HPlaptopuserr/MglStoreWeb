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
    <aside className="w-full h-full flex flex-col pt-6 pb-6 gap-1 px-4">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
            active === key
              ? "bg-violet-600 text-white shadow-md shadow-violet-200"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          }`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </aside>
  );
}
