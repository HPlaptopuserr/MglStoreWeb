"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search, Filter, Download, RefreshCw, FileText,
  CheckCircle2, Clock, ChevronUp, ChevronDown, X,
  Building, Phone, Mail, Calendar, AlertTriangle,
} from "lucide-react";
import { adminFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
const API = `${API_BASE}/api`;
const WEB = process.env.NEXT_PUBLIC_WEB_URL || "https://mglstore.mn";

type Submission = {
  id: string;
  templateId: string;
  org: string;
  register: string | null;
  phone: string | null;
  email: string | null;
  status: "SIGNED" | "PENDING";
  isPaid: boolean;
  feePlan: string | null;
  feePlanLabel: string;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  memberData: any;
  headerData: any;
};

type SortKey = "org" | "status" | "signedAt" | "expiresAt" | "createdAt";

function statusDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-neutral-400 text-xs">—</span>;
  const days = statusDays(expiresAt);
  if (days === null) return <span className="text-neutral-400 text-xs">—</span>;
  const date = new Date(expiresAt).toLocaleDateString("mn-MN");
  if (days < 0)
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-red-600">{date}</span>
        <span className="text-[10px] text-red-400">Дууссан</span>
      </div>
    );
  if (days <= 30)
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-amber-600">{date}</span>
        <span className="text-[10px] text-amber-500">{days} өдөр үлдсэн</span>
      </div>
    );
  return (
    <div className="flex flex-col">
      <span className="text-xs text-neutral-700">{date}</span>
      <span className="text-[10px] text-neutral-400">{days} өдөр үлдсэн</span>
    </div>
  );
}

