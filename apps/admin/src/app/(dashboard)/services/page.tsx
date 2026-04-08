"use client";

import {
  Search,
  Filter,
  Clock,
  Check,
  X,
  Loader2,
  Building2,
  User,
  FileText,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Scale,
  Camera,
  Megaphone,
  MoreHorizontal,
  ChevronDown,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API, adminFetch } from "@/lib/api";

type ServiceRequest = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  description: string | null;
  status: string;
  statusLabel: string;
  adminNote: string | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
  };
  requestedBy: {
    id: string;
    email: string;
    profile: {
      fullName: string;
      phoneNumber: string | null;
    } | null;
  };
  assignedTo: {
    id: string;
    email: string;
    profile: {
      fullName: string;
    } | null;
  } | null;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  POSTER_DESIGN: <FileText size={16} />,
  PRODUCT_PHOTOSHOOT: <Camera size={16} />,
  LEGAL_CONSULTATION: <Scale size={16} />,
  TRAINING: <GraduationCap size={16} />,
  HR_SERVICE: <User size={16} />,
  MARKETING: <Megaphone size={16} />,
  OTHER: <MoreHorizontal size={16} />,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const serviceTypes = [
    { value: "POSTER_DESIGN", label: "Poster хийлгэх" },
    { value: "PRODUCT_PHOTOSHOOT", label: "Бараа зураг авалт" },
    { value: "LEGAL_CONSULTATION", label: "Хуульч дуудлага" },
    { value: "TRAINING", label: "Сургалт авах" },
    { value: "HR_SERVICE", label: "Хүний нөөц" },
    { value: "MARKETING", label: "Маркетинг" },
    { value: "OTHER", label: "Бусад" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const res = await adminFetch(`${API}/service-requests?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Хүсэлтүүдийг татаж чадсангүй");

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id: string, status: string) => {
    try {
      setActionLoading(id);
      const res = await adminFetch(`${API}/service-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Статус шинэчлэхэд алдаа гарлаа");

      await fetchRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setActionLoading(null);
    }
  };

  const totalText = useMemo(() => {
    return `Нийт ${requests.length} хүсэлт`;
  }, [requests.length]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("mn-MN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return `${price.toLocaleString()}₮`;
  };

  return (
    <div className="text-slate-800 font-sans">
      <main className="w-full">
        {/* Header */}
        <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm mb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">
                  Үйлчилгээний хүсэлтүүд
                </h1>
                <p className="mt-0.5 text-xs md:text-sm text-slate-400">
                  {totalText}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Хайх..."
                  className="w-full sm:w-52 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                  <Filter size={15} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="ALL">Бүх статус</option>
                    <option value="PENDING">Хүлээгдэж буй</option>
                    <option value="IN_PROGRESS">Хийгдэж буй</option>
                    <option value="COMPLETED">Дууссан</option>
                    <option value="CANCELLED">Цуцлагдсан</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="ALL">Бүх төрөл</option>
                    {serviceTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Briefcase size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Үйлчилгээний хүсэлт олдсонгүй
            </h3>
            <p className="text-sm text-slate-500">
              Vendor-ууд үйлчилгээний хүсэлт илгээгээгүй байна
            </p>
          </div>
        ) : (
          /* Table */
          <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Төрөл</th>
                    <th className="px-4 py-3">Гарчиг</th>
                    <th className="px-4 py-3">Байгууллага</th>
                    <th className="px-4 py-3">Хүсэгч</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Огноо</th>
                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                            {TYPE_ICONS[req.type] || <MoreHorizontal size={16} />}
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {req.typeLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {req.title}
                        </p>
                        {req.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {req.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                            {req.organization.logoUrl ? (
                              <img
                                src={req.organization.logoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 size={14} className="text-slate-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {req.organization.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-700">
                          {req.requestedBy.profile?.fullName || req.requestedBy.email}
                        </p>
                        <p className="text-xs text-slate-400">{req.requestedBy.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[req.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                        >
                          {req.status === "PENDING" && <Clock size={12} />}
                          {req.status === "IN_PROGRESS" && <Loader2 size={12} className="animate-spin" />}
                          {req.status === "COMPLETED" && <Check size={12} />}
                          {req.status === "CANCELLED" && <X size={12} />}
                          {req.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-500">{formatDate(req.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, "IN_PROGRESS")}
                                disabled={actionLoading === req.id}
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                title="Хийгдэж эхлэх"
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Clock size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => updateStatus(req.id, "CANCELLED")}
                                disabled={actionLoading === req.id}
                                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                title="Цуцлах"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          {req.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => updateStatus(req.id, "COMPLETED")}
                              disabled={actionLoading === req.id}
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              title="Дууссан"
                            >
                              {actionLoading === req.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Дэлгэрэнгүй"
                          >
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                      {TYPE_ICONS[selectedRequest.type]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {selectedRequest.title}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {selectedRequest.typeLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Байгууллага
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                      {selectedRequest.organization.logoUrl ? (
                        <img
                          src={selectedRequest.organization.logoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 size={14} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedRequest.organization.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedRequest.organization.email} • {selectedRequest.organization.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedRequest.description && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Тайлбар
                    </label>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Статус
                    </label>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[selectedRequest.status]}`}
                      >
                        {selectedRequest.statusLabel}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Огноо
                    </label>
                    <p className="text-sm text-slate-700 mt-1">
                      {formatDate(selectedRequest.createdAt)}
                    </p>
                  </div>
                </div>

                {(selectedRequest.estimatedPrice || selectedRequest.finalPrice) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Төсөөлөлт үнэ
                      </label>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {formatPrice(selectedRequest.estimatedPrice)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Эцсийн үнэ
                      </label>
                      <p className="text-sm font-semibold text-emerald-600 mt-1">
                        {formatPrice(selectedRequest.finalPrice)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedRequest.adminNote && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Админ тэмдэглэл
                    </label>
                    <p className="text-sm text-slate-700 mt-1 p-3 bg-slate-50 rounded-lg">
                      {selectedRequest.adminNote}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                {selectedRequest.status === "PENDING" && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => updateStatus(selectedRequest.id, "IN_PROGRESS")}
                      disabled={actionLoading === selectedRequest.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Clock size={16} />
                      )}
                      Эхлүүлэх
                    </button>
                    <button
                      onClick={() => updateStatus(selectedRequest.id, "CANCELLED")}
                      disabled={actionLoading === selectedRequest.id}
                      className="px-4 py-2.5 border border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      Цуцлах
                    </button>
                  </div>
                )}

                {selectedRequest.status === "IN_PROGRESS" && (
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={() => updateStatus(selectedRequest.id, "COMPLETED")}
                      disabled={actionLoading === selectedRequest.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Дууссан гэж тэмдэглэх
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
