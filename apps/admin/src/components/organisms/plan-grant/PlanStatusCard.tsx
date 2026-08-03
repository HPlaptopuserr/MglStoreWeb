"use client";

import { Crown, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  trial: "Үнэгүй туршилт",
  silver_1m: "Silver · 1 сар",
  silver_6m: "Silver · 6 сар",
  gold_1m: "Gold · 1 сар",
  gold_6m: "Gold · 6 сар",
  platinum_1m: "Platinum · 1 сар",
  platinum_6m: "Platinum · 6 сар",
  "1m": "1 Сар",
  "3m": "3 Сар",
  "6m": "6 Сар",
  "1y": "Энэ оныг дуустал",
};

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  trial: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-600",
  },
  silver_1m: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
  },
  silver_6m: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
  },
  gold_1m: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
  },
  gold_6m: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
  },
  platinum_1m: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    badge: "bg-violet-100 text-violet-700",
  },
  platinum_6m: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    badge: "bg-violet-100 text-violet-700",
  },
  "1m": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
  },
  "3m": {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    badge: "bg-violet-100 text-violet-700",
  },
  "6m": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
  },
  "1y": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

type Props = {
  planType: string | null;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  subdomainEnabled: boolean;
  trialUsed: boolean;
  slug: string;
};

export function PlanStatusCard({
  planType,
  planActivatedAt,
  planExpiresAt,
  subdomainEnabled,
  trialUsed,
  slug,
}: Props) {
  const isActive =
    subdomainEnabled && planExpiresAt ? new Date(planExpiresAt) > new Date() : false;

  const daysLeft = planExpiresAt
    ? Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / 86_400_000)
    : null;

  const colors = planType ? PLAN_COLORS[planType] ?? PLAN_COLORS["1m"] : null;

  return (
    <div className="space-y-3">
      {isActive && planType && colors ? (
        <div className={`rounded-xl border ${colors.bg} ${colors.border} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown size={18} className={colors.text} />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {PLAN_LABELS[planType] ?? planType}
                </p>
                {planActivatedAt && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Идэвхжсэн: {new Date(planActivatedAt).toLocaleDateString("mn-MN")}
                  </p>
                )}
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
              Идэвхтэй
            </span>
          </div>

          {planExpiresAt && (
            <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock size={13} />
                <span>Дуусах: {new Date(planExpiresAt).toLocaleDateString("mn-MN")}</span>
              </div>
              {daysLeft !== null && (
                <span
                  className={`text-xs font-bold ${
                    daysLeft <= 7
                      ? "text-red-600"
                      : daysLeft <= 30
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {daysLeft > 0 ? `${daysLeft} өдөр үлдсэн` : "Дууссан"}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
          <XCircle size={18} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-600">Идэвхтэй план байхгүй</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {planExpiresAt && new Date(planExpiresAt) <= new Date()
                ? `Дууссан: ${new Date(planExpiresAt).toLocaleDateString("mn-MN")}`
                : "Одоогоор идэвхжүүлээгүй"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          <Zap size={12} />
          Субдомайн: {subdomainEnabled ? "Тийм" : "Үгүй"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {trialUsed ? (
            <CheckCircle2 size={12} className="text-emerald-500" />
          ) : (
            <XCircle size={12} className="text-slate-400" />
          )}
          Туршилт: {trialUsed ? "Ашигласан" : "Ашиглаагүй"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full truncate max-w-full">
          🔗 {slug}.mglstore.mn
        </div>
      </div>
    </div>
  );
}
