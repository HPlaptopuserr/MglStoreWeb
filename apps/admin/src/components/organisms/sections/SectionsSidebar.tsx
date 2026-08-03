"use client";

import { useEffect, useRef } from "react";
import { SECTIONS } from "@/lib/sections/constants";
import type { SectionKey } from "@/lib/sections/types";

type Props = {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  visibleSections?: typeof SECTIONS;
};

export function SectionsSidebar({ active, onSelect, visibleSections }: Props) {
  const items = visibleSections ?? SECTIONS;
  const activeIndex = items.findIndex((item) => item.key === active);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const button = activeButtonRef.current;
    if (!scroller || !button) return;

    const padding = 12;
    const buttonLeft = button.offsetLeft;
    const buttonRight = buttonLeft + button.clientWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;

    if (buttonLeft >= viewLeft + padding && buttonRight <= viewRight - padding) {
      return;
    }

    const nextLeft =
      buttonLeft < viewLeft
        ? buttonLeft - padding
        : buttonRight - scroller.clientWidth + padding;

    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: "auto" });
  }, [active]);

  return (
    <aside className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Sections
          </p>
          <p className="truncate text-sm font-black text-slate-900">
            Сонгосон:{" "}
            <span className="text-violet-700">
              {items[activeIndex]?.label ?? "Хэсэг"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">
            {activeIndex >= 0 ? activeIndex + 1 : 1}/{items.length}
          </span>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]"
      >
        {items.map(({ key, label, icon: Icon }, index) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              ref={isActive ? activeButtonRef : null}
              onClick={() => onSelect(key)}
              className={`group flex h-11 min-w-[174px] items-center gap-2.5 rounded-xl border px-2.5 text-left transition-all sm:min-w-[190px] ${
                isActive
                  ? "border-violet-400 bg-violet-100 shadow-sm ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-black ${
                    isActive ? "text-violet-900" : "text-slate-800"
                  }`}
                >
                  {label}
                </span>
                <span className="block text-[10px] font-bold text-slate-400">
                  Section {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              {isActive && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-600" />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
