import type { ReactNode } from "react";
export function StudyEditorPanel({
  title,
  description,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 border-b border-transparent bg-slate-50 px-4 py-3 transition hover:bg-slate-100 group-open:border-slate-100">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
            Нээх
          </span>
        </div>
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}
