"use client";

import type React from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Sparkles, Wrench } from "lucide-react";
import type { ServiceCategory } from "../types";

type OurServicesHeroProps = {
  categories: ServiceCategory[];
  loading: boolean;
};

export function OurServicesHero({ categories, loading }: OurServicesHeroProps) {
  const serviceCount = categories.reduce(
    (count, category) =>
      count +
      category.subCategories.reduce((subCount, subCategory) => subCount + subCategory.items.length, 0),
    0,
  );
  const packageCount = categories.reduce((count, category) => count + category.subCategories.length, 0);
  const previewCategories = categories.slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(249,115,22,0.38),transparent_28%),linear-gradient(135deg,#020617_0%,#111827_52%,#fb5b2f_125%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-50 to-transparent" />

      <div className="container relative z-10 mx-auto px-4 pb-20 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
        <nav className="mb-8 flex items-center gap-2 text-xs font-bold text-white/45">
          <Link href="/" className="transition hover:text-white">Нүүр</Link>
          <span>/</span>
          <span className="text-white">MGL үйлчилгээ</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-100 backdrop-blur-sm">
              <Wrench className="h-4 w-4" />
              MGL service desk
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
              MGL-ээс гаргаж буй
              <span className="block text-orange-300">үйлчилгээнүүд</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/68 md:text-lg">
              Хууль, маркетинг, хүний нөөц, сургалт болон байгууллагын өдөр тутмын
              ажиллагаанд хэрэгтэй мэргэжлийн багцуудыг нэг дороос сонгоно.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {previewCategories.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-black text-white/86 ring-1 ring-white/10 transition hover:bg-white hover:text-slate-950"
                >
                  <span>{category.icon}</span>
                  {category.title}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/20 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-3">
              <HeroStat icon={BriefcaseBusiness} label="Ангилал" value={loading ? "..." : `${categories.length}`} />
              <HeroStat icon={BadgeCheck} label="Багц" value={loading ? "..." : `${packageCount}`} />
              <HeroStat icon={Sparkles} label="Үйлчилгээ" value={loading ? "..." : `${serviceCount}`} />
              <Link
                href="#services"
                className="group flex min-h-[104px] flex-col justify-between rounded-2xl bg-orange-500 p-4 text-white transition hover:bg-white hover:text-slate-950"
              >
                <span className="text-xs font-black uppercase tracking-[0.16em] opacity-75">Сонгох</span>
                <span className="inline-flex items-center gap-2 text-lg font-black">
                  Эхлэх <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[104px] rounded-2xl bg-white p-4 text-slate-950">
      <Icon className="h-5 w-5 text-orange-500" />
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
    </div>
  );
}
