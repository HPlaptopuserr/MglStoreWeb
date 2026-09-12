"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Package,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

const STORAGE_KEY = "mgl-vendor-update:reports-2026-09:v2:impressions";
const MAX_IMPRESSIONS = 10;
const SLIDES = [
  {
    eyebrow: "Борлуулалтын шинжилгээ",
    title: "Тоон мэдээллээ шийдвэр болго",
    description:
      "Хамгийн их зарагдсан бараа, нөөцийн өртөг болон боломжит ашгаа нэг тайлангаас харна.",
    href: "/reports",
    action: "Тайлан нээх",
    icon: BarChart3,
    accent: "from-violet-600 via-indigo-600 to-blue-600",
    preview: "reports" as const,
  },
  {
    eyebrow: "Бүтээгдэхүүний каталог",
    title: "Олон бараатай үед ч хурдан",
    description:
      "Бүтээгдэхүүнүүд 24-өөр хуудаслагдаж, хайлт болон шүүлтүүр сервер дээр хурдан ажиллана.",
    href: "/products",
    action: "Бүтээгдэхүүн харах",
    icon: Boxes,
    accent: "from-cyan-600 via-blue-600 to-indigo-600",
    preview: "products" as const,
  },
  {
    eyebrow: "Өдөр тутмын хяналт",
    title: "Юуг түрүүлж хийхээ шууд мэд",
    description:
      "Төлбөр, идэвхгүй бараа, хугацааны эрсдэл болон хүлээгдсэн хүсэлтийг dashboard сануулна.",
    href: "/dashboard",
    action: "Dashboard үзэх",
    icon: CheckCircle2,
    accent: "from-emerald-600 via-teal-600 to-cyan-600",
    preview: "tasks" as const,
  },
] as const;

function UpdatePreview({ type }: { type: (typeof SLIDES)[number]["preview"] }) {
  if (type === "reports")
    return (
      <div className="grid h-full grid-cols-2 gap-3 p-7">
        <div className="col-span-2 flex items-end gap-2 rounded-2xl border border-white/10 bg-white/10 p-4">
          {[38, 62, 48, 88, 70, 100].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t-md bg-white/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <TrendingUp className="mb-3 text-emerald-300" size={20} />
          <p className="text-xs text-white/60">Боломжит ашиг</p>
          <p className="mt-1 text-lg font-black text-white">+24.8%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <Package className="mb-3 text-amber-300" size={20} />
          <p className="text-xs text-white/60">Шилдэг бараа</p>
          <p className="mt-1 text-lg font-black text-white">TOP 10</p>
        </div>
      </div>
    );
  if (type === "products")
    return (
      <div className="space-y-3 p-7">
        <div className="h-10 rounded-xl border border-white/10 bg-white/10" />
        {["Бүтээгдэхүүн 01", "Бүтээгдэхүүн 02", "Бүтээгдэхүүн 03"].map(
          (name, index) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                <Package size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">{name}</p>
                <div className="mt-2 h-1.5 w-2/3 rounded-full bg-white/15" />
              </div>
              <span className="text-xs font-black text-white/80">
                #{index + 1}
              </span>
            </div>
          ),
        )}
        <div className="flex justify-center gap-2 pt-1">
          {[1, 2, 3].map((page) => (
            <span
              key={page}
              className={`h-7 w-7 rounded-lg text-center text-xs leading-7 ${page === 1 ? "bg-white font-black text-indigo-700" : "bg-white/10 text-white/60"}`}
            >
              {page}
            </span>
          ))}
        </div>
      </div>
    );
  return (
    <div className="space-y-3 p-7">
      {[
        ["Төлбөр шалгах", "2 хүлээгдэж байна", "bg-red-400"],
        ["Бараа шинэчлэх", "5 идэвхгүй", "bg-amber-300"],
        ["Хугацаа шалгах", "3 бараа", "bg-emerald-300"],
      ].map(([title, detail, tone]) => (
        <div
          key={title}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="mt-0.5 text-xs text-white/50">{detail}</p>
          </div>
          <ArrowRight size={15} className="text-white/40" />
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-xs font-bold text-emerald-200">
        <CheckCircle2 size={17} /> Алхам бүр шууд засах холбоостой
      </div>
    </div>
  );
}

export function VendorUpdateAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasRecordedImpressionRef = useRef(false);
  const close = useCallback(() => setIsOpen(false), []);
  const dismissPermanently = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(MAX_IMPRESSIONS));
    } catch {
      /* Storage may be unavailable. */
    }
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
      const count = Number.isFinite(storedCount) ? Math.max(0, storedCount) : 0;
      if (count < MAX_IMPRESSIONS) {
        localStorage.setItem(STORAGE_KEY, String(count + 1));
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
      if (event.key === "ArrowRight")
        setActiveSlide((value) => Math.min(SLIDES.length - 1, value + 1));
      if (event.key === "ArrowLeft")
        setActiveSlide((value) => Math.max(0, value - 1));
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
  const slide = SLIDES[activeSlide];
  const SlideIcon = slide.icon;
  const isLastSlide = activeSlide === SLIDES.length - 1;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/70 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-update-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.45)] sm:max-w-4xl sm:rounded-[2rem]">
        <div
          className={`relative grid overflow-hidden bg-gradient-to-br ${slide.accent} text-white transition-colors duration-500 lg:grid-cols-[1.05fr_0.95fr]`}
        >
          <div className="relative z-10 flex min-h-[330px] flex-col p-6 sm:p-9 lg:min-h-[430px]">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]">
                <Sparkles size={13} /> Vendor update
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="rounded-full border border-white/15 bg-white/10 p-2.5 text-white/75 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
                aria-label="Шинэчлэлтийн мэдээллийг хаах"
              >
                <X size={19} />
              </button>
            </div>
            <div className="my-auto py-8">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/15 shadow-lg">
                <SlideIcon size={22} />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">
                {slide.eyebrow}
              </p>
              <h2
                id="vendor-update-title"
                className="mt-3 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl"
              >
                {slide.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                {slide.description}
              </p>
            </div>
            <div
              className="flex items-center gap-2"
              aria-label={`${activeSlide + 1} / ${SLIDES.length} алхам`}
            >
              {SLIDES.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`${index + 1}-р алхам`}
                  aria-current={index === activeSlide ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all ${index === activeSlide ? "w-10 bg-white" : "w-5 bg-white/30 hover:bg-white/50"}`}
                />
              ))}
              <span className="ml-2 text-xs font-bold text-white/60">
                {activeSlide + 1}/{SLIDES.length}
              </span>
            </div>
          </div>
          <div className="relative hidden border-l border-white/10 bg-slate-950/20 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_45%)]" />
            <div className="relative h-full">
              <UpdatePreview type={slide.preview} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
          <button
            type="button"
            onClick={dismissPermanently}
            className="text-left text-xs font-semibold text-slate-400 underline-offset-4 transition hover:text-slate-600 hover:underline"
          >
            Дахин харуулахгүй
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                activeSlide === 0
                  ? close()
                  : setActiveSlide((value) => value - 1)
              }
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 sm:flex-none"
            >
              <ArrowLeft size={15} />{" "}
              {activeSlide === 0 ? "Дараа үзэх" : "Өмнөх"}
            </button>
            {!isLastSlide ? (
              <button
                type="button"
                onClick={() => setActiveSlide((value) => value + 1)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 sm:flex-none"
              >
                Дараах <ArrowRight size={16} />
              </button>
            ) : (
              <Link
                href={slide.href}
                onClick={close}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:flex-none"
              >
                <SlideIcon size={16} /> {slide.action}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
