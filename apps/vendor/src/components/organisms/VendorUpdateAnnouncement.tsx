"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_KEY = "mgl-vendor-update:reports-2026-09:v2:impressions";
const MAX_IMPRESSIONS = 10;
const UPDATES = [
  {
    icon: BarChart3,
    title: "Шинэ Тайлан",
    description:
      "Өртөг, боломжит ашиг болон хамгийн их зарагдсан бараагаа нэг дор харна.",
  },
  {
    icon: Boxes,
    title: "Хурдан бүтээгдэхүүний жагсаалт",
    description:
      "Бүтээгдэхүүнүүд хуудас хуудас болж, хайлт болон шүүлтүүр илүү хурдан ажиллана.",
  },
  {
    icon: CheckCircle2,
    title: "Анхаарах ажлууд",
    description:
      "Dashboard төлбөр, идэвхгүй бараа болон хугацааны эрсдэлийг шууд сануулна.",
  },
] as const;

export function VendorUpdateAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasRecordedImpressionRef = useRef(false);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (hasRecordedImpressionRef.current) return;
    hasRecordedImpressionRef.current = true;
    try {
      const storedCount = Number.parseInt(
        localStorage.getItem(STORAGE_KEY) || "0",
        10,
      );
      const impressionCount = Number.isFinite(storedCount)
        ? Math.max(0, storedCount)
        : 0;
      if (impressionCount < MAX_IMPRESSIONS) {
        localStorage.setItem(STORAGE_KEY, String(impressionCount + 1));
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-update-title"
      aria-describedby="vendor-update-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="relative overflow-hidden bg-slate-950 px-5 pb-6 pt-5 text-white sm:px-7 sm:pb-7 sm:pt-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-amber-300">
                <Sparkles size={13} /> Шинэчлэлт
              </span>
              <h2
                id="vendor-update-title"
                className="max-w-lg text-2xl font-black tracking-tight sm:text-3xl"
              >
                Vendor илүү хурдан, ойлгомжтой боллоо
              </h2>
              <p
                id="vendor-update-description"
                className="mt-2 max-w-xl text-sm leading-6 text-slate-300"
              >
                Борлуулалт болон бүтээгдэхүүний мэдээллээ хянах шинэ
                боломжуудтай танилцаарай.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              className="shrink-0 rounded-full border border-white/10 bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
              aria-label="Шинэчлэлтийн мэдээллийг хаах"
            >
              <X size={19} />
            </button>
          </div>
        </div>
        <div className="space-y-3 p-5 sm:p-7">
          {UPDATES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              className="h-11 rounded-xl px-5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Дараа үзэх
            </button>
            <Link
              href="/reports"
              onClick={close}
              className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              <span className="absolute inset-0 animate-pulse bg-white/5" />
              <BarChart3 className="relative" size={17} />
              <span className="relative">Тайлан үзэх</span>
              <ArrowRight
                className="relative transition-transform group-hover:translate-x-0.5"
                size={16}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
