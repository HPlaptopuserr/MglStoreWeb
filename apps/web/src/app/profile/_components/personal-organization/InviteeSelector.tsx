"use client";

import { Loader2, Search, UserPlus } from "lucide-react";
import type { InviteeUser } from "./types";

type InviteeSelectorProps = {
  query: string;
  users: InviteeUser[];
  selectedUser: InviteeUser | null;
  loading: boolean;
  error: string;
  onQueryChange: (value: string) => void;
  onSelect: (user: InviteeUser) => void;
};

function userTitle(user: InviteeUser) {
  return user.fullName || user.email || user.phone || "Хэрэглэгч";
}

function userSubtitle(user: InviteeUser) {
  return [user.email, user.phone].filter(Boolean).join(" • ");
}

export function InviteeSelector({
  query,
  users,
  selectedUser,
  loading,
  error,
  onQueryChange,
  onSelect,
}: InviteeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="personal-org-invitee"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Имэйл, утас эсвэл нэрээр хайх"
          aria-describedby="personal-org-invitee-helper"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </div>

      {selectedUser ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            {userTitle(selectedUser)}
          </p>
          <p className="text-xs text-emerald-700">
            {userSubtitle(selectedUser) || "Сонгосон хэрэглэгч"}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Хэрэглэгч хайж байна...
        </div>
      ) : null}

      {!loading && query.trim().length >= 3 && users.length === 0 && !selectedUser ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Тохирох хэрэглэгч олдсонгүй.
        </div>
      ) : null}

      {!loading && users.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-orange-50 focus:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {userTitle(user).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {userTitle(user)}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {userSubtitle(user) || "Имэйл/утас бүртгэлгүй"}
                </span>
              </span>
              <UserPlus className="h-4 w-4 text-orange-500" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
