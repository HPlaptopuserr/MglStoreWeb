import { Coins, Crown, FileText, LogOut, PackageCheck, ShieldCheck } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";
import { resolveApiAssetUrl } from "@/lib/api";
import type { AccountPurchase, ProfileOrder } from "./types";

type ProfileHeroProps = {
  user: AuthUser;
  purchases: AccountPurchase[];
  orders: ProfileOrder[];
  points: number;
  onLogout: () => void;
};

export function ProfileHero({
  user,
  purchases,
  orders,
  points,
  onLogout,
}: ProfileHeroProps) {
  const initials =
    user.fullName?.trim()?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?";
  const hasTerms = Boolean(user.termsAcceptedAt);
  const isPrime = Boolean(user.isPrime);
  const displayName = user.fullName?.trim() || "Хэрэглэгч";
  const contact = user.email || user.phone || "Мэдээллээ бүрэн бөглөнө үү";
  const stats = [
    {
      label: "Худалдан авсан файл",
      value: purchases.length.toLocaleString("mn-MN"),
      icon: FileText,
    },
    {
      label: "M point",
      value: `${points.toLocaleString("mn-MN")} M`,
      icon: Coins,
    },
    {
      label: "Захиалга",
      value: orders.length.toLocaleString("mn-MN"),
      icon: PackageCheck,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white md:px-8 md:py-9">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(59,130,246,0.20),transparent_32%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            {user.avatarUrl ? (
              <img
                src={resolveApiAssetUrl(user.avatarUrl)}
                alt={displayName}
                className="h-20 w-20 shrink-0 rounded-2xl border border-white/15 object-cover shadow-xl"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-3xl font-black ring-1 ring-white/15">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-orange-200">
                MGL account
              </p>
              <h1 className="mt-2 truncate text-3xl font-black leading-tight md:text-4xl">
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
                    Prime user
                  </span>
                )}
              </div>
            </div>
          </div>
          {isPrime && (
            <div className="relative mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50">
              Төсөл, franchise болон төлбөртэй контентуудыг төлбөргүй үзэх эрх идэвхтэй байна.
            </div>
          )}
        </div>

        <div className="grid gap-3 bg-slate-50 p-4 md:grid-cols-3 lg:grid-cols-1">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black leading-none text-slate-950">
                  {stat.value}
                </p>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onLogout}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            <LogOut size={17} />
            Гарах
          </button>
        </div>
      </div>
    </section>
  );
}
