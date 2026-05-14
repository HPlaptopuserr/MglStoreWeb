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
  const locations = ["all", ...LOCAL_AREA_OPTIONS.map((area) => area.slug)];

  const scroll = (dir: "left" | "right") => {
    listRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <div className="border-b border-gray-200/70 bg-white">
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
          className="flex items-center gap-1.5 overflow-x-auto py-3 pl-1 scrollbar-hide sm:gap-2 sm:py-3.5"
          style={{ scrollbarWidth: "none" }}
        >
          <span className="mr-1 hidden shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 sm:flex">
            <MapPin size={13} />
            Байршил
          </span>
          {locations.map((location) => {
            const isActive = activeLocation === location;
            return (
              <button
                key={location}
                type="button"
                onClick={() => onChange(location)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all sm:px-4 sm:py-2 ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-[#FFAD02]/40 hover:text-gray-800"
                }`}
              >
                {location !== "all" && <MapPin size={12} />}
                {location === "all" ? "Бүх байршил" : getLocalAreaLabel(location)}
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
