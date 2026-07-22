import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  inverted?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  inverted = false,
}: SectionHeadingProps) {
  return (
    <div className="mb-7 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${inverted ? "text-amber-300" : "text-blue-700"}`}>
          {eyebrow}
        </p>
        <h2 className={`mt-3 text-[1.75rem] font-black leading-[1.12] tracking-[-0.035em] sm:text-4xl ${inverted ? "text-white" : "text-slate-950"}`}>
          {title}
        </h2>
        {description ? (
          <p className={`mt-3 max-w-xl text-sm font-medium leading-6 sm:text-base ${inverted ? "text-slate-300" : "text-slate-500"}`}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
