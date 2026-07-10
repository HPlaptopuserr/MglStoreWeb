import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import { franchiseSlideDeck, presentationHighlights } from "../mgl-store-content";

const metrics = [
  { value: "6S", label: "Нэгдсэн стандарт" },
  { value: "51м²", label: "Жишиг төлөвлөлт" },
  { value: "360°", label: "Бизнесийн дэмжлэг" },
];

export function HeroSection() {
  return (
    <section className="relative isolate border-b border-slate-200/80 bg-white">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[70%] bg-[radial-gradient(circle_at_85%_10%,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_10%_15%,rgba(251,191,36,0.12),transparent_28%)]" />
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12 lg:px-10 lg:py-14 xl:px-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 sm:text-xs">
            <BadgeCheck className="h-4 w-4" /> MGL Store · Франчайз & гишүүнчлэл
          </div>
          <h1 className="mt-5 text-[2.65rem] font-black leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[3.5rem] xl:text-[3.85rem]">
            Монгол эзэнтэй<br />
            <span className="text-blue-700">үндэсний сүлжээ</span> дэлгүүр
          </h1>
          <p className="mt-5 max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Дэлгүүр, үйлдвэрлэгч, хэрэглэгчийг нэг стандарт, нэг технологи,
            нэг хүчирхэг брэндийн дор холбосон худалдааны экосистем.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:flex">
            <a href="#presentation" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              Танилцуулга <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link href="/apply/partnership" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
              Гишүүнээр элсэх
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="px-3 first:pl-0 sm:px-5 sm:first:pl-0">
                <p className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl">{metric.value}</p>
                <p className="mt-0.5 text-[9px] font-bold leading-4 text-slate-500 sm:text-xs">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-8 lg:mt-0">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-200/50 via-transparent to-amber-200/60 blur-2xl" />
          <div className="overflow-hidden rounded-[1.5rem] border border-white bg-white p-1.5 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.35)] sm:rounded-[2rem] sm:p-2.5">
            <Image src={franchiseSlideDeck[0].src} alt={franchiseSlideDeck[0].title} width={1280} height={720} priority loading="eager" className="aspect-video w-full rounded-[1.15rem] object-cover sm:rounded-[1.5rem]" sizes="(min-width: 1024px) 56vw, 100vw" />
          </div>
          <div className="absolute -bottom-4 left-3 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-3 shadow-xl backdrop-blur sm:-left-5 sm:bottom-6">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300 text-slate-950"><MapPin className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Монгол даяар</p><p className="text-xs font-black text-slate-900 sm:text-sm">Нэгдсэн сүлжээ</p></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-10 xl:px-16">
        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-3 sm:p-4">
          {presentationHighlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="group flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white"><Icon className="h-5 w-5" /></span>
              <div><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
