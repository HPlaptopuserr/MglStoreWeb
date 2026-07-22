"use client";

import { CheckCircle2, Crown, Users } from "lucide-react";
import { SYSTEM_ROLE_META } from "./constants";
import type {
  SummaryFilter,
  UsersPrimeFilter,
  UsersStatusFilter,
  UsersSummary,
} from "./types";

type UsersSummaryCardsProps = {
  summary: UsersSummary;
  roleFilter: string;
  statusFilter: UsersStatusFilter;
  primeFilter: UsersPrimeFilter;
  onApplyFilter: (filter: SummaryFilter) => void;
};

export function UsersSummaryCards({
  summary,
  roleFilter,
  statusFilter,
  primeFilter,
  onApplyFilter,
}: UsersSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <button
        type="button"
        onClick={() => onApplyFilter("all")}
        className={`rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
          !roleFilter && !statusFilter && !primeFilter
            ? "border-slate-300 ring-2 ring-slate-100"
            : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {summary.totalUsers}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Нийт
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onApplyFilter("active")}
        className={`rounded-2xl border bg-emerald-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
          statusFilter === "active"
            ? "border-emerald-300 ring-2 ring-emerald-100"
            : "border-emerald-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">
              {summary.activeUsers}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">
              Идэвхтэй
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onApplyFilter("prime")}
        className={`rounded-2xl border bg-amber-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
          primeFilter === "prime"
            ? "border-amber-300 ring-2 ring-amber-100"
            : "border-amber-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Crown className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-700">
              {summary.primeUsers}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
              Prime
            </p>
          </div>
        </div>
      </button>

      {Object.entries(SYSTEM_ROLE_META).map(([key, meta]) => {
        const count = summary.roles[key] ?? 0;
        if (!count) return null;
        const Icon = meta.icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onApplyFilter(`role:${key}`)}
            className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${meta.bg} ${
              roleFilter === key ? "ring-2 ring-violet-100" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${meta.color}`}>{count}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                  {meta.label}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
