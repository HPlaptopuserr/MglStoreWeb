import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatisticsSummaryCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: string;
  href?: string;
  badge?: ReactNode;
}

export function StatisticsSummaryCard({ label, value, note, icon: Icon, tone, href, badge }: StatisticsSummaryCardProps) {
  const className = "group block h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const content = <>
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone} text-white`}><Icon aria-hidden="true" className="h-5 w-5" /></div>
      {badge ?? (href ? <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-slate-400 group-hover:text-sky-600" /> : null)}
    </div>
    <p className="mt-4 text-xs font-bold uppercase text-slate-500">{label}</p>
    <p title={value} className="mt-1 truncate text-2xl font-black tabular-nums text-slate-950">{value}</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{note}</p>
  </>;
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}
