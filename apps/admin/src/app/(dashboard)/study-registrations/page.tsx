"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type StudyRegistration = {
  id: string;
  courseId: string;
  courseTitle: string;
  category: string;
  amount: number;
  originalPrice: number;
  invoiceId?: string | null;
  registeredAt: string;
  registrationKind: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    phoneNumber?: string;
    isPrime?: boolean;
  };
};

type StudyRegistrationStats = {
  total: number;
  paid: number;
  free: number;
  prime: number;
};

const MONEY = new Intl.NumberFormat("mn-MN");

function formatMoney(amount: number) {
  if (!amount) return "Үнэгүй";
  return `₮${MONEY.format(amount)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function registrationBadge(registration: StudyRegistration) {
  if (registration.registrationKind === "PRIME") {
    return {
      label: "Prime эрхээр",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (registration.amount > 0 || registration.invoiceId) {
    return {
      label: "Төлбөртэй",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }
  return {
    label: "Үнэгүй",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

const statCards = [
  {
    key: "total",
    label: "Нийт бүртгэл",
    icon: BookOpenCheck,
    className: "bg-slate-950 text-white",
  },
  {
    key: "paid",
    label: "Төлбөртэй",
    icon: CreditCard,
    className: "bg-orange-50 text-orange-700",
  },
  {
    key: "free",
    label: "Үнэгүй",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "prime",
    label: "Prime хэрэглэгч",
    icon: Sparkles,
    className: "bg-violet-50 text-violet-700",
  },
] as const;

export default function StudyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<StudyRegistration[]>([]);
  const [stats, setStats] = useState<StudyRegistrationStats>({
    total: 0,
    paid: 0,
    free: 0,
    prime: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchRegistrations = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ limit: "300" });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await adminFetch(
          `${API}/admin/study/registrations?${params}`,
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(
            json.message || "Сургалтын бүртгэл авахад алдаа гарлаа",
          );
        }

        setRegistrations(Array.isArray(json.data) ? json.data : []);
        setStats({
          total: Number(json.stats?.total || 0),
          paid: Number(json.stats?.paid || 0),
          free: Number(json.stats?.free || 0),
          prime: Number(json.stats?.prime || 0),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const grouped = useMemo(() => {
    return registrations.reduce<Record<string, StudyRegistration[]>>(
      (acc, item) => {
        const key = item.category || "Сургалт";
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
      },
      {},
    );
  }, [registrations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
              Study registrations
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              Сургалтын бүртгэл
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Төлбөртэй, үнэгүй, Prime эрхээр бүртгүүлсэн хэрэглэгчид нэг дор.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRegistrations(true)}
          disabled={refreshing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`rounded-[22px] border border-slate-200 p-4 shadow-sm ${card.className}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black opacity-80">
                  {card.label}
                </span>
                <Icon size={18} />
              </div>
              <p className="mt-4 text-3xl font-black">
                {stats[card.key].toLocaleString("mn-MN")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Сургалт, нэр, утас, и-мэйлээр хайх"
            className="h-full flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <Loader2 className="animate-spin text-orange-600" size={28} />
        </div>
      ) : registrations.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white text-center">
          <GraduationCap size={42} className="text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-700">
            Одоогоор сургалтын бүртгэл алга.
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Web дээр хэрэглэгч бүртгүүлэх үед энд автоматаар нэмэгдэнэ.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, items]) => (
            <section
              key={category}
              className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                    Ангилал
                  </p>
                  <h2 className="text-xl font-black text-slate-950">
                    {category}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {items.length} бүртгэл
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  <span>Хэрэглэгч</span>
                  <span>Сургалт</span>
                  <span>Төлбөр</span>
                  <span>Огноо</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((registration) => {
                    const badge = registrationBadge(registration);
                    return (
                      <div
                        key={registration.id}
                        className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr] items-center gap-3 px-4 py-4 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <UserRound size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">
                              {registration.user.fullName ||
                                registration.user.email}
                            </p>
                            <p className="truncate text-xs font-semibold text-slate-500">
                              {registration.user.phoneNumber ||
                                registration.user.email}
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-800">
                            {registration.courseTitle}
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-400">
                            #{registration.courseId}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-black text-slate-950">
                            {formatMoney(registration.amount)}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-500">
                          {formatDate(registration.registeredAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
