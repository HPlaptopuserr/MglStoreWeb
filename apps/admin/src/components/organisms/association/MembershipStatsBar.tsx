"use client";

import { Users, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface Props {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function MembershipStatsBar({ total, pending, approved, rejected }: Props) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const cards = [
    {
      label: "Нийт бүртгэл",
      value: total,
      sub: "Нийт ирсэн",
      icon: Users,
      gradient: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
      text: "text-indigo-700",
      bar: null,
    },
    {
      label: "Хүлээгдэж буй",
      value: pending,
      sub: `${pct(pending)}% нийтийн`,
      icon: Clock,
      gradient: "from-amber-400 to-amber-500",
      bg: "bg-amber-50 border-amber-100",
      text: "text-amber-700",
      bar: { pct: pct(pending), color: "bg-amber-400" },
    },
    {
      label: "Зөвшөөрөгдсөн",
      value: approved,
      sub: `${pct(approved)}% нийтийн`,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
      text: "text-emerald-700",
      bar: { pct: pct(approved), color: "bg-emerald-500" },
    },
    {
      label: "Татгалзсан",
      value: rejected,
      sub: `${pct(rejected)}% нийтийн`,
      icon: XCircle,
      gradient: "from-red-400 to-red-500",
      bg: "bg-red-50 border-red-100",
      text: "text-red-700",
      bar: { pct: pct(rejected), color: "bg-red-400" },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`relative rounded-2xl border p-4 overflow-hidden ${c.bg}`}>
          {/* subtle gradient orb */}
          <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${c.gradient} opacity-10`} />

          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm`}>
              <c.icon size={16} className="text-white" />
            </div>
            {c.value > 0 && c.label !== "Нийт бүртгэл" && (
              <span className={`text-[10px] font-bold ${c.text} flex items-center gap-0.5`}>
                <TrendingUp size={10} />{pct(c.value)}%
              </span>
            )}
          </div>

          <p className={`text-3xl font-black ${c.text} leading-none`}>{c.value}</p>
          <p className={`text-[11px] font-semibold mt-1 ${c.text} opacity-70`}>{c.label}</p>

          {c.bar && (
            <div className="mt-3 h-1 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${c.bar.color}`}
                style={{ width: `${c.bar.pct}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
