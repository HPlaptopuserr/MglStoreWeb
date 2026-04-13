import { MapPin, Search } from "lucide-react";
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <Search size={12} className="text-slate-400" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Бүртгэгдсэн салбарууд
          </p>
        </div>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
          {filteredItems.length}/{allCount}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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

      <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MapPin size={24} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              Одоогоор салбарын хаяг бүртгэгдээгүй байна
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === selectedId;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-violet-300 bg-violet-50 shadow-sm shadow-violet-100"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "bg-violet-100" : "bg-slate-100"
                  }`}>
                    <MapPin size={14} className={isActive ? "text-violet-600" : "text-slate-400"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{item.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] text-violet-600 font-medium truncate">
                        {item.organization.name}
                      </p>
                      {item.lat !== null && item.lng !== null && (
                        <p className="text-[10px] text-slate-400 shrink-0">
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
