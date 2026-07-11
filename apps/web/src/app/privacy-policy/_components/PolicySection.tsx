import type { ReactNode } from "react";

interface PolicySectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

export function PolicySection({
  id,
  number,
  title,
  children,
}: PolicySectionProps) {
  return (
    <section id={id} className="scroll-mt-36 border-b border-slate-200 py-8 last:border-0">
      <div className="flex gap-4 sm:gap-6">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-700"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
