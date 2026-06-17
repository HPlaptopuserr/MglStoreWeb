"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Coins, Crown, Phone, ShieldCheck, Upload } from "lucide-react";
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
  const expiresAt = user.membership?.expiresAt
    ? new Date(user.membership.expiresAt)
    : null;
  const expiryDays =
    expiresAt && !Number.isNaN(expiresAt.getTime())
      ? Math.max(
          0,
          Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;

  return (
    <section
      className={`relative overflow-hidden rounded-[24px] px-4 py-4 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)] sm:px-6 sm:py-6 md:px-8 md:py-8 md:shadow-[0_26px_80px_rgba(15,23,42,0.20)] ${
        isPrime ? "bg-[#121315] ring-1 ring-amber-200/35" : "bg-slate-950"
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isPrime
            ? "bg-[linear-gradient(135deg,#090d17_0%,#17191d_54%,#3b2c18_100%)]"
            : "bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.88)_48%,rgba(67,50,65,0.92)_100%)]"
        }`}
      />
      {isPrime && (
        <>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_88%_14%,rgba(251,191,36,0.20),transparent_28%),linear-gradient(120deg,transparent,rgba(251,191,36,0.08))] md:w-1/2" />
          <div className="absolute bottom-0 left-0 h-20 w-full bg-[linear-gradient(0deg,rgba(251,191,36,0.10),transparent)]" />
        </>
      )}

      <div className="relative grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-4 md:space-y-5">
          <div className="flex min-w-0 items-start gap-3 sm:gap-5">
            <ProfileAvatar
              avatarUrl={user.avatarUrl}
              displayName={displayName}
              expiryDays={expiryDays}
              initials={initials}
              isPrime={isPrime}
            />

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-100 ring-1 ring-white/10 sm:px-4 sm:py-1.5 sm:text-[10px]">
                MGL account
              </p>
              <h1 className="mt-2 break-words text-[28px] font-black leading-[1.03] tracking-tight text-white sm:mt-3 sm:text-4xl md:text-5xl">
                {displayName}
              </h1>
              <p className="mt-2 flex max-w-full items-center gap-2 text-sm font-semibold leading-5 text-white/68 md:mt-3">
                <Phone size={15} className="shrink-0 text-white/45" />
                <span className="min-w-0 break-all sm:truncate">{contact}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">
              <ShieldCheck size={14} className="shrink-0 text-white/70" />
              <span className="truncate">
                {hasTerms ? "Нөхцөл зөвшөөрсөн" : "Нөхцөл хүлээгдэж байна"}
              </span>
            </span>
            <span className="inline-flex rounded-full bg-orange-400/16 px-3 py-2 text-xs font-black text-orange-100 ring-1 ring-orange-200/20">
              {user.role === "USER" ? "Хэрэглэгч" : user.role}
            </span>
            {isPrime && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/18 px-3 py-2 text-xs font-black text-amber-50 ring-1 ring-amber-200/35 shadow-[0_0_26px_rgba(251,191,36,0.12)]">
                <Crown size={14} className="shrink-0" />
                <span className="truncate">{membershipTierLabel}</span>
              </span>
            )}
          </div>

          {!isPrime && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-sm font-black text-slate-900 shadow-lg shadow-black/20 transition hover:bg-orange-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/45 active:scale-[0.99] sm:w-auto sm:px-7"
            >
              <Upload size={17} />
              Гишүүнчлэл upgrade
            </button>
          )}
        </div>

        <div className="grid min-w-0 gap-3 md:gap-4">
          <MPointCard points={points} />
          <div className="min-w-0">
            {accountSwitcher ? (
              accountSwitcher
            ) : !isPrime ? (
              <MembershipHint />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MPointCard({ points }: { points: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/20 bg-white/[0.08] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.14)] ring-1 ring-white/10 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_70%_45%,rgba(251,191,36,0.22),transparent_60%)]" />
      <div className="relative flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-100/70">
          <Coins size={19} strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/68">
            M Point
          </p>
          <p className="mt-1 truncate text-3xl font-black leading-none text-white">
            {points.toLocaleString("mn-MN")} M
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-amber-200/12 px-2.5 py-1 text-[10px] font-black text-amber-100/70 ring-1 ring-amber-100/15 sm:inline-flex">
          Balance
        </span>
      </div>
    </div>
  );
}

function MembershipHint() {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 text-sm font-bold leading-6 text-white/68 shadow-2xl shadow-black/10 backdrop-blur">
      <Crown className="mb-2 text-amber-200" size={24} />
      <p>
        Membership идэвхжүүлснээр файл, сургалт болон хөнгөлөлтийн боломжууд нэг
        дор нээгдэнэ.
      </p>
    </div>
  );
}

function ProfileAvatar({
  avatarUrl,
  displayName,
  expiryDays,
  initials,
  isPrime,
}: {
  avatarUrl?: string | null;
  displayName: string;
  expiryDays: number | null;
  initials: string;
  isPrime: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = avatarUrl && !failed ? resolveApiAssetUrl(avatarUrl) : "";
  const frameClass = isPrime
    ? "border-amber-200/55 ring-2 ring-amber-300/45 shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_24px_55px_rgba(0,0,0,0.32),0_0_34px_rgba(251,191,36,0.20)]"
    : "border-white/15 ring-1 ring-white/15 shadow-xl";
  const sizeClass =
    "h-20 w-20 rounded-[22px] sm:h-28 sm:w-28 sm:rounded-[26px] md:h-32 md:w-32";
  const expiryLabel = expiryDays === 0 ? "Өнөөдөр" : `${expiryDays} хоног`;

  const expiryBadge =
    isPrime && expiryDays !== null ? (
      <span className="absolute -right-2 -top-2 z-10 rounded-full border border-amber-200/60 bg-slate-950/92 px-2.5 py-1 text-[9px] font-black leading-none text-amber-100 shadow-lg shadow-black/25 ring-1 ring-white/10 backdrop-blur sm:-right-3 sm:-top-3 sm:px-3 sm:py-1.5 sm:text-[10px]">
        {expiryLabel}
      </span>
    ) : null;

  if (src) {
    return (
      <div className={`relative shrink-0 ${sizeClass}`}>
        {expiryBadge}
        <img
          src={src}
          alt={displayName}
          onError={() => setFailed(true)}
          className={`h-full w-full rounded-[inherit] border object-cover ${frameClass}`}
        />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      {expiryBadge}
      <div
        className={`flex h-full w-full items-center justify-center rounded-[inherit] border bg-white/12 text-4xl font-black sm:text-6xl ${frameClass}`}
      >
        {initials}
      </div>
    </div>
  );
}
