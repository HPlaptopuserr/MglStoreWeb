"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API } from "@/lib/api";

export default function Hero() {
  const [banners, setBanners] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        // Support both "promo-banners" (JSON array) and "promo-banner" (single)
        const raw = data["promo-banners"];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setBanners(parsed);
              return;
            }
          } catch {}
        }
        // Fall back to single banner key
        if (data["promo-banner"]) {
          setBanners([data["promo-banner"]]);
        }
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (banners.length === 0) return;
      setCurrent((index + banners.length) % banners.length);
    },
    [banners.length]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance every 5s
  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setTimeout(next, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [banners.length, current, next]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 group aspect-[5/2] sm:aspect-[10/3] lg:aspect-[21/5]">
      {/* Slides */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((url, i) => (
          <div key={i} className="relative min-w-full h-full flex-shrink-0">
            <Image
              src={url}
              alt={`Промо баннер ${i + 1}`}
              fill
              className="object-cover"
              unoptimized={url.startsWith("data:")}
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Only show controls if multiple banners */}
      {banners.length > 1 && (
        <>
          {/* Left arrow */}
          <button
            onClick={(e) => { e.preventDefault(); if (timerRef.current) clearTimeout(timerRef.current); prev(); }}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 hover:bg-white shadow-md backdrop-blur-md flex items-center justify-center text-slate-800 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
            aria-label="Өмнөх"
          >
            <ChevronLeft size={20} strokeWidth={2.5} className="mr-0.5" />
          </button>

          {/* Right arrow */}
          <button
            onClick={(e) => { e.preventDefault(); if (timerRef.current) clearTimeout(timerRef.current); next(); }}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 hover:bg-white shadow-md backdrop-blur-md flex items-center justify-center text-slate-800 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
            aria-label="Дараагийн"
          >
            <ChevronRight size={20} strokeWidth={2.5} className="ml-0.5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); if (timerRef.current) clearTimeout(timerRef.current); goTo(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-amber-500 w-6 h-1.5 sm:h-2 sm:w-8"
                    : "bg-white/60 hover:bg-white/90 w-1.5 h-1.5 sm:w-2 sm:h-2"
                }`}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
