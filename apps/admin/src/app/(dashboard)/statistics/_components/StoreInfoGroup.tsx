import type { ReactNode } from "react";
export type StoreInfoField = readonly [string, ReactNode];
export function StoreInfoGroup({
  title,
  fields,
}: {
  title: string;
  fields: readonly StoreInfoField[];
}) {
  return (
    <section className="space-y-3">
      <h5 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
        {title}
      </h5>
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
              {value === null || value === undefined || value === ""
                ? "Бүртгэгдээгүй"
                : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function storeDate(value: string | null) {
  return value ? new Date(value).toLocaleString("mn-MN") : null;
}
export function enabledLabel(value: boolean) {
  return value ? "Идэвхтэй" : "Идэвхгүй";
}
