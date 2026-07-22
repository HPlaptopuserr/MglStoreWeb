import { Check } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { sixSStandards, standardSections } from "../mgl-store-content";

export function StandardsSection() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeading eyebrow="Чанарын шинэ түвшин" title="Стандарт бол итгэлцлийн эхлэл" description="Хэрэглэгч орж ирсэн мөчөөс худалдан авалт дуусах хүртэлх туршлагыг цэвэр, ойлгомжтой, аюулгүй болгоно." />
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
          <article className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white sm:p-8">
            <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">6S стандарт</p>
            <h3 className="mt-3 max-w-sm text-2xl font-black tracking-tight sm:text-3xl">Цэгцтэй дэлгүүр.<br />Тав тухтай худалдан авалт.</h3>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {sixSStandards.map(({ title, icon: Icon }, index) => (
                <div key={title} className="flex min-h-14 items-center gap-2.5 rounded-2xl bg-white/[0.07] p-2.5 ring-1 ring-white/10">
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-amber-300"><Icon className="h-4 w-4" /><span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[8px] font-black text-white">{index + 1}</span></span>
                  <span className="text-xs font-bold sm:text-sm">{title}</span>
                </div>
              ))}
            </div>
          </article>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {standardSections.map(({ title, description, icon: Icon }) => (
              <article key={title} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5 sm:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-base font-black text-slate-950 sm:text-xl">{title}</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500 sm:text-sm sm:leading-6">{description}</p>
                <span className="mt-4 hidden items-center gap-1 text-xs font-black text-blue-700 sm:flex"><Check className="h-3.5 w-3.5" /> Стандартад багтсан</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
