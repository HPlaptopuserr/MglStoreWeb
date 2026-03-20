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
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base font-bold text-slate-900">
        {title}
      </h2>

      {href && (
        <a
          href={href}
          className="text-xs font-medium text-slate-500 hover:text-black flex items-center gap-1"
        >
          {linkText} <span>›</span>
        </a>
      )}
    </div>
  );
};