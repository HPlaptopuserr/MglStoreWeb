"use client";

import { Crown, Banknote, Gift, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type GrantRecord = {
  id: string;
  planType: string;
  planName: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  grantedByAdmin: boolean;
  grantNote: string | null;
  grantedById: string | null;
};

type Props = {
  history: GrantRecord[];
  loading?: boolean;
};

const STATUS_CONFIG = {
  PAID: {
    label: "Баталгаажсан",
    icon: CheckCircle2,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  PENDING: {
    label: "Хүлээгдэж байна",
    icon: Clock,
    className: "text-amber-600 bg-amber-50 border-amber-200",
  },
  EXPIRED: {
    label: "Дууссан",
    icon: XCircle,
    className: "text-slate-500 bg-slate-50 border-slate-200",
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    icon: AlertCircle,
    className: "text-red-500 bg-red-50 border-red-200",
  },
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Үнэгүй туршилт",
  "1m": "1 Сар",
  "3m": "3 Сар",
  "6m": "6 Сар",
  "1y": "1 Жил",
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PlanGrantHistory({ history, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Crown size={32} className="text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-400">Хөдөлгөөний түүх байхгүй</p>
        <p className="text-xs text-slate-300 mt-1">Идэвхжүүлсний дараа энд харагдана</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((record) => {
        const statusCfg = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.EXPIRED;
        const StatusIcon = statusCfg.icon;

        return (
          <div
            key={record.id}
            className="rounded-xl border border-slate-100 bg-white p-3.5 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    record.grantedByAdmin
                      ? "bg-violet-50"
                      : "bg-indigo-50"
                  }`}
                >
                  {record.grantedByAdmin ? (
                    <Gift size={15} className="text-violet-600" />
                  ) : (
                    <Banknote size={15} className="text-indigo-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">
                      {PLAN_LABELS[record.planType] ?? record.planName}
                    </p>
                    {record.grantedByAdmin && (
                      <span className="text-xs font-medium text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                        Admin нэмсэн
                      </span>
                    )}
                  </div>
                  {record.grantNote && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
                      "{record.grantNote}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400">{fmt(record.createdAt)}</span>
                    {record.expiresAt && (
                      <span className="text-xs text-slate-400">→ {fmt(record.expiresAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.className}`}
                >
                  <StatusIcon size={11} />
                  {statusCfg.label}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {record.amount > 0 ? `${record.amount.toLocaleString()}₮` : "Үнэгүй"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
