"use client";

import {
  Search,
  BookOpen,
  Filter,
  Phone,
  Calendar,
  MoreHorizontal,
  Building2,
  Briefcase,
  Clock,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";

type PartnerRequest = {
  id: string;
  email: string;
  phoneNumber: string | null;
  organizationName: string | null;
  businessCategory: string | null;
  operatingYears: number | null;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Хүлээгдэж буй";
    case "APPROVED":
      return "Зөвшөөрсөн";
    case "REJECTED":
      return "Татгалзсан";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRequests = useCallback(async () => {
    try {
      setPageLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const res = await fetch(
        `${API_BASE}/api/partner-requests?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Хүсэлт татаж чадсангүй. (${res.status})`);
      }

      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setRequests(normalized);
    } catch (err) {
      console.error(err);
      setRequests([]);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setPageLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approveRequest = async (id: string) => {
    try {
      setLoadingId(id);
      setError("");

      const res = await fetch(
        `${API_BASE}/api/partner-requests/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.message || `Зөвшөөрөх үйлдэл амжилтгүй. (${res.status})`,
        );
      }

      await fetchRequests();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Зөвшөөрөх үед алдаа гарлаа",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      setLoadingId(id);
      setError("");

      const res = await fetch(`${API_BASE}/api/partner-requests/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Татгалзах үйлдэл амжилтгүй. (${res.status})`);
      }

      await fetchRequests();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Татгалзах үед алдаа гарлаа",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const totalText = useMemo(() => {
    return `Нийт хүсэлт: ${requests.length}`;
  }, [requests.length]);

  return (
    <div className="h-screen bg-[#f8f9fa] text-slate-800 font-sans">
      <main className="h-full w-full overflow-hidden">
        <div className="h-full w-full overflow-y-auto px-2 py-3 md:px-4 md:py-4">
          <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm mb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  Бүртгэлийн жагсаалт
                </h1>
                <p className="mt-1 text-sm text-slate-500">{totalText}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-55 flex-1 sm:flex-none">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Нэр, утас, имэйл хайх..."
                    className="w-full sm:w-60 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <BookOpen size={15} className="text-slate-400" />
                  Бүх хүсэлт
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                  <Filter size={15} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="ALL">Бүгд</option>
                    <option value="PENDING">Хүлээгдэж буй</option>
                    <option value="APPROVED">Зөвшөөрсөн</option>
                    <option value="REJECTED">Татгалзсан</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-245 border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Байгууллагын нэр</th>
                    <th className="px-4 py-3">Дугаар</th>
                    <th className="px-4 py-3">Чиглэл</th>
                    <th className="px-4 py-3">Ажилласан жил</th>
                    <th className="px-4 py-3">Хүсэлтийн огноо</th>
                    <th className="px-4 py-3 text-right">Төлөв</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pageLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Ачааллаж байна...
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        Хүсэлт олдсонгүй
                      </td>
                    </tr>
                  ) : (
                    requests.map((item) => {
                      const isPending = item.status === "PENDING";
                      const isRowLoading = loadingId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className="group transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <Building2 size={17} />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {item.organizationName || "-"}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-slate-400">
                                  email: {item.email || "-"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone size={14} className="text-slate-400" />
                              <span>{item.phoneNumber || "-"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Briefcase size={14} className="text-slate-400" />
                              <span>{item.businessCategory || "-"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock size={14} className="text-slate-400" />
                              <span>{item.operatingYears ?? "-"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar size={14} className="text-slate-400" />
                              <span>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleDateString(
                                      "mn-MN",
                                    )
                                  : "-"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                  item.status,
                                )}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>

                              <button
                                onClick={() => approveRequest(item.id)}
                                disabled={isRowLoading || !isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isRowLoading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                Зөвшөөрөх
                              </button>

                              <button
                                onClick={() => rejectRequest(item.id)}
                                disabled={isRowLoading || !isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isRowLoading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <X size={13} />
                                )}
                                Татгалзах
                              </button>

                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
