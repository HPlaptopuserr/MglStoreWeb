import { Tag, X } from "lucide-react";

type Props = {
  cat: string;
  onRemove: (cat: string) => void;
};

export function CategoryChip({ cat, onRemove }: Props) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 group">
      <Tag size={13} className="text-violet-500" />
      {cat}
      <button
        onClick={() => onRemove(cat)}
        className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
