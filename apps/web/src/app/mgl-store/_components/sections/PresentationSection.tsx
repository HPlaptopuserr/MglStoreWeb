import Image from "next/image";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { franchiseSlideDeck } from "../mgl-store-content";

interface PresentationSectionProps { activeSlideIndex: number; progressLabel: string; onPrevious: () => void; onNext: () => void; onSelect: (index: number) => void; }

export function PresentationSection({ activeSlideIndex, progressLabel, onPrevious, onNext, onSelect }: PresentationSectionProps) {
  const activeSlide = franchiseSlideDeck[activeSlideIndex];
  return (
    <section id="presentation" className="scroll-mt-28 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeading eyebrow="Дэлгэрэнгүй танилцуулга" title="Сүлжээний үнэ цэнийг 10 слайдаар" description="Салбарын төлөвлөлтөөс мерчандайзинг хүртэлх MGL Store-ийн нэгдсэн шийдэлтэй танилцана уу." />
        <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:gap-6">
          <div className="overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-2xl shadow-slate-300/60 sm:rounded-[2rem]">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0"><p className="text-[10px] font-black tracking-[0.18em] text-amber-300">{progressLabel}</p><h3 className="mt-1 truncate text-xs font-bold text-white sm:text-base">{activeSlide.title}</h3></div>
              <div className="flex gap-2">
                <button type="button" onClick={onPrevious} aria-label="Өмнөх слайд" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={onNext} aria-label="Дараагийн слайд" className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-slate-950 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="bg-slate-100 p-1.5 sm:p-3"><Image key={activeSlide.src} src={activeSlide.src} alt={activeSlide.title} width={1280} height={720} className="aspect-video w-full animate-[slideFade_.35s_ease-out] rounded-[1rem] object-cover sm:rounded-[1.35rem]" sizes="(min-width: 1280px) 950px, 100vw" priority={activeSlideIndex === 0} /></div>
          </div>
          <aside aria-label="Танилцуулгын слайдууд" className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 lg:rounded-[2rem]">
            <div className="mb-3 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><Images className="h-4 w-4 text-blue-700" /> Бүх слайд</div>
            <div className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-1 lg:grid lg:max-h-[610px] lg:overflow-y-auto lg:pr-1">
              {franchiseSlideDeck.map((slide, index) => {
                const active = index === activeSlideIndex;
                return <button key={slide.src} type="button" onClick={() => onSelect(index)} aria-pressed={active} aria-label={`${index + 1}-р слайд: ${slide.title}`} className={`group flex w-[210px] shrink-0 snap-start items-center gap-3 rounded-2xl border p-2 text-left transition lg:w-full ${active ? "border-blue-300 bg-white shadow-md shadow-blue-900/5" : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white"}`}><span className="relative block aspect-video w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200"><Image src={slide.src} alt="" width={160} height={90} className="h-full w-full object-cover" sizes="80px" /><span className={`absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-md px-1 text-[9px] font-black ${active ? "bg-blue-700 text-white" : "bg-white/90 text-slate-700"}`}>{String(index + 1).padStart(2, "0")}</span></span><span className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-800">{slide.title}</span></button>;
              })}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
