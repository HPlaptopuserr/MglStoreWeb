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
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 group"
      style={{ height: "clamp(180px, 33vh, 380px)" }}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)`, width: `${banners.length * 100}%` }}
      >
        {banners.map((url, i) => (
          <div key={i} className="relative h-full flex-shrink-0" style={{ width: `${100 / banners.length}%` }}>
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
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Өмнөх"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          {/* Right arrow */}
          <button
            onClick={(e) => { e.preventDefault(); if (timerRef.current) clearTimeout(timerRef.current); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white shadow-md backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Дараагийн"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); goTo(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-white w-5 h-2"
                    : "bg-white/50 w-2 h-2 hover:bg-white/80"
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
