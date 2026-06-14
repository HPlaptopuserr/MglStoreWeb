"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Coins,
  Crown,
  Phone,
  ShieldCheck,
  TrendingUp,
  Upload,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";
import { resolveApiAssetUrl } from "@/lib/api";

type ProfileHeroProps = {
  accountSwitcher?: ReactNode;
  user: AuthUser;
  membershipTierLabel: string;
  onUpgradeClick: () => void;
  points: number;
};

export function ProfileHero({
  accountSwitcher,
  membershipTierLabel,
  onUpgradeClick,
  points,
  user,
}: ProfileHeroProps) {
  const initials =
    user.fullName?.trim()?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?";
  const hasTerms = Boolean(user.termsAcceptedAt);
  const isPrime = Boolean(user.membership?.active || user.isPrime);
  const displayName = user.fullName?.trim() || "Хэрэглэгч";
  const contact = user.email || user.phone || "Мэдээллээ бүрэн бөглөнө үү";
  const membershipPhone = user.membership?.discountPhone || user.phone || "";

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-slate-950 px-4 py-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] sm:px-7 md:px-8 md:py-9 md:shadow-[0_26px_80px_rgba(15,23,42,0.22)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.88)_46%,rgba(67,50,65,0.92)_100%)]" />
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-orange-500/12 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-32 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <ProfileAvatar
            avatarUrl={user.avatarUrl}
            displayName={displayName}
            initials={initials}
          />

          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-orange-200 ring-1 ring-white/10 sm:px-4 sm:text-[10px]">
              MGL account
            </p>
            <h1 className="mt-3 truncate text-2xl font-black leading-tight tracking-tight sm:text-3xl md:mt-4 md:text-5xl">
              {displayName}
            </h1>
            <p className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-sm font-semibold text-white/62 md:mt-3">
              <Phone size={15} className="shrink-0" />
              {contact}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white ring-1 ring-white/10 sm:text-xs">
                <ShieldCheck size={14} />
                <span className="truncate">
                  {hasTerms ? "Нөхцөл зөвшөөрсөн" : "Нөхцөл хүлээгдэж байна"}
                </span>
              </span>
              <span className="inline-flex rounded-full bg-orange-400/16 px-3 py-1.5 text-[11px] font-black text-orange-100 ring-1 ring-orange-200/20 sm:text-xs">
                {user.role === "USER" ? "Хэрэглэгч" : user.role}
              </span>
              {isPrime && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/18 px-3 py-1.5 text-[11px] font-black text-amber-100 ring-1 ring-amber-200/25 sm:text-xs">
                  <Crown size={14} />
                  {membershipTierLabel}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto] md:mt-5">
              <div className="flex min-w-0 items-center gap-3 rounded-[18px] border border-amber-200/20 bg-amber-300/12 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-white/5 backdrop-blur">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
                  <Coins size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/70">
                    M Point
                  </p>
                  <p className="mt-1 truncate text-2xl font-black leading-none text-white">
                    {points.toLocaleString("mn-MN")} M
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-bold leading-5 text-white/70 sm:max-w-[190px]">
                <TrendingUp size={17} className="shrink-0 text-amber-200" />
                Худалдан авалтаас point цуглуулна
              </div>
            </div>

            <div className="mt-4 md:mt-5">
              <button
                type="button"
                onClick={onUpgradeClick}
                className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-sm font-black text-slate-900 shadow-lg shadow-black/20 transition hover:bg-orange-500 hover:text-white sm:w-auto sm:px-7"
              >
                <Upload size={17} />
                Гишүүнчлэл upgrade
              </button>
            </div>
          </div>
        </div>

        {accountSwitcher ? (
          <div className="min-w-0 w-full lg:justify-self-end">{accountSwitcher}</div>
        ) : (
          <MembershipHint isPrime={isPrime} membershipPhone={membershipPhone} />
        )}
      </div>

      {isPrime && !accountSwitcher && (
        <div className="relative mt-6 hidden rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-xs font-black leading-5 text-amber-50 sm:inline-flex sm:rounded-full sm:py-2">
          Membership таних тэмдэг идэвхтэй. Утасны дугаараараа хөнгөлөлт эдлэх
          боломжтой.
        </div>
      )}
    </section>
  );
}

function MembershipHint({
  isPrime,
  membershipPhone,
}: {
  isPrime: boolean;
  membershipPhone: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/10 p-5 text-sm font-bold leading-6 text-white/68 shadow-2xl shadow-black/10 backdrop-blur sm:block">
      <span className="text-5xl font-black leading-none text-orange-400/60">
        ”
      </span>
      <p className="-mt-2">
        {isPrime
          ? "Membership таних тэмдэг идэвхтэй. Утасны дугаараараа хөнгөлөлт эдлэх боломжтой."
          : "Membership идэвхжүүлснээр файл, сургалт болон хөнгөлөлтийн боломжууд нэг дор нээгдэнэ."}
      </p>
      {isPrime && membershipPhone && (
        <p className="mt-3 text-xs font-black text-orange-100">
          {membershipPhone}
        </p>
      )}
    </div>
  );
}

function ProfileAvatar({
  avatarUrl,
  displayName,
  initials,
}: {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = avatarUrl && !failed ? resolveApiAssetUrl(avatarUrl) : "";

  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        onError={() => setFailed(true)}
        className="h-20 w-20 shrink-0 rounded-[22px] border border-white/15 object-cover shadow-xl sm:h-32 sm:w-32 sm:rounded-[26px]"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] bg-white/12 text-4xl font-black ring-1 ring-white/15 sm:h-32 sm:w-32 sm:rounded-[26px] sm:text-6xl">
      {initials}
    </div>
  );
}
