"use client";

import { ChevronDown, Filter, Search } from "lucide-react";
import { SYSTEM_ROLE_META } from "./constants";
import type { UsersStatusFilter } from "./types";

type UsersFiltersProps = {
  search: string;
  roleFilter: string;
  statusFilter: UsersStatusFilter;
  totalUsers: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: UsersStatusFilter) => void;
  onClearFilters: () => void;
};

export function UsersFilters({
  search,
  roleFilter,
  statusFilter,
  totalUsers,
  hasActiveFilters,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClearFilters,
}: UsersFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Нэр, имэйл, утас хайх..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition-shadow focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <div className="relative">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <select
          value={roleFilter}
          onChange={(event) => onRoleChange(event.target.value)}
          className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 transition-shadow focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
        >
          <option value="">Бүх төрөл</option>
          {Object.entries(SYSTEM_ROLE_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>

      <div className="relative">
        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusChange(event.target.value as UsersStatusFilter)
          }
          className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 transition-shadow focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
        >
          <option value="">Бүх статус</option>
          <option value="active">Идэвхтэй</option>
          <option value="inactive">Идэвхгүй</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <p className="text-xs font-medium text-slate-400">
          {totalUsers} хэрэглэгч {hasActiveFilters ? "(шүүсэн)" : ""}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Цэвэрлэх
          </button>
        )}
      </div>
    </div>
  );
}
