"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Search, Users, Loader2, QrCode, X,
  Copy, Check, RefreshCw, SlidersHorizontal,
  ChevronDown, Settings2, Banknote, CalendarDays,
  ArrowUpDown,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  MemberRegistrationCard,
  MembershipStatsBar,
  MembershipTypeBadge,
  MEMBERSHIP_TYPES,
  type AssociationRegistration,
  type MembershipTypeKey,
} from "@/components/organisms/association";

const STATUS_FILTERS = [
  { value: "", label: "Бүгд" },
  { value: "PENDING", label: "Хүлээгдэж буй" },
  { value: "APPROVED", label: "Зөвшөөрөгдсөн" },
  { value: "REJECTED", label: "Татгалзсан" },
];

const PAYMENT_STATUS_FILTERS = [
  { value: "", label: "Бүх төлбөр" },
  { value: "PENDING", label: "Төлбөр хүлээгдэж буй" },
  { value: "PAID", label: "Төлсөн" },
  { value: "FAILED", label: "Амжилтгүй" },
  { value: "REFUNDED", label: "Буцаагдсан" },
  { value: "CANCELLED", label: "Цуцлагдсан" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Шинэ эхэнд" },
  { value: "oldest", label: "Хуучин эхэнд" },
  { value: "amountDesc", label: "Дүн ихээс" },
  { value: "amountAsc", label: "Дүн багаас" },
];

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

function FilterSelect({
  value,
  onChange,
  options,
  icon,
  active,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`relative flex min-w-0 items-center gap-2 rounded-xl border px-3 transition-colors ${
        active ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <span className={active ? "text-indigo-500" : "text-slate-400"}>{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent py-2.5 pr-7 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 text-slate-400" />
    </div>
  );
}

export default function AssociationPage() {
  const [registrations, setRegistrations] = useState<AssociationRegistration[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<MembershipTypeKey | "">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const registrationUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000/association"
      : "https://mglstore.mn/association";

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("membershipType", typeFilter);
      if (paymentStatusFilter) params.set("paymentStatus", paymentStatusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (sort !== "newest") params.set("sort", sort);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("limit", "200");

      const [listRes, statsRes] = await Promise.all([
        adminFetch(`${API}/admin/association/registrations?${params}`),
        adminFetch(`${API}/admin/association/stats`),
      ]);

      if (listRes.ok) {
        const json = await listRes.json();
        setRegistrations(Array.isArray(json) ? json : json.data ?? []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          total: s.total ?? 0,
          pending: s.pending ?? 0,
          approved: s.approved ?? 0,
          rejected: (s.total ?? 0) - (s.pending ?? 0) - (s.approved ?? 0),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter, paymentStatusFilter, dateFrom, dateTo, sort, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setPaymentStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  }, []);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (debouncedSearch) filters.push(`Хайлт: ${debouncedSearch}`);
    if (statusFilter) {
      filters.push(STATUS_FILTERS.find((item) => item.value === statusFilter)?.label ?? statusFilter);
    }
    if (typeFilter) filters.push(MEMBERSHIP_TYPES[typeFilter].label);
    if (paymentStatusFilter) {
      filters.push(
        PAYMENT_STATUS_FILTERS.find((item) => item.value === paymentStatusFilter)?.label ??
          paymentStatusFilter,
      );
    }
    if (dateFrom || dateTo) filters.push(`${dateFrom || "эхлэл"} - ${dateTo || "өнөөдөр"}`);
    if (sort !== "newest") filters.push(SORT_OPTIONS.find((item) => item.value === sort)?.label ?? sort);
    return filters;
  }, [debouncedSearch, statusFilter, typeFilter, paymentStatusFilter, dateFrom, dateTo, sort]);

  const hasActiveFilters =
    Boolean(search || statusFilter || typeFilter || paymentStatusFilter || dateFrom || dateTo || sort !== "newest");
  const activeFilterCount = activeFilters.length;
  const pendingList = registrations.filter((r) => r.status === "PENDING");
  const otherList = registrations.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Холбооны гишүүнчлэл</h1>
            <p className="text-xs text-slate-400 mt-0.5">Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн нэгдсэн холбоо</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/association/payments"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Banknote size={15} />Төлбөр
          </Link>
          <Link
            href="/association/settings"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Settings2 size={15} />Тохиргоо
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowQr((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              showQr
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            <QrCode size={16} />QR / Линк
          </button>
        </div>
      </div>

      {/* ── QR / link panel ─────────────────────────────────── */}
      {showQr && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Бүртгүүлэх линк</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 break-all">
                  {registrationUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    copied
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Энэ линкийг QR код болгон хэвлэж, танхим болон социал хуудаст байршуулна уу.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center gap-2 sm:w-36">
              <QrCode size={56} className="text-indigo-500" />
              <p className="text-[11px] font-semibold text-indigo-600 text-center">QR хэвлэх</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────── */}
      <MembershipStatsBar
        total={stats.total}
        pending={stats.pending}
        approved={stats.approved}
        rejected={stats.rejected}
      />

      {/* ── Membership type chips ────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-400">Төрлөөр:</span>
        <button
          onClick={() => setTypeFilter("")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            typeFilter === ""
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          Бүгд
        </button>
        {(Object.keys(MEMBERSHIP_TYPES) as MembershipTypeKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTypeFilter(typeFilter === key ? "" : key)}
            className={`transition-all ${typeFilter === key ? "ring-2 ring-offset-1 ring-indigo-400 scale-105" : ""}`}
          >
            <MembershipTypeBadge type={key} size="md" />
          </button>
        ))}
      </div>

      {/* ── Search & filter bar ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_180px_210px_180px]">
          <div className="relative min-w-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, байгууллага, үйл ажиллагаа, утас хайх..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Хайлтыг цэвэрлэх"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS}
            icon={<SlidersHorizontal size={14} />}
            active={Boolean(statusFilter)}
          />
          <FilterSelect
            value={paymentStatusFilter}
            onChange={setPaymentStatusFilter}
            options={PAYMENT_STATUS_FILTERS}
            icon={<Banknote size={14} />}
            active={Boolean(paymentStatusFilter)}
          />
          <FilterSelect
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            icon={<ArrowUpDown size={14} />}
            active={sort !== "newest"}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto] xl:grid-cols-[180px_180px_auto]">
          <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10">
            <CalendarDays size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-semibold text-slate-700 outline-none"
              aria-label="Эхлэх огноо"
            />
          </label>
          <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10">
            <CalendarDays size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-semibold text-slate-700 outline-none"
              aria-label="Дуусах огноо"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700"
              >
                {filter}
              </span>
            ))}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={14} />Цэвэрлэх
              </button>
            )}
            {activeFilterCount > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 px-2 text-[11px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-sm text-slate-400 font-semibold">Ачааллаж байна...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-base font-black text-slate-500">Бүртгэл олдсонгүй</p>
          <p className="text-sm text-slate-400 mt-1">Шүүлтүүрийг өөрчилж дахин хайна уу</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <X size={14} />Бүх шүүлтүүр арилгах
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending group */}
          {pendingList.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                  Хүлээгдэж буй
                </span>
                <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  {pendingList.length}
                </span>
              </div>
              <div className="space-y-2">
                {pendingList.map((reg) => (
                  <MemberRegistrationCard key={reg.id} registration={reg} onRefresh={() => fetchData(true)} />
                ))}
              </div>
            </div>
          )}

          {/* Other group */}
          {otherList.length > 0 && (
            <div>
              {pendingList.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Шийдвэрлэгдсэн
                  </span>
                  <span className="text-xs text-slate-400">{otherList.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {otherList.map((reg) => (
                  <MemberRegistrationCard key={reg.id} registration={reg} onRefresh={() => fetchData(true)} />
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 py-2">
            Нийт <span className="font-bold">{registrations.length}</span> бүртгэл харагдаж байна
          </p>
        </div>
      )}
    </div>
  );
}
