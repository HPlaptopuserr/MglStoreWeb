"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  MemberRegistrationCard,
  type AssociationRegistration,
} from "@/components/organisms/association";

const PAYMENT_FILTERS = [
  { value: "", label: "Төлсөн хүсэлтүүд" },
  { value: "PAID", label: "Төлсөн" },
];

export default function AssociationPaymentsPage() {
  const [registrations, setRegistrations] = useState<AssociationRegistration[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminFetch(
        `${API}/admin/association/registrations?limit=300`,
      );
      if (res.ok) {
        const json = await res.json();
        setRegistrations(Array.isArray(json) ? json : (json.data ?? []));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registrations.filter((item) => {
      if (item.paymentAmount <= 0) return false;
      if (paymentFilter && item.paymentStatus !== paymentFilter) return false;
      if (!query) return true;
      return [
        item.lastName,
        item.firstName,
        item.organizationName,
        item.phone,
        item.paymentReference ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [paymentFilter, registrations, search]);

  const paidTotal = filtered
    .filter((item) => item.paymentStatus === "PAID")
    .reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/association"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
            <Banknote size={20} />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Гишүүнчлэлийн төлбөр тооцоо
            </h1>
            <p className="text-xs text-slate-400">
              Холбооны төлбөртэй гишүүнчлэлийн шилжүүлэг бүртгэх
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Төлсөн дүн"
          value={`${paidTotal.toLocaleString()}₮`}
          tone="emerald"
        />
        <SummaryCard
          label="Баталгаажсан хүсэлт"
          value={`${filtered.length.toLocaleString()}`}
          tone="slate"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Нэр, байгууллага, утас, гүйлгээний утга хайх..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
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
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
        >
          {PAYMENT_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <p className="text-sm font-semibold text-slate-400">
            Ачааллаж байна...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Banknote size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-black text-slate-500">
            Төлбөртэй бүртгэл олдсонгүй
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((registration) => (
            <MemberRegistrationCard
              key={registration.id}
              registration={registration}
              onRefresh={() => fetchData(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "slate";
}) {
  const colors =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-2xl border px-5 py-4 ${colors}`}>
      <p className="text-xs font-black uppercase tracking-widest opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
