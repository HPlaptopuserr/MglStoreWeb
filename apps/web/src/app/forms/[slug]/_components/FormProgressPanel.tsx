"use client";

import { ClipboardCheck, Save } from "lucide-react";

type FormProgressPanelProps = {
  answeredCount: number;
  draftSavedAt: string | null;
  fieldCount: number;
  requiredCount: number;
  title: string;
};

const formatSavedAt = (savedAt: string | null) => {
  if (!savedAt) return "Ноорог автоматаар хадгалагдана";

  return `Ноорог ${new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(savedAt))}-д хадгалагдсан`;
};

export function FormProgressPanel({
  answeredCount,
  draftSavedAt,
  fieldCount,
  requiredCount,
  title,
}: FormProgressPanelProps) {
  const progress =
    fieldCount > 0 ? Math.round((answeredCount / fieldCount) * 100) : 0;

  return (
    <aside className="h-fit self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-[9rem]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <ClipboardCheck className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-black leading-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm font-black text-slate-700">
          <span>Явц</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500">
          {answeredCount}/{fieldCount} талбар бөглөгдсөн
        </p>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        <Save className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{formatSavedAt(draftSavedAt)}</span>
      </div>
      {requiredCount > 0 && (
        <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
          <span className="text-rose-500">*</span> тэмдэгтэй {requiredCount}{" "}
          талбар заавал бөглөгдөнө.
        </p>
      )}
    </aside>
  );
}
