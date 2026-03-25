import { useState } from "react";
import { Tag, Plus } from "lucide-react";
import { CategoryChip } from "@/components/molecules/sections/categories/CategoryChip";

type Props = {
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
};

export function CategoriesSection({ categories, setCategories }: Props) {
  const [newCat, setNewCat] = useState("");

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
      setNewCat("");
    }
  };

  const removeCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Нүүр хуудасны ангилалууд</h2>
        <p className="text-sm text-slate-400">
          Нүүр хуудасны ангилалын хэсэгт харагдах ангилалуудыг удирдана.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
          placeholder="Ангилал нэмэх..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <button
          onClick={addCategory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} />
          Нэмэх
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-300">
          <Tag size={40} strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium">Ангилал байхгүй байна</p>
          <p className="text-xs mt-1 text-slate-300">
            Дээд талын оруулах хэсэгт ангилал нэмнэ үү
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <CategoryChip key={cat} cat={cat} onRemove={removeCategory} />
          ))}
        </div>
      )}
    </div>
  );
}
