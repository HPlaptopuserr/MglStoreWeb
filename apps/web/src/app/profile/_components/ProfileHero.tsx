"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Coins,
  Crown,
  Gem,
  Sparkles,
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
  const expiryLabel = user.membership?.expiresAt
    ? new Date(user.membership.expiresAt).toLocaleDateString("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  return (
    <section
      className={`relative overflow-hidden rounded-[22px] px-4 py-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] sm:px-7 md:px-8 md:py-9 md:shadow-[0_26px_80px_rgba(15,23,42,0.22)] ${
        isPrime
          ? "bg-[#121315] ring-1 ring-amber-200/35"
          : "bg-slate-950"
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isPrime
            ? "bg-[linear-gradient(135deg,#090d17_0%,#17191d_48%,#3b2c18_100%)]"
            : "bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.88)_46%,rgba(67,50,65,0.92)_100%)]"
        }`}
      />
      {isPrime && (
        <>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(251,191,36,0.22),transparent_34%),linear-gradient(120deg,transparent,rgba(251,191,36,0.08))]" />
          <div className="absolute bottom-0 left-0 h-20 w-full bg-[linear-gradient(0deg,rgba(251,191,36,0.10),transparent)]" />
        </>
      )}

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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1.5 text-[11px] font-black text-amber-50 ring-1 ring-amber-200/40 shadow-[0_0_26px_rgba(251,191,36,0.14)] sm:text-xs">
                  <Crown size={14} />
                  {membershipTierLabel}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto] md:mt-5">
              <div className="flex min-w-0 items-center gap-3 rounded-[18px] border border-amber-200/25 bg-amber-300/12 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-white/5 backdrop-blur">
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

            {isPrime ? (
              <div className="mt-4 grid gap-2 sm:max-w-2xl sm:grid-cols-3 md:mt-5">
                <MemberBenefit icon={<Gem size={16} />} label="Member үнэ" value="Нээгдсэн" />
                <MemberBenefit icon={<BadgeCheck size={16} />} label="Хөнгөлөлт" value={membershipPhone || "Идэвхтэй"} />
                <MemberBenefit icon={<Sparkles size={16} />} label="Дуусах" value={expiryLabel || "Хугацаагүй"} />
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {accountSwitcher ? (
          <div className="min-w-0 w-full lg:justify-self-end">{accountSwitcher}</div>
        ) : (
          <MembershipHint isPrime={isPrime} membershipPhone={membershipPhone} />
        )}
      </div>

      {isPrime && (
        <div className="relative mt-6 grid gap-3 rounded-[18px] border border-amber-200/30 bg-black/18 p-3 text-amber-50 ring-1 ring-white/5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
            <Crown size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">Таны Membership бүрэн идэвхтэй</p>
            <p className="mt-0.5 text-xs font-bold text-amber-100/70">
              Member үнэ, файл access, сургалт болон M Point давуу эрхүүд нээгдсэн.
            </p>
          </div>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-amber-200/40 bg-amber-200/12 px-4 text-xs font-black text-amber-50 transition hover:bg-amber-300 hover:text-slate-950"
          >
            Эрхээ удирдах
          </button>
        </div>
      )}
    </section>
  );
}

function MemberBenefit({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-amber-200/25 bg-white/[0.08] px-3 py-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.12)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-300/18 text-amber-100">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/55">
          {label}
        </p>
        <p className="truncate text-xs font-black text-white">{value}</p>
      </div>
    </div>
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
      <Crown className="mb-3 text-amber-200" size={28} />
      <p className="-mt-2">
        {isPrime
          ? "Та MGL Store Member эрхтэй. Хөнгөлөлт, access, point давуу эрхүүд таны account дээр нээгдсэн."
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
