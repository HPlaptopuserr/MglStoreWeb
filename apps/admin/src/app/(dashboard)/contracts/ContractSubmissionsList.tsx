"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  Files,
  FileText,
  Filter,
  Globe,
  Hash,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  Package,
  PenTool,
  Phone,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { adminFetch } from "@/lib/api";
import {
  ContractArchiveFilters,
  ContractArchiveHeader,
  ContractStatusCards,
} from "@/components/organisms/contracts/ContractArchiveShell";
import { API, WEB } from "./contracts.config";
import {
  ContractNameCell,
  ExpiryBadge,
  getContractCode,
  getContractDisplayName,
  statusDays,
  type SortKey,
  type Submission,
} from "./contracts.model";
import { ContractDetailPanel } from "./ContractDetailPanel";
import { RegisterScannedModal } from "./RegisterScannedModal";

export function ContractSubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "SIGNED" | "PENDING" | "EXPIRING" | "EXPIRED"
  >("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [openRegisterScanned, setOpenRegisterScanned] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch contract history
  const load = () => {
    setLoading(true);
    adminFetch(`${API}/contracts/submissions/all`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSubmissions(d.submissions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Unique plans list for filter dropdown
  const plansList = useMemo(() => {
    const plans = new Set<string>();
    submissions.forEach((s) => {
      if (s.feePlanLabel) plans.add(s.feePlanLabel);
    });
    return Array.from(plans);
  }, [submissions]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, planFilter, itemsPerPage]);

  const filtered = useMemo(() => {
    let list = submissions;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.org.toLowerCase().includes(q) ||
          (s.register ?? "").toLowerCase().includes(q) ||
          (s.phone ?? "").includes(q) ||
          (s.email ?? "").toLowerCase().includes(q),
      );
    }

    if (statusFilter === "SIGNED")
      list = list.filter((s) => s.status === "SIGNED");
    else if (statusFilter === "PENDING")
      list = list.filter((s) => s.status === "PENDING");
    else if (statusFilter === "EXPIRING")
      list = list.filter((s) => {
        const d = statusDays(s.expiresAt);
        return d !== null && d >= 0 && d <= 30;
      });
    else if (statusFilter === "EXPIRED")
      list = list.filter((s) => {
        const d = statusDays(s.expiresAt);
        return d !== null && d < 0;
      });

    if (planFilter !== "ALL") {
      list = list.filter((s) => s.feePlanLabel === planFilter);
    }

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "org") {
        av = a.org;
        bv = b.org;
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      } else if (sortKey === "signedAt") {
        av = a.signedAt ? new Date(a.signedAt).getTime() : 0;
        bv = b.signedAt ? new Date(b.signedAt).getTime() : 0;
      } else if (sortKey === "expiresAt") {
        av = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
        bv = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
      } else {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [submissions, search, statusFilter, planFilter, sortKey, sortDir]);

  // Paginated calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (pageIndex - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, pageIndex, itemsPerPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
      )
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
    );

  const stats = useMemo(
    () => ({
      total: submissions.length,
      signed: submissions.filter((s) => s.status === "SIGNED").length,
      pending: submissions.filter((s) => s.status === "PENDING").length,
      expiring: submissions.filter((s) => {
        const d = statusDays(s.expiresAt);
        return d !== null && d >= 0 && d <= 30;
      }).length,
      expired: submissions.filter((s) => {
        const d = statusDays(s.expiresAt);
        return d !== null && d < 0;
      }).length,
    }),
    [submissions],
  );

  const FILTERS: {
    key: typeof statusFilter;
    label: string;
    count: number;
    tone: "slate" | "emerald" | "amber" | "orange" | "rose";
    icon: React.ElementType;
  }[] = [
    {
      key: "ALL",
      label: "Бүх гэрээ",
      count: stats.total,
      tone: "slate",
      icon: Files,
    },
    {
      key: "SIGNED",
      label: "Баталгаажсан",
      count: stats.signed,
      tone: "emerald",
      icon: FileCheck,
    },
    {
      key: "PENDING",
      label: "Хүлээгдэж буй",
      count: stats.pending,
      tone: "amber",
      icon: Clock,
    },
    {
      key: "EXPIRING",
      label: "Дуусах дөхсөн",
      count: stats.expiring,
      tone: "orange",
      icon: AlertTriangle,
    },
    {
      key: "EXPIRED",
      label: "Дууссан",
      count: stats.expired,
      tone: "rose",
      icon: XCircle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {selected && (
        <ContractDetailPanel sub={selected} onClose={() => setSelected(null)} />
      )}
      {openRegisterScanned && (
        <RegisterScannedModal
          onClose={() => setOpenRegisterScanned(false)}
          onSuccess={() => {
            load();
          }}
        />
      )}

      <ContractArchiveHeader
        total={stats.total}
        filtered={filtered.length}
        loading={loading}
        onRegister={() => setOpenRegisterScanned(true)}
        onRefresh={load}
      />

      <ContractStatusCards
        filters={FILTERS}
        active={statusFilter}
        total={stats.total}
        onSelect={setStatusFilter}
      />

      <ContractArchiveFilters
        search={search}
        planFilter={planFilter}
        plansList={plansList}
        filteredCount={filtered.length}
        onSearchChange={setSearch}
        onPlanFilterChange={setPlanFilter}
      />

      {/* Main Table View */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">
              Архивын жагсаалт
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Мөр дээр дарж гэрээний дэлгэрэнгүй мэдээлэл болон эх хувийг нээнэ.
            </p>
          </div>
          <span className="w-max rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {paginatedList.length}/{filtered.length} харагдаж байна
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="min-w-[320px] px-6 py-4 font-semibold">
                  <button
                    onClick={() => toggleSort("org")}
                    className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors"
                  >
                    Гэрээний нэр / Байгууллага <SortIcon k="org" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors"
                  >
                    Гэрээний төлөв <SortIcon k="status" />
                  </button>
                </th>
                <th className="px-6 py-4 font-bold">Сонгосон багц</th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => toggleSort("signedAt")}
                    className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors"
                  >
                    Гарын үсэг зурсан <SortIcon k="signedAt" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => toggleSort("expiresAt")}
                    className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors"
                  >
                    Дуусах хугацаа <SortIcon k="expiresAt" />
                  </button>
                </th>
                <th className="px-6 py-4 font-bold">Холбоо барих мэдээлэл</th>
                <th className="px-6 py-4 font-bold text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-xs font-semibold text-slate-400">
                        Гэрээнүүдийг ачаалж байна...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-12 h-12 text-slate-200" />
                      <span className="font-bold text-slate-500">
                        Архивт тохирох гэрээ олдсонгүй
                      </span>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Хайлтын үг, төлөв эсвэл багцын шүүлтүүрээ өөрчлөөд дахин
                        шалгана уу.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((s) => {
                  const days = statusDays(s.expiresAt);
                  const rowAlert =
                    days !== null && days < 0
                      ? "bg-rose-50/20 hover:bg-rose-50/40"
                      : days !== null && days <= 30
                        ? "bg-amber-50/20 hover:bg-amber-50/40"
                        : "hover:bg-slate-50/50";
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`group cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${rowAlert}`}
                    >
                      <td className="px-6 py-5 align-top">
                        <ContractNameCell sub={s} />
                      </td>
                      <td className="px-6 py-4.5">
                        {s.status === "SIGNED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                            Баталгаажсан
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" /> Хүлээгдэж буй
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-700 text-xs">
                        {s.feePlanLabel}
                      </td>
                      <td className="px-6 py-4.5">
                        {s.signedAt ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(s.signedAt).toLocaleDateString("mn-MN")}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5">
                        <ExpiryBadge expiresAt={s.expiresAt} />
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold">
                          {s.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />{" "}
                              {s.phone}
                            </span>
                          )}
                          {s.email && (
                            <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-slate-400" />{" "}
                              {s.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        {s.status === "SIGNED" && (
                          <a
                            href={
                              s.pdfUrl || `${WEB}/contract/sign/${s.id}?print=1`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            download={
                              s.pdfUrl
                                ? `${s.contractName || s.org}_гэрээ${s.pdfUrl.endsWith(".pdf") ? ".pdf" : ".png"}`
                                : undefined
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1e4e8c] hover:bg-[#163d70] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Premium Pagination Control Footer */}
        {filtered.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            {/* Page statistics */}
            <div className="text-xs font-semibold text-slate-500">
              Нийт {filtered.length} гэрээнээс{" "}
              {Math.min(filtered.length, (pageIndex - 1) * itemsPerPage + 1)} -{" "}
              {Math.min(filtered.length, pageIndex * itemsPerPage)} дахь гэрээ
              харагдаж байна
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4">
              {/* Items per page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Харагдах тоо:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {[10, 15, 25, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prev/Next buttons */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pageIndex === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-700 px-3">
                  хуудас {pageIndex} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={pageIndex === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
