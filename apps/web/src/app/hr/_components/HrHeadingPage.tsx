import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import type { HrServiceGroup } from "@/components/molecules/hr/hr-services-data";
import { HrServiceCard } from "./HrServiceCard";

type HrHeadingPageProps = {
  groups: HrServiceGroup[];
  group: HrServiceGroup;
};

function isPlaceholderText(value?: string) {
  const text = (value || "").trim().toLowerCase();
  if (!text) return true;
  if (
    /^(asd|test|demo|sample|lorem|йы|ыб|юу багтах вэ)[\w\s,.-]*$/i.test(text)
  ) {
    return true;
  }
  const lettersOnly = text.replace(
    /[\s\d.,/\\|()[\]{}'"`~!@#$%^&*_:;?+=-]/g,
    "",
  );
  if (lettersOnly.length >= 8 && new Set(lettersOnly).size <= 3) return true;
  return false;
}

function getCleanDescription(group: HrServiceGroup) {
  if (!isPlaceholderText(group.introDescription)) {
    return group.introDescription?.trim();
  }
  if (!isPlaceholderText(group.description)) {
    return group.description;
  }
  return `${group.label} чиглэлийн HR материал, маягт болон хэрэгжүүлэх алхмуудыг нэг дороос сонгон үзнэ.`;
}

export function HrHeadingPage({ groups, group }: HrHeadingPageProps) {
  const ActiveIcon = group.icon || GraduationCap;
  const galleryImages = group.images.slice(0, 6);
  const heroImage = galleryImages[0];
  const cleanDescription = getCleanDescription(group);
  const relatedGroups = groups.filter((item) => item.id !== group.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_76%_0%,rgba(251,146,60,0.16),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_58%,#f8fafc_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:px-8 lg:py-16">
        <Link
          href="/hr"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          HR үйлчилгээ рүү буцах
        </Link>

        <section className="relative z-10 mt-7 mb-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-700">
              <span className="h-px w-8 bg-orange-400/70" />
              HR service access
            </div>
            <h1 className="mt-4 text-4xl font-black leading-none tracking-tight text-slate-950 sm:text-5xl">
              {group.label}{" "}
              <span className="font-serif text-3xl text-orange-500 sm:text-4xl">
                материалууд
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
              {cleanDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {group.services.length} материал
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm">
                <ImagePlus className="h-3.5 w-3.5 text-orange-500" />
                {galleryImages.length} зураг
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm">
                <Users className="h-3.5 w-3.5 text-cyan-600" />
                {group.people.length} баг
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
            <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
              {heroImage ? (
                <img
                  src={heroImage.url}
                  alt={
                    !isPlaceholderText(heroImage.caption)
                      ? heroImage.caption
                      : group.label
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#ecfdf5,#eef2ff)] text-slate-500">
                  <ActiveIcon className="h-14 w-14 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-[0.22em]">
                    MGL Store HR
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur-md">
                  {group.label}
                </span>
                <span className="rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/25">
                  HR
                </span>
              </div>
            </div>
          </div>
        </section>

        {relatedGroups.length > 0 && (
          <section className="relative z-10 mb-8">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              <Link
                href={`/hr/${group.id}`}
                className="flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm"
              >
                <ActiveIcon className="h-4 w-4" />
                {group.label}
              </Link>
              {relatedGroups.map((item) => {
                const Icon = item.icon || BriefcaseBusiness;
                return (
                  <Link
                    key={item.id}
                    href={`/hr/${item.id}`}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="relative z-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
                All HR materials
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Бүх HR материал
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
              {group.services.length}
            </span>
          </div>

          {group.services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
              <Sparkles className="mx-auto h-9 w-9 text-emerald-500" />
              <p className="mt-4 text-lg font-bold text-slate-500">
                Энэ HR үйлчилгээний хэсэгт материал нэмэгдээгүй байна.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {group.services.map((service, index) => (
                <HrServiceCard
                  key={service.id}
                  service={service}
                  groupId={group.id}
                  index={index}
                  imageUrl={
                    service.imageUrl ||
                    galleryImages[index % Math.max(galleryImages.length, 1)]
                      ?.url
                  }
                />
              ))}

              <article className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <Plus className="h-8 w-8" />
                </div>
                <h3 className="mt-7 text-lg font-black text-slate-950">
                  Шинэ HR материал удахгүй
                </h3>
                <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-500">
                  Admin дээр HR файл, маягт нэмэхэд энэ хэсэгт card хэлбэрээр
                  автоматаар гарна.
                </p>
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
