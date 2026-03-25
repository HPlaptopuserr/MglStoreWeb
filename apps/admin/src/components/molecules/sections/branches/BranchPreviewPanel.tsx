import type { RefObject } from "react";
import { Navigation } from "lucide-react";
import type { BranchMapItem } from "@/lib/sections/types";
import { BranchList } from "./BranchList";

type Props = {
  previewMapRef: RefObject<HTMLDivElement>;
  hasMapPreview: boolean;
  isBranchCoordsValid: boolean;
  selectedRegisteredBranch: BranchMapItem | null;
  previewLat: number | null;
  previewLng: number | null;
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

export function BranchPreviewPanel({
  previewMapRef,
  hasMapPreview,
  isBranchCoordsValid,
  selectedRegisteredBranch,
  previewLat,
  previewLng,
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
    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Хаана орж байгааг харах preview
        </p>
        {hasMapPreview && (
          <a
            href={`https://maps.google.com/?q=${previewLat},${previewLng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
          >
            <Navigation size={13} />
            Google Maps
          </a>
        )}
      </div>

      {hasMapPreview ? (
        <div>
          <div
            ref={previewMapRef}
            className="h-56 w-full rounded-xl border border-slate-200"
          />
          {!isBranchCoordsValid && selectedRegisteredBranch && (
            <p className="mt-2 text-xs text-slate-500">
              Сонгосон хаяг: {selectedRegisteredBranch.name}
            </p>
          )}
        </div>
      ) : (
        <div className="h-56 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-6">
          <p className="text-sm text-slate-500">
            Lat/Lng оруулах эсвэл доорх жагсаалтаас хаяг сонгоход map preview энд харагдана.
          </p>
        </div>
      )}

      <BranchList
        filteredItems={filteredItems}
        allCount={allCount}
        selectedId={selectedId}
        onSelect={onSelect}
        searchCity={searchCity}
        setSearchCity={setSearchCity}
        searchDistrict={searchDistrict}
        setSearchDistrict={setSearchDistrict}
        searchKhoroo={searchKhoroo}
        setSearchKhoroo={setSearchKhoroo}
      />
    </div>
  );
}
