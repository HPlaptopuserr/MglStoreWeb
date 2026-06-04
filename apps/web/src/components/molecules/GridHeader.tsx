import React from "react";

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkText?: string;
  eyebrow?: string;
  description?: string;
  meta?: string;
}

export const GridHeader: React.FC<SectionHeaderProps> = ({
  title,
  href,
  linkText = "Бүгд",
  eyebrow = "MGL Store",
  description,
  meta,
}) => {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
            {eyebrow}
          </p>
          {meta && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {meta}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {href && (
        <a
          href={href}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 sm:px-4"
        >
          {linkText} <span>›</span>
        </a>
      )}
    </div>
  );
};
