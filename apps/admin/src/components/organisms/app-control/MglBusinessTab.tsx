"use client";

import {
  Briefcase,
  Bell,
  Palette,
  BarChart3,
  Globe,
  Shield,
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard тохиргоо",
    desc: "Vendor dashboard-ын харагдах байдлыг удирдах",
    status: "active" as const,
  },
  {
    icon: Bell,
    title: "Push мэдэгдэл",
    desc: "Бизнес хэрэглэгчид рүү мэдэгдэл илгээх",
    status: "coming" as const,
  },
  {
    icon: Palette,
    title: "Теме / Брэндинг",
    desc: "Өнгө, лого, splash screen тохиргоо",
    status: "coming" as const,
  },
  {
    icon: Globe,
    title: "Хувилбарын удирдлага",
    desc: "Force update, maintenance mode",
    status: "coming" as const,
  },
  {
    icon: Shield,
    title: "Хандалтын хяналт",
    desc: "Feature flag, role-based access тохиргоо",
    status: "coming" as const,
  },
];

export function MglBusinessTab() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200/40">
          <Briefcase size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">MGL Business</h2>
          <p className="text-xs text-slate-400">
            Бизнесийн мобайл апп — бараа удирдах, захиалга хүлээн авах, POS
          </p>
        </div>
      </div>

      {/* App info card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-900 to-indigo-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              Одоогийн хувилбар
            </p>
            <p className="mt-1 text-2xl font-black text-white">v1.0.0</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              Платформ
            </p>
            <div className="mt-1 flex gap-2">
              <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                iOS
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                Android
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 transition-colors hover:border-slate-200 hover:bg-slate-50/50"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                f.status === "active"
                  ? "bg-violet-50 text-violet-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <f.icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800">{f.title}</p>
                {f.status === "coming" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    ТУН УДАХГҮЙ
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
