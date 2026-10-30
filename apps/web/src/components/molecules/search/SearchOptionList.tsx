"use client";

import { ArrowRight, Loader2, Store, Tag } from "lucide-react";
import type { SearchOption } from "./search-model";
import type { SearchOptionState } from "./use-search-options";

interface SearchOptionListProps {
  title: string;
  kind: "category" | "organization";
  state: SearchOptionState;
  items: SearchOption[];
  onSelect: (option: SearchOption) => void;
  onRetry: () => void;
}

export function SearchOptionList({
  title,
  kind,
  state,
  items,
  onSelect,
  onRetry,
}: SearchOptionListProps) {
  const Icon = kind === "category" ? Tag : Store;
  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {title}
      </h3>
      {state.loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-4 text-sm text-slate-500"
        >
          <Loader2 size={18} className="animate-spin" />
          Ачааллаж байна…
        </p>
      ) : state.error ? (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          Мэдээлэл ачаалж чадсангүй.
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 font-bold underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : items.length === 0 ? (
        <p role="status" className="py-4 text-sm text-slate-500">
          Илэрц олдсонгүй. Өөр үгээр хайна уу.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="group flex w-full items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold">
                  {item.name}
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-slate-400 transition group-hover:translate-x-1"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
