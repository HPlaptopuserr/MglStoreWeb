"use client";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
interface Props {
  id: string; title: string; position: number; status: string;
  expanded: boolean; onExpand: () => void; controls: ReactNode; children: ReactNode;
}
export function ExpandableMglAppCard({ id, title, position, status, expanded, onExpand, controls, children }: Props) {
  return <article className={`min-w-0 self-start overflow-hidden rounded-2xl border transition-colors motion-reduce:transition-none ${expanded ? "border-violet-200 bg-white shadow-sm sm:col-span-2 xl:col-span-3" : "border-slate-100 bg-slate-50/60 hover:bg-slate-100"}`}>
    <div className="flex flex-wrap items-center gap-3 p-4">
      <button type="button" aria-expanded={expanded} aria-controls={`mgl-app-detail-${id}`} onClick={onExpand} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <span className="text-xs font-medium text-slate-400">{position + 1}.</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs text-slate-500">{status}</span></span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div className="flex items-center gap-2">{controls}</div>
    </div>
    <div id={`mgl-app-detail-${id}`} hidden={!expanded} className="border-t border-slate-100 p-4 sm:p-5">
      {children}
    </div>
  </article>;
}
