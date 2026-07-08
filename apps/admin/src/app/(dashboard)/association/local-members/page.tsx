"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MapPinned,
  RefreshCw,
  Search,
  Users2,
  X,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  MemberRegistrationCard,
  type AssociationRegistration,
} from "@/components/organisms/association";

const LOCAL_AREAS = [
  { name: "Архангай", keywords: ["архангай"] },
  { name: "Баян-Өлгий", keywords: ["баян-өлгий", "баян өлгий"] },
  { name: "Баянхонгор", keywords: ["баянхонгор"] },
  { name: "Булган", keywords: ["булган"] },
  { name: "Говь-Алтай", keywords: ["говь-алтай", "говь алтай"] },
  { name: "Говьсүмбэр", keywords: ["говьсүмбэр"] },
  { name: "Дархан-Уул", keywords: ["дархан-уул", "дархан уул"] },
  { name: "Дорноговь", keywords: ["дорноговь"] },
  { name: "Дорнод", keywords: ["дорнод"] },
  { name: "Дундговь", keywords: ["дундговь"] },
  { name: "Завхан", keywords: ["завхан"] },
  { name: "Орхон", keywords: ["орхон", "эрдэнэт"] },
  { name: "Өвөрхангай", keywords: ["өвөрхангай"] },
  { name: "Өмнөговь", keywords: ["өмнөговь"] },
  { name: "Сүхбаатар", keywords: ["сүхбаатар аймаг"] },
  { name: "Сэлэнгэ", keywords: ["сэлэнгэ"] },
  { name: "Төв", keywords: ["төв аймаг"] },
  { name: "Увс", keywords: ["увс"] },
  { name: "Ховд", keywords: ["ховд"] },
  { name: "Хөвсгөл", keywords: ["хөвсгөл"] },
  { name: "Хэнтий", keywords: ["хэнтий"] },
] as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function detectLocalArea(address: string) {
  const normalized = normalizeText(address);
  return (
    LOCAL_AREAS.find((area) =>
      area.keywords.some((keyword) => normalized.includes(keyword)),
    )?.name ?? "Бусад орон нутаг"
  );
}

export default function AssociationLocalMembersPage() {
  const [members, setMembers] = useState<AssociationRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchMembers = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          residency: "LOCAL",
          limit: "500",
          sort: "newest",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const response = await adminFetch(
          `${API}/admin/association/registrations?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Орон нутгийн гишүүдийг авахад алдаа гарлаа");
        }

        const json = await response.json();
        setMembers(Array.isArray(json) ? json : (json.data ?? []));
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Орон нутгийн гишүүдийг авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const enrichedMembers = useMemo(
    () =>
      members.map((member) => ({
        member,
        area: detectLocalArea(member.address),
      })),
    [members],
  );

  const areaOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of enrichedMembers) {
      counts.set(item.area, (counts.get(item.area) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [enrichedMembers]);

  const filteredMembers = useMemo(
    () =>
      areaFilter
        ? enrichedMembers.filter((item) => item.area === areaFilter)
        : enrichedMembers,
    [areaFilter, enrichedMembers],
  );

  const paidCount = filteredMembers.filter(
    ({ member }) => member.paymentStatus === "PAID",
  ).length;
  const approvedCount = filteredMembers.filter(
    ({ member }) => member.status === "APPROVED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/association"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Холбооны гишүүнчлэл рүү буцах"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-100">
            <MapPinned size={20} />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Орон нутгийн гишүүд
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              Орон нутагт оршин суугаа холбооны гишүүдийн мэдээлэл
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchMembers(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Шинэчлэх
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Нийт гишүүн" value={filteredMembers.length} />
        <SummaryCard label="Зөвшөөрөгдсөн" value={approvedCount} />
        <SummaryCard label="Төлсөн" value={paidCount} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_240px]">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Нэр, байгууллага, утас, хаяг хайх..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              aria-label="Орон нутгийн гишүүд хайх"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label="Хайлтыг цэвэрлэх"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            aria-label="Аймаг сонгох"
          >
            <option value="">Бүх орон нутаг</option>
            {areaOptions.map(([area, count]) => (
              <option key={area} value={area}>
                {area} · {count}
              </option>
            ))}
          </select>
        </div>

        {areaOptions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {areaOptions.slice(0, 8).map(([area, count]) => (
              <button
                key={area}
                type="button"
                onClick={() =>
                  setAreaFilter((current) => (current === area ? "" : area))
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  areaFilter === area
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
              >
                <MapPinned size={12} />
                {area}
                <span className="text-slate-400">{count}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 size={32} className="animate-spin text-sky-500" />
          <p className="text-sm font-semibold text-slate-400">
            Ачааллаж байна...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-10 text-center">
          <p className="text-sm font-black text-red-700">{error}</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Users2 size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-black text-slate-500">
            Орон нутгийн гишүүн олдсонгүй
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map(({ member }) => (
            <MemberRegistrationCard
              key={member.id}
              registration={member}
              onRefresh={() => fetchMembers(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
