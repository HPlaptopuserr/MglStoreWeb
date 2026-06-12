import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardModules } from "@/components/dashboard/dashboardConfig";
import { OrgFeatureState } from "@/lib/org-types";

export default function ModuleGrid({
  features,
}: {
  features: OrgFeatureState;
}) {
  const modules = getDashboardModules(features);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <article
            key={module.title}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              module.enabled
                ? "border-slate-200"
                : "border-dashed border-slate-300 opacity-65"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    {module.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {module.desc}
                  </p>
                  {!module.enabled && (
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-amber-600">
                      Энэ module одоогоор хаалттай
                    </p>
                  )}
                </div>
              </div>
              {module.enabled && (
                <Link
                  href={module.href}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label={`${module.title} нээх`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
