import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Files,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ArchiveStatusFilter } from "./types";

interface SummaryItem {
  key: ArchiveStatusFilter;
  label: string;
  count: number;
  icon: LucideIcon;
  tone: string;
  activeTone: string;
}

export function ContractArchiveSummary({
  stats,
  active,
  onChange,
}: {
  stats: {
    all: number;
    signed: number;
    pending: number;
    expiring: number;
    expired: number;
  };
  active: ArchiveStatusFilter;
  onChange: (filter: ArchiveStatusFilter) => void;
}) {
  const items: SummaryItem[] = [
    { key: "ALL", label: "Бүх гэрээ", count: stats.all, icon: Files, tone: "text-slate-600 bg-slate-100", activeTone: "border-slate-950 bg-slate-950" },
    { key: "SIGNED", label: "Баталгаажсан", count: stats.signed, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100", activeTone: "border-emerald-600 bg-emerald-600" },
    { key: "PENDING", label: "Хүлээгдэж буй", count: stats.pending, icon: Clock3, tone: "text-amber-700 bg-amber-100", activeTone: "border-amber-500 bg-amber-500" },
    { key: "EXPIRING", label: "Дуусах дөхсөн", count: stats.expiring, icon: AlertTriangle, tone: "text-orange-700 bg-orange-100", activeTone: "border-orange-500 bg-orange-500" },
    { key: "EXPIRED", label: "Хугацаа дууссан", count: stats.expired, icon: XCircle, tone: "text-rose-700 bg-rose-100", activeTone: "border-rose-600 bg-rose-600" },
  ];

  return (
    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-slate-100" aria-label="Гэрээний төлөв">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.key)}
            className={`group flex min-h-[84px] items-center gap-3 border-b border-slate-100 p-3.5 text-left transition last:border-b-0 hover:bg-slate-50 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:min-h-0 xl:border-b-0 ${
              selected ? `${item.activeTone} text-white hover:brightness-105` : "bg-white text-slate-950"
            }`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-white/15" : item.tone}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-xs font-bold ${selected ? "text-white/75" : "text-slate-500"}`}>{item.label}</p>
              <p className="mt-0.5 text-2xl font-black leading-none">{item.count}</p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
