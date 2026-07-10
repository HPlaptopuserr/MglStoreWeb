"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { LOCAL_AREA_OPTIONS, getLocalAreaLabel } from "@mgl/ui";

interface OrganizationLocationFilterProps {
  activeLocation: string;
  onChange: (value: string) => void;
}

export function OrganizationLocationFilter({
  activeLocation,
  onChange,
}: OrganizationLocationFilterProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const locations = [
    "all",
    "local",
    ...LOCAL_AREA_OPTIONS.map((area) => area.slug),
  ];

  const scroll = (dir: "left" | "right") => {
    listRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-[0_8px_30px_-26px_rgba(15,23,42,0.4)]">
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
        <div className="pointer-events-none absolute bottom-0 left-3 top-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:left-6" />
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-3 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-900 sm:left-6 sm:flex"
          aria-label="Өмнөх байршлууд"
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={listRef}
          className="flex snap-x items-center gap-2 overflow-x-auto py-3 pl-1 pr-10 scrollbar-hide sm:gap-2.5 sm:py-4 sm:pr-12"
          style={{ scrollbarWidth: "none" }}
        >
          <span className="mr-1 hidden shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 sm:flex">
            <MapPin size={13} /> Байршил сонгох
          </span>
          {locations.map((location) => {
            const isActive = activeLocation === location;
            return (
              <button
                key={location}
                type="button"
                onClick={() => onChange(location)}
                aria-pressed={isActive}
                className={`inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 rounded-xl px-3.5 text-[10px] font-black uppercase tracking-wide transition-all sm:px-4 sm:text-[11px] ${
                  isActive
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15 ring-2 ring-amber-300 ring-offset-2"
                    : "border border-slate-200 bg-slate-50 text-slate-500 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {location !== "all" && <MapPin size={12} />}
                {location === "all"
                  ? "Бүх байршил"
                  : location === "local"
                    ? "Орон нутгийн гишүүд"
                    : getLocalAreaLabel(location)}
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute bottom-0 right-3 top-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:right-6" />
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-3 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-900 sm:right-6 sm:flex"
          aria-label="Дараах байршлууд"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
