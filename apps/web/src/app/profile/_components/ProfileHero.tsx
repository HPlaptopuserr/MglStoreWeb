import { Coins, FileText, LogOut, PackageCheck, ShieldCheck } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";
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

  return (
    <section className="overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
      <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,111,0,0.35),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(14,165,233,0.20),transparent_34%)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || "Profile"}
              className="h-24 w-24 shrink-0 rounded-3xl border border-white/20 object-cover shadow-xl"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/12 text-4xl font-black ring-1 ring-white/15">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">
              Миний MGL account
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
              {user.fullName?.trim() || "Хэрэглэгч"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-white/60">
              {user.email || user.phone || "Мэдээллээ бүрэн бөглөнө үү"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/10">
                <ShieldCheck size={14} />
                {hasTerms ? "Нөхцөл зөвшөөрсөн" : "Нөхцөл хүлээгдэж байна"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/15 px-3 py-1.5 text-xs font-black text-orange-100 ring-1 ring-orange-200/20">
                {user.role === "USER" ? "Хэрэглэгч" : user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-200" />
              <span className="text-sm font-bold text-white/65">
                Худалдан авсан файл
              </span>
            </div>
            <p className="mt-3 text-2xl font-black">{purchases.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-orange-200" />
              <span className="text-sm font-bold text-white/65">M point</span>
            </div>
            <p className="mt-3 text-2xl font-black">
              {points.toLocaleString("mn-MN")} M
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-orange-200" />
              <span className="text-sm font-bold text-white/65">Захиалга</span>
            </div>
            <p className="mt-3 text-2xl font-black">{orders.length}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black text-slate-950 transition hover:bg-orange-50"
          >
            <LogOut size={17} />
            Гарах
          </button>
        </div>
      </div>
    </section>
  );
}
