import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "../SectionHeading";
import { membershipAdvantageGroups } from "../mgl-store-content";

export function BenefitsSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-14 text-white sm:py-20">
      <div aria-hidden className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-700/25 blur-3xl" />
      <div aria-hidden className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeading inverted eyebrow="Хамтдаа өсөх экосистем" title="Нэг сүлжээ. Олон талын бодит өгөөж." description="Бизнесийн бүх оролцогчид илүү үр ашигтай, илүү итгэлтэй, илүү өргөн хүрээнд ажиллана." />
        <div className="grid gap-3 md:grid-cols-3 md:gap-5">
          {membershipAdvantageGroups.map(({ title, items, icon: Icon }, index) => (
            <article key={title} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-amber-300/30 hover:bg-white/[0.09] sm:p-7">
              <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-slate-950"><Icon className="h-6 w-6" /></span><span className="text-4xl font-black text-white/[0.06]">0{index + 1}</span></div>
              <h3 className="mt-5 text-xl font-black sm:text-2xl">{title}</h3>
              <ul className="mt-4 space-y-2.5">{items.map((item) => <li key={item} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span className="text-sm font-medium leading-5 text-slate-300">{item}</span></li>)}</ul>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-[1.5rem] bg-blue-700 p-5 shadow-2xl shadow-blue-950/30 sm:flex-row sm:items-center sm:p-7">
          <div><p className="text-xl font-black sm:text-2xl">Өсөлтийн дараагийн алхмаа өнөөдөр эхлүүлээрэй.</p><p className="mt-1 text-sm font-medium text-blue-100">MGL Store-ийн гишүүнчлэлийн баг тантай холбогдох болно.</p></div>
          <Link href="/apply/partnership" className="group inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950 transition hover:bg-white sm:w-auto">Хүсэлт илгээх <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </div>
      </div>
    </section>
  );
}
