"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  Mail,
  Phone,
} from "lucide-react";
import { SYSTEM_ROLE_META } from "./constants";
import {
  displayEmail,
  displayPhone,
  formatDate,
  isMembershipActive,
  membershipStatusText,
  timeAgo,
} from "./formatters";
import { MembershipMenu } from "./MembershipMenu";
import { RoleMenu } from "./RoleMenu";
import type { SystemUser } from "./types";

type UserCardProps = {
  user: SystemUser;
  onChanged: () => void;
};

export function UserCard({ user, onChanged }: UserCardProps) {
  const meta = SYSTEM_ROLE_META[user.role] ?? SYSTEM_ROLE_META.USER;
  const initial =
    user.fullName?.charAt(0)?.toUpperCase() ||
    user.email.charAt(0).toUpperCase();
  const emailLabel = displayEmail(user.email);
  const phoneLabel = displayPhone(user.phone);
  const activeMember = isMembershipActive(user);

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md">
      <div
        className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
          user.isActive ? "bg-emerald-400" : "bg-slate-300"
        }`}
        title={user.isActive ? "Идэвхтэй" : "Идэвхгүй"}
      />

      <div className="flex items-start gap-3.5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.bg}`}
          >
            <span className={`text-base font-bold ${meta.color}`}>
              {initial}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {user.fullName || "Нэргүй"}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{emailLabel}</span>
          </div>
          {phoneLabel && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{phoneLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="my-3.5 border-t border-slate-100" />

      <div className="flex flex-wrap items-center gap-1.5">
        <RoleMenu user={user} onChanged={onChanged} />
        <MembershipMenu user={user} onChanged={onChanged} />

        {user.emailVerified && (
          <span className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Баталгаажсан
          </span>
        )}
      </div>

      {(user.isPrime || user.membershipExpiresAt) && (
        <div
          className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold ${
            activeMember
              ? "bg-amber-50 text-amber-700"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>{membershipStatusText(user)}</span>
          {user.membershipExpiresAt && (
            <span className="ml-auto text-[10px] opacity-70">
              {formatDate(user.membershipExpiresAt)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end text-[11px] text-slate-400">
        <span className="flex shrink-0 items-center gap-1">
          {user.lastLoginAt ? (
            <>
              <Clock className="h-3 w-3" />
              {timeAgo(user.lastLoginAt)}
            </>
          ) : (
            <>
              <CalendarDays className="h-3 w-3" />
              {formatDate(user.createdAt)}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
