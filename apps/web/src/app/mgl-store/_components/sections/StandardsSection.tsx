"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { SectionHeading } from "../SectionHeading";
import { sixSStandards } from "../mgl-store-content";

const sixSDetailSlides = [
  {
    title: "Ариун цэврийн өрөө",
    src: "/mgl-store/6s-standard/01-restroom.jpg",
  },
  {
    title: "Хаягжилт болон хувцасны нэг стандарт",
    src: "/mgl-store/6s-standard/02-branding.jpg",
  },
  {
    title: "Кофе болон тав тухтай суух хэсэг",
    src: "/mgl-store/6s-standard/03-coffee-zone.jpg",
  },
  {
    title: "Нэгдсэн сургалтад хамрагдах",
    src: "/mgl-store/6s-standard/04-training.jpg",
  },
  {
    title: "Касс болон бараа татан авалтын нэгдсэн систем",
    src: "/mgl-store/6s-standard/05-supply-system.jpg",
  },
  {
    title: "Нэгдсэн нэг маркетинг",
    src: "/mgl-store/6s-standard/06-marketing.jpg",
  },
] as const;

export function StandardsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const activeSlide = sixSDetailSlides[activeIndex];

  useLockBodyScroll(isExpanded);

  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
      if (event.key === "ArrowLeft") selectPrevious();
      if (event.key === "ArrowRight") selectNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const selectPrevious = () => {
    setActiveIndex((index) =>
      index === 0 ? sixSDetailSlides.length - 1 : index - 1,
    );
  };

  const selectNext = () => {
    setActiveIndex((index) =>
      index === sixSDetailSlides.length - 1 ? 0 : index + 1,
    );
  };

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeading
          eyebrow="Чанарын шинэ түвшин"
          title="Стандарт бол итгэлцлийн эхлэл"
          description="Хэрэглэгч орж ирсэн мөчөөс худалдан авалт дуусах хүртэлх туршлагыг цэвэр, ойлгомжтой, аюулгүй болгоно."
        />

        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:gap-6">
          <article className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white sm:p-7">
            <div
              aria-hidden
              className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl"
            />
            <p className="relative text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              6S стандарт
            </p>
            <h3 className="relative mt-3 max-w-sm text-2xl font-black tracking-tight sm:text-3xl">
              Цэгцтэй дэлгүүр.
              <br />
              Тав тухтай худалдан авалт.
            </h3>

            <div
              role="tablist"
              aria-label="6S стандартын дэлгэрэнгүй"
              className="relative mt-6 grid grid-cols-2 gap-2.5"
            >
              {sixSStandards.map(({ title, icon: Icon }, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={title}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="six-s-slide-panel"
                    onClick={() => setActiveIndex(index)}
                    className={`flex min-h-14 items-center gap-2.5 rounded-2xl p-2.5 text-left ring-1 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                      isActive
                        ? "bg-blue-600 text-white ring-blue-400 shadow-lg shadow-blue-950/30"
                        : "bg-white/[0.07] text-white ring-white/10 hover:bg-white/[0.12]"
                    }`}
                  >
                    <span
                      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        isActive
                          ? "bg-white/15 text-amber-300"
                          : "bg-white/10 text-amber-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1 text-[8px] font-black text-slate-950">
                        {index + 1}S
                      </span>
                    </span>
                    <span className="text-xs font-bold sm:text-sm">{title}</span>
                  </button>
                );
              })}
            </div>
          </article>

          <article
            id="six-s-slide-panel"
            role="tabpanel"
            aria-label={`${activeIndex + 1}S: ${activeSlide.title}`}
            className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 sm:rounded-[1.75rem]"
          >
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  {activeIndex + 1}S / {sixSDetailSlides.length}S
                </p>
                <h3 className="mt-1 truncate text-sm font-black text-slate-950 sm:text-base">
                  {activeSlide.title}
                </h3>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={selectPrevious}
                  aria-label="Өмнөх 6S слайд"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={selectNext}
                  aria-label="Дараагийн 6S слайд"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-100 p-1.5 sm:p-3">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                aria-label={`${activeSlide.title} слайдыг томруулж харах`}
                className="group relative block w-full overflow-hidden rounded-[1rem] bg-white text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:rounded-[1.25rem]"
              >
                <Image
                  key={activeSlide.src}
                  src={activeSlide.src}
                  alt={`${activeIndex + 1}S стандарт - ${activeSlide.title}`}
                  width={2200}
                  height={1238}
                  className="aspect-video w-full animate-[slideFade_.35s_ease-out] object-cover transition duration-300 group-hover:scale-[1.01]"
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  priority={activeIndex === 0}
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-2 text-xs font-black text-white opacity-100 shadow-lg backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4" />
                  Томруулж харах
                </span>
              </button>
            </div>
          </article>
        </div>
      </div>

      {isExpanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeSlide.title} томруулсан слайд`}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/95 p-2 backdrop-blur-sm sm:p-6"
          onClick={() => setIsExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="Томруулсан слайдыг хаах"
            className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:top-6"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectPrevious();
            }}
            aria-label="Өмнөх 6S слайд"
            className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="w-full max-w-[1500px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 px-12 text-center text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                {activeIndex + 1}S / {sixSDetailSlides.length}S
              </p>
              <h3 className="mt-1 truncate text-sm font-black sm:text-lg">
                {activeSlide.title}
              </h3>
            </div>
            <Image
              key={`expanded-${activeSlide.src}`}
              src={activeSlide.src}
              alt={`${activeIndex + 1}S стандарт - ${activeSlide.title}`}
              width={2200}
              height={1238}
              className="max-h-[calc(100vh-7rem)] w-full rounded-xl object-contain shadow-2xl sm:rounded-2xl"
              sizes="100vw"
              priority
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectNext();
            }}
            aria-label="Дараагийн 6S слайд"
            className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
