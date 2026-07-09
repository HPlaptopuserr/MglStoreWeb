"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import {
  franchiseSlideDeck,
  membershipAdvantageGroups,
  presentationHighlights,
  sixSStandards,
  standardSections,
} from "./mgl-store-content";

export function MglStoreLanding() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = franchiseSlideDeck[activeSlideIndex];

  const progressLabel = useMemo(
    () => `${String(activeSlideIndex + 1).padStart(2, "0")} / ${franchiseSlideDeck.length}`,
    [activeSlideIndex],
  );

  const goToPrevious = () => {
    setActiveSlideIndex((index) =>
      index === 0 ? franchiseSlideDeck.length - 1 : index - 1,
    );
  };

  const goToNext = () => {
    setActiveSlideIndex((index) =>
      index === franchiseSlideDeck.length - 1 ? 0 : index + 1,
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto grid gap-8 px-4 py-10 md:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:py-12 xl:pr-24 2xl:pr-6">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              MGL Store | Франчайз & гишүүнчлэл
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Монгол эзэнтэй үндэсний сүлжээ дэлгүүр
            </h1>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
              Жижиг, дунд бизнес эрхлэгчид, дэлгүүрийн эзэд,
              үйлдвэрлэгчид нэг стандартад суурилсан худалдааны сүлжээнд
              нэгдэнэ.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {presentationHighlights.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <Icon className="h-5 w-5 text-blue-700" />
                  <p className="mt-3 text-sm font-black text-slate-950">
                    {title}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#presentation"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-blue-700"
              >
                Танилцуулга үзэх <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/apply/partnership"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-amber-300 hover:text-amber-700"
              >
                Гишүүнээр элсэх
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-2xl shadow-slate-200">
            <Image
              src={franchiseSlideDeck[0].src}
              alt={franchiseSlideDeck[0].title}
              width={1280}
              height={720}
              priority
              className="h-auto w-full rounded-xl bg-white"
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#f6f8fb] py-10">
        <div className="container mx-auto px-4 md:px-6 xl:pr-24 2xl:pr-6">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                6S стандарт
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Цэвэр, цэгцтэй, аюулгүй дэлгүүрийн үндэс
              </h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {sixSStandards.map(({ title, icon: Icon }, index) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-300 text-xs font-black text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {standardSections.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-blue-700" />
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="presentation" className="bg-white py-10">
        <div className="container mx-auto px-4 md:px-6 xl:pr-24 2xl:pr-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                PDF танилцуулга
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Франчайз & гишүүнчлэлийн 10 слайд
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500">
              PDF дээрх мэдээлэл бүрэн үлдсэн. Доорх слайд сонгогчоос
              хуудсаа сольж үзнэ.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-300">
                    {progressLabel}
                  </p>
                  <h3 className="truncate text-sm font-black text-white sm:text-base">
                    {activeSlide.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Өмнөх слайд"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Дараагийн слайд"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="bg-slate-100 p-2 sm:p-3">
                <Image
                  src={activeSlide.src}
                  alt={activeSlide.title}
                  width={1280}
                  height={720}
                  className="h-auto w-full rounded-xl bg-white"
                  sizes="(min-width: 1280px) 860px, 100vw"
                  priority={activeSlideIndex === 0}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Maximize2 className="h-3.5 w-3.5" />
                Слайдууд
              </div>
              <div className="grid max-h-[620px] gap-2 overflow-y-auto pr-1">
                {franchiseSlideDeck.map((slide, index) => {
                  const active = index === activeSlideIndex;
                  return (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => setActiveSlideIndex(index)}
                      aria-pressed={active}
                      className={`group flex items-center gap-3 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-blue-300 bg-white shadow-sm"
                          : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <span className="relative block h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                        <Image
                          src={slide.src}
                          alt=""
                          width={160}
                          height={90}
                          className="h-full w-full object-cover"
                          sizes="80px"
                        />
                        <span
                          className={`absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-black ${
                            active
                              ? "bg-blue-700 text-white"
                              : "bg-white/90 text-slate-700"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-xs font-black leading-4 text-slate-800">
                          {slide.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 py-10 text-white">
        <div className="container mx-auto px-4 md:px-6 xl:pr-24 2xl:pr-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                Гишүүнчлэлийн давуу тал
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Дэлгүүр, үйлдвэрлэгч, хэрэглэгч нэг системд
              </h2>
            </div>
            <Link
              href="/apply/partnership"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 transition hover:bg-white"
            >
              Гишүүнээр элсэх хүсэлт илгээх
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {membershipAdvantageGroups.map(({ title, items, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/10"
              >
                <Icon className="h-6 w-6 text-amber-300" />
                <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
                <div className="mt-4 space-y-2">
                  {items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <span className="text-sm font-semibold leading-5 text-slate-200">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
