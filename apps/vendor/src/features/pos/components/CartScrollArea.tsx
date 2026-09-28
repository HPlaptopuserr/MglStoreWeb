"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Keeps overflow discoverable even when the OS hides scrollbars. */
export function CartScrollArea({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const update = () => {
      setHasMoreBelow(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 2,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        role="region"
        aria-label="Сагсны бараанууд"
        tabIndex={0}
        className="h-full overflow-y-auto overscroll-contain bg-slate-50/70 p-2.5 pb-9 [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <div ref={contentRef} className="space-y-2">
          {children}
        </div>
      </div>
      {hasMoreBelow && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent pb-1 pt-4">
          <button
            type="button"
            onClick={() => {
              const viewport = viewportRef.current;
              if (!viewport) return;
              viewport.scrollBy({
                top: Math.max(80, viewport.clientHeight * 0.7),
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "instant"
                  : "smooth",
              });
            }}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Доор өөр бараа байна <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
