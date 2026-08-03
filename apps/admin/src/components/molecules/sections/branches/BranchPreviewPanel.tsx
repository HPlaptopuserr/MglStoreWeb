import type { RefObject } from "react";
import { MapPin, Navigation } from "lucide-react";
import type { BranchMapItem } from "@/lib/sections/types";
import { BranchList } from "./BranchList";

type Props = {
  previewMapRef: RefObject<HTMLDivElement | null>;
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <MapPin size={13} />
          </div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Салбарын map ба жагсаалт
          </p>
        </div>
        {hasMapPreview && (
          <a
            href={`https://maps.google.com/?q=${previewLat},${previewLng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-100 transition-colors"
          >
            <Navigation size={12} />
            Google Maps
          </a>
        )}
      </div>

      {/* ── Map Preview ───────────────────────────────── */}
      {hasMapPreview ? (
        <div className="space-y-2">
          <div
            ref={previewMapRef}
            className="relative z-0 h-60 w-full rounded-xl border border-slate-200 shadow-sm"
          />
          {selectedRegisteredBranch && (
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-violet-500" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {selectedRegisteredBranch.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {selectedRegisteredBranch.address}
                </p>
                <p className="text-[11px] text-violet-600 mt-0.5">
                  {selectedRegisteredBranch.organization.name}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-60 rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white flex flex-col items-center justify-center text-center px-6 gap-2">
          <MapPin size={28} className="text-slate-300" />
          <p className="text-sm text-slate-500">
            Салбар нэмсний дараа map дээр байршил нь энд харагдана
          </p>
          <p className="text-xs text-slate-400">
            Доорх жагсаалтаас салбар сонгож дэлгэрэнгүй байршлыг шалгана
          </p>
        </div>
      )}

      {/* ── Branch List ───────────────────────────────── */}
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
