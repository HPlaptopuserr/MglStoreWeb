"use client";

import {
  SEARCH_SCOPES,
  UPCOMING_SCOPES,
  type SearchScope,
} from "./search-model";

export function SearchScopeSelect({
  value,
  onChange,
}: {
  value: SearchScope;
  onChange: (value: SearchScope) => void;
}) {
  return (
    <label className="shrink-0">
      <span className="sr-only">Хайх төрөл</span>
      <select
        value={value}
        onChange={(event) => {
          const scope = SEARCH_SCOPES.find(
            (option) => option.id === event.target.value,
          );
          if (scope) onChange(scope.id);
        }}
        className="max-w-36 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm font-bold text-slate-800 outline-orange-500 sm:p-3"
      >
        {SEARCH_SCOPES.map((scope) => (
          <option key={scope.id} value={scope.id}>
            {scope.label}
          </option>
        ))}
        {UPCOMING_SCOPES.map((label) => (
          <option key={label} disabled>
            {label} — Тун удахгүй
          </option>
        ))}
      </select>
    </label>
  );
}