function DetailPanel({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const member = sub.memberData as any;
  const days = statusDays(sub.expiresAt);
  const expiring = days !== null && days >= 0 && days <= 30;
  const expired = days !== null && days < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-[#1e4e8c]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white">{sub.org}</h2>
              <p className="text-blue-200 text-xs">MGL-{sub.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            {sub.status === "SIGNED"
              ? <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Баталгаажсан</span>
              : <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold flex items-center gap-1"><Clock className="w-4 h-4" /> Хүлээгдэж буй</span>
            }
            {sub.isPaid && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Төлбөртэй</span>}
            {expiring && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Дуусах дөхсөн</span>}
            {expired && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Дууссан</span>}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Гэрээний дугаар", `MGL-${sub.id.slice(0, 8).toUpperCase()}`],
              ["Хугацаа", sub.feePlanLabel],
              ["Гарын үсэг зурсан", sub.signedAt ? new Date(sub.signedAt).toLocaleDateString("mn-MN") : "—"],
              ["Дуусах огноо", sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("mn-MN") : "—"],
              ["Үүсгэсэн огноо", new Date(sub.createdAt).toLocaleDateString("mn-MN")],
            ].map(([label, value]) => (
              <div key={label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-3">
                <div className="text-[11px] text-neutral-400 mb-0.5">{label}</div>
                <div className="font-semibold text-neutral-800 text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Member info */}
          {member && (
            <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#1e4e8c]" />
                <span className="font-semibold text-[#1e4e8c] text-sm">Байгууллагын мэдээлэл</span>
              </div>
              <div className="divide-y divide-neutral-100">
                {([
                  ["Байгууллагын нэр", member.name],
                  ["Регистр", member.register],
                  ["Үйл ажиллагаа", member.field],
                  ["Хаяг", member.address],
                  ["Утас", member.phone],
                  ["И-мэйл", member.email],
                  ["Вэбсайт", member.website],
                  ["Захирал", member.director],
                ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex px-4 py-2 text-sm">
                    <span className="text-neutral-500 w-36 shrink-0">{label}</span>
                    <span className="font-medium text-neutral-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {sub.status === "SIGNED" && (
              <button
                onClick={() => window.open(`${WEB}/contract/sign/${sub.id}?print=1`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e4e8c] text-white rounded-lg text-sm font-medium hover:bg-[#163d70] transition-colors"
              >
                <Download className="w-4 h-4" /> PDF татах
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SIGNED" | "PENDING" | "EXPIRING" | "EXPIRED">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Submission | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch(`${API}/contracts/submissions/all`)
      .then(r => r.json())
      .then(d => { if (d.success) setSubmissions(d.submissions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = submissions;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.org.toLowerCase().includes(q) ||
        (s.register ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter === "SIGNED") list = list.filter(s => s.status === "SIGNED");
    else if (statusFilter === "PENDING") list = list.filter(s => s.status === "PENDING");
    else if (statusFilter === "EXPIRING") list = list.filter(s => {
      const d = statusDays(s.expiresAt);
      return d !== null && d >= 0 && d <= 30;
    });
    else if (statusFilter === "EXPIRED") list = list.filter(s => {
      const d = statusDays(s.expiresAt);
      return d !== null && d < 0;
    });

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "org") { av = a.org; bv = b.org; }
      else if (sortKey === "status") { av = a.status; bv = b.status; }
      else if (sortKey === "signedAt") { av = a.signedAt ? new Date(a.signedAt).getTime() : 0; bv = b.signedAt ? new Date(b.signedAt).getTime() : 0; }
      else if (sortKey === "expiresAt") { av = a.expiresAt ? new Date(a.expiresAt).getTime() : 0; bv = b.expiresAt ? new Date(b.expiresAt).getTime() : 0; }
      else { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [submissions, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-neutral-300" />;

  const stats = useMemo(() => ({
    total: submissions.length,
    signed: submissions.filter(s => s.status === "SIGNED").length,
    pending: submissions.filter(s => s.status === "PENDING").length,
    expiring: submissions.filter(s => { const d = statusDays(s.expiresAt); return d !== null && d >= 0 && d <= 30; }).length,
    expired: submissions.filter(s => { const d = statusDays(s.expiresAt); return d !== null && d < 0; }).length,
  }), [submissions]);

  const FILTERS: { key: typeof statusFilter; label: string; count: number; color: string }[] = [
    { key: "ALL", label: "Бүгд", count: stats.total, color: "bg-neutral-100 text-neutral-700" },
    { key: "SIGNED", label: "Баталгаажсан", count: stats.signed, color: "bg-green-100 text-green-700" },
    { key: "PENDING", label: "Хүлээгдэж буй", count: stats.pending, color: "bg-amber-100 text-amber-700" },
    { key: "EXPIRING", label: "Дуусах дөхсөн", count: stats.expiring, color: "bg-orange-100 text-orange-700" },
    { key: "EXPIRED", label: "Дууссан", count: stats.expired, color: "bg-red-100 text-red-700" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {selected && <DetailPanel sub={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Гэрээний мэдээлэл</h1>
          <p className="text-neutral-500 mt-0.5 text-sm">Нийт байгуулсан гэрээний жагсаалт, хугацаа, статус</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Шинэчлэх
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-2xl p-4 text-left border-2 transition-all ${statusFilter === f.key ? "border-blue-500 shadow-sm" : "border-transparent"} bg-white shadow-sm hover:shadow`}
          >
            <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${f.color}`}>{f.label}</div>
            <div className="text-2xl font-bold text-neutral-900">{f.count}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Байгууллагын нэр, регистр, утас, и-мэйл хайх..."
            className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500 bg-white border border-neutral-200 rounded-xl px-4 py-2.5">
          <Filter className="w-4 h-4" /> {filtered.length} үр дүн
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-5 py-3.5">
                  <button onClick={() => toggleSort("org")} className="flex items-center gap-1 font-semibold hover:text-neutral-800">
                    Байгууллага <SortIcon k="org" />
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => toggleSort("status")} className="flex items-center gap-1 font-semibold hover:text-neutral-800">
                    Статус <SortIcon k="status" />
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">Хугацаа</th>
                <th className="px-5 py-3.5">
                  <button onClick={() => toggleSort("signedAt")} className="flex items-center gap-1 font-semibold hover:text-neutral-800">
                    Гарын үсэг <SortIcon k="signedAt" />
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => toggleSort("expiresAt")} className="flex items-center gap-1 font-semibold hover:text-neutral-800">
                    Дуусах огноо <SortIcon k="expiresAt" />
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">Холбоо барих</th>
                <th className="px-5 py-3.5 font-semibold text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-300" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-neutral-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
                    Гэрээ олдсонгүй
                  </td>
                </tr>
              ) : filtered.map(s => {
                const days = statusDays(s.expiresAt);
                const rowAlert = days !== null && days < 0 ? "bg-red-50/40" : days !== null && days <= 30 ? "bg-amber-50/40" : "";
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${rowAlert}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-neutral-900">{s.org}</div>
                      <div className="text-xs text-neutral-400 font-mono mt-0.5">MGL-{s.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.status === "SIGNED"
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> Баталгаажсан</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold"><Clock className="w-3 h-3" /> Хүлээгдэж буй</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-neutral-700">{s.feePlanLabel}</td>
                    <td className="px-5 py-3.5">
                      {s.signedAt
                        ? <div className="flex items-center gap-1 text-xs text-neutral-600"><Calendar className="w-3 h-3" />{new Date(s.signedAt).toLocaleDateString("mn-MN")}</div>
                        : <span className="text-neutral-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <ExpiryBadge expiresAt={s.expiresAt} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5 text-xs text-neutral-500">
                        {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                        {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {s.status === "SIGNED" && (
                        <button
                          onClick={e => { e.stopPropagation(); window.open(`${WEB}/contract/sign/${s.id}?print=1`, "_blank"); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
