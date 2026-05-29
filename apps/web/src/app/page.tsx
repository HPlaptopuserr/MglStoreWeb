import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Megaphone,
  Scale,
  Users,
} from "lucide-react";
import { HeroSection } from "@/components/organisms/home/HeroSection";
import Categories from "@/components/organisms/home/CategoryRail";
import { LocationRail } from "@/components/organisms/home/LocationRail";
import { BrandTicker } from "@/components/organisms/home/BrandTicker";
import { ProductGrid } from "@/components/organisms/home/grid/ProductGrid";
import { ServiceGrid } from "@/app/services/_components/ServiceGrid";
import { PartnershipContact } from "@/components/organisms/partnership/PartnershipContact";
import { FeaturedStoresSection } from "@/components/organisms/home/FeaturedStoresSection";
import { InvestorSection } from "@/components/organisms/home/InvestorSection";
import { PromoBanner } from "@/components/organisms/home/PromoBanner";
import { BranchMapSection } from "@/components/organisms/home/BranchMapSection";
import { LegalInfoQrSection } from "@/components/organisms/home/LegalInfoQrSection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_42%,#ffffff_100%)] text-slate-950">
      <div className="border-b border-slate-100 bg-white">
        <div className="container mx-auto space-y-4 px-4 pb-8 pt-5 md:px-6">
          <HeroSection />
          <PromoBanner />
        </div>
      </div>
      <BrandTicker />
      <FeaturedStoresSection />
      <Categories />
      <LocationRail />
      <ProductGrid />
      <ServiceGrid />

      <section className="border-y border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_34%),linear-gradient(180deg,#ffffff,#f8fafc)] py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
                Business support
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Бизнесээ өсгөх дараагийн алхам
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Үйлчилгээ, франчайз боломжуудыг нэг дороос сонгож, хэрэгтэй
              мэдээлэл болон файлаа хурдан аваарай.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-white transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/60">
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <BriefcaseBusiness className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                    Мэргэжлийн багц
                  </span>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 sm:text-2xl">
                  MGL Store үйлчилгээ
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                  Хууль, маркетинг, хүний нөөцийн хэрэгцээтэй үйлчилгээнүүдийг
                  мэргэжилтнүүдийн багцаас сонгон захиална.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    { label: "Хууль", icon: Scale },
                    { label: "Маркетинг", icon: Megaphone },
                    { label: "Хүний нөөц", icon: Users },
                  ].map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                    Сонголт хийхэд хялбар
                  </div>
                  <Link
                    href="/our-services"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                  >
                    Үйлчилгээ сонгох <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>

            <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-white transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/60">
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    PDF & мэдээлэл
                  </span>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 sm:text-2xl">
                  MGL Store франчайз
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                  Франчайз боломжуудын зураг, хураангуй, PDF файлыг нэг дороос
                  үзэж, өөрт тохирох загвараа сонгоно.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {["Зураг", "Хураангуй", "PDF"].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-bold text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                    Төлбөргүй нээж үзэх
                  </div>
                  <Link
                    href="/franchise"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-950"
                  >
                    Франчайз сонгох <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <InvestorSection />

      <div className="container mx-auto px-4 lg:px-8">
        <PartnershipContact />
      </div>

      <LegalInfoQrSection />
      <BranchMapSection />
    </main>
  );
}
