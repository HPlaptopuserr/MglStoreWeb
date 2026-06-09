"use client";

import { useState } from "react";
import { Coins, Crown, FileText, PackageCheck, ShieldCheck } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";
import { resolveApiAssetUrl } from "@/lib/api";
import type { AccountPurchase, ProfileOrder } from "./types";

type ProfileHeroProps = {
  user: AuthUser;
  purchases: AccountPurchase[];
  orders: ProfileOrder[];
  points: number;
};

export function ProfileHero({
  user,
  purchases,
  orders,
  points,
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
  const stats = [
    {
      label: "Гишүүнчлэл",
      value: isPrime ? "Member" : "Идэвхгүй",
      icon: Crown,
      tone: isPrime ? "member" : "default",
      helper: isPrime && membershipPhone ? `${membershipPhone} дугаартай` : undefined,
    },
    {
      label: "Худалдан авсан файл",
      value: purchases.length.toLocaleString("mn-MN"),
      icon: FileText,
      tone: "default",
    },
    {
      label: "M point",
      value: `${points.toLocaleString("mn-MN")} M`,
      icon: Coins,
      tone: "default",
    },
    {
      label: "Захиалга",
      value: orders.length.toLocaleString("mn-MN"),
      icon: PackageCheck,
      tone: "default",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white md:px-8 md:py-7">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(59,130,246,0.20),transparent_32%)]" />
          <div className="relative flex items-center gap-4">
            <ProfileAvatar
              avatarUrl={user.avatarUrl}
              displayName={displayName}
              initials={initials}
            />

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-orange-200">
                MGL account
              </p>
              <h1 className="mt-1.5 truncate text-2xl font-black leading-tight md:mt-2 md:text-4xl">
                {displayName}
              </h1>
              <p className="mt-1.5 truncate text-sm font-semibold text-white/62">
                {contact}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/10">
                  <ShieldCheck size={14} />
                  {hasTerms ? "Нөхцөл зөвшөөрсөн" : "Нөхцөл хүлээгдэж байна"}
                </span>
                <span className="inline-flex rounded-full bg-orange-400/16 px-3 py-1.5 text-xs font-black text-orange-100 ring-1 ring-orange-200/20">
                  {user.role === "USER" ? "Хэрэглэгч" : user.role}
                </span>
                {isPrime && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/18 px-3 py-1.5 text-xs font-black text-amber-100 ring-1 ring-amber-200/25">
                    <Crown size={14} />
                    Member
                  </span>
                )}
              </div>
            </div>
          </div>
          {isPrime && (
            <div className="relative mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs font-black leading-5 text-amber-50 sm:inline-flex sm:rounded-full sm:py-1.5">
              Membership таних тэмдэг идэвхтэй. Утасны дугаараараа хөнгөлөлт эдлэх боломжтой.
            </div>
          )}
        </div>

        <div className="grid gap-2 bg-slate-50 p-3 sm:grid-cols-2 md:gap-3 md:p-4 lg:grid-cols-1">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isMemberStat = stat.tone === "member";
            return (
              <div
                key={stat.label}
                className={`rounded-2xl border px-3 py-3 shadow-sm md:px-4 ${
                  isMemberStat
                    ? "border-emerald-100 bg-emerald-50/80"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 sm:justify-between md:gap-3">
                  <span className="min-w-0 text-[11px] font-black uppercase tracking-wide text-slate-500 md:text-xs">
                    {stat.label}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:h-9 md:w-9 ${
                      isMemberStat
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                </div>
                <p className="mt-2 text-xl font-black leading-none text-slate-950 md:text-2xl">
                  {stat.value}
                </p>
                {stat.helper && (
                  <p className="mt-1 truncate text-xs font-bold text-emerald-700">
                    {stat.helper}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
        className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 object-cover shadow-xl sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-2xl font-black ring-1 ring-white/15 sm:h-20 sm:w-20 sm:text-3xl">
      {initials}
    </div>
  );
}
