import type { BranchMapItem } from "@/lib/sections/types";

type Props = {
  filteredItems: BranchMapItem[];
  allCount: number;
  selectedId: string;
  onSelect: (id: string) => void;
  searchCity: string;
  setSearchCity: (v: string) => void;
  searchDistrict: string;
  setSearchDistrict: (v: string) => void;
  searchKhoroo: string;
  setSearchKhoroo: (v: string) => void;
};

export function BranchList({
  filteredItems,
  allCount,
  selectedId,
  onSelect,
  searchCity,
  setSearchCity,
  searchDistrict,
  setSearchDistrict,
  searchKhoroo,
  setSearchKhoroo,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Бүртгэгдсэн хаягууд ({filteredItems.length}/{allCount})
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="Хотоор хайх"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <input
            type="text"
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            placeholder="Дүүргээр хайх"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <input
            type="text"
            value={searchKhoroo}
            onChange={(e) => setSearchKhoroo(e.target.value)}
            placeholder="Хороогоор хайх"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="mt-2 max-h-44 overflow-y-auto pr-1 space-y-2">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-slate-500 px-1">
            Одоогоор салбарын хаяг бүртгэгдээгүй байна.
          </p>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === selectedId;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isActive
                    ? "border-violet-300 bg-violet-50"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <p className="text-sm font-semibold text-slate-800 break-words">{item.name}</p>
                <p className="text-xs text-slate-500 mt-1 break-words">{item.address}</p>
                <p className="text-[11px] text-indigo-600 mt-1 break-words">
                  {item.organization.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {item.lat}, {item.lng}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
