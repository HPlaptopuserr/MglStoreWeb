import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import type { HrServiceGroup } from "@/components/molecules/hr/hr-services-data";

type HrHubPageProps = {
  groups: HrServiceGroup[];
};

export function HrHubPage({ groups }: HrHubPageProps) {
  const serviceCount = groups.reduce((sum, group) => sum + group.services.length, 0);

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-600">
                HR service center
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Хүний нөөцийн үйлчилгээ
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-500">
                Admin-аас үүсгэсэн гол гарчиг бүр өөрийн дэлгэрэнгүй page-тэй.
                Маягт, файл, зөвлөмжүүдийг нэг бүтэцтэйгээр үзнэ.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
              <Sparkles className="h-4 w-4" />
              {groups.length} төрөл · {serviceCount} үйлчилгээ
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group, index) => {
            const Icon = group.icon || BriefcaseBusiness;
            return (
              <Link
                key={group.id}
                href={`/hr/${group.id}`}
                className="group flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/50"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xs font-black text-slate-400 ring-1 ring-slate-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="text-xl font-black leading-tight text-slate-950">
                  {group.label}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
                  {group.description}
                </p>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {group.services.length} үйлчилгээ
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
                    Нээх
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
