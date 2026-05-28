import React from "react";

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkText?: string;
}

export const GridHeader: React.FC<SectionHeaderProps> = ({
  title,
  href,
  linkText = "Бүгд",
}) => {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
          MGL Store
        </p>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
      </div>

      {href && (
        <a
          href={href}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
        >
          {linkText} <span>›</span>
        </a>
      )}
    </div>
  );
};
