"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, Users, Filter, Loader2, QrCode, X,
  Copy, Check, RefreshCw, SlidersHorizontal,
  ChevronDown, Settings2,
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

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
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
  }, [statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFilterCount = [statusFilter, typeFilter].filter(Boolean).length;
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Нэр, байгууллага, утас хайх..."
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={`relative flex items-center gap-2 bg-white border rounded-xl px-3 transition-colors ${
          statusFilter ? "border-indigo-300 bg-indigo-50" : "border-slate-200"
        }`}>
          <SlidersHorizontal size={14} className={statusFilter ? "text-indigo-500" : "text-slate-400"} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent py-2.5 text-sm font-semibold text-slate-700 outline-none pr-6 appearance-none cursor-pointer"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="text-slate-400 absolute right-3 pointer-events-none" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-[10px] font-black text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>

        {(search || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <X size={14} />Цэвэрлэх
          </button>
        )}
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
          {(search || statusFilter || typeFilter) && (
            <button
              onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
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
