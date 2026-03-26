"use client";

import NextLink from "next/link";
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
  User,
  MapPin,
  Copy,
  Link as LinkIcon,
  CheckCircle,
  Truck,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API, API_BASE } from "@/lib/api";

type TabType = "partners" | "careers";
type SectionType = "partner-career" | "stock" | "service";

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

type JobApplication = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  registerNumber: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  jobPosition:
    | string
    | {
        id?: string;
        name?: string;
        slug?: string;
        isActive?: boolean;
        createdAt?: string;
      }
    | null;
  education: string | null;
  salaryExpect: string | null;
  experience: string | null;
  professionalSkills: string | null;
  personalSkills: string | null;
  languages: string | null;
  status: string;
  createdAt: string;
};

type StockRequestSummary = {
  id: string;
  requestNumber: string;
  status: string;
  requestedAt: string;
  organization?: { name?: string };
  warehouse?: { name?: string };
};

type ServiceRequestSummary = {
  id: string;
  title: string;
  typeLabel?: string;
  status: string;
  statusLabel?: string;
  createdAt: string;
  organization?: { name?: string };
};

const JOB_POSITION_LABELS: Record<string, string> = {
  driver: "Жолооч",
  picker: "Бараа бэлтгэгч",
  support: "Хэрэглэгчийн үйлчилгээ",
  admin: "Админ",
};

function getJobPositionLabel(jobPosition: JobApplication["jobPosition"]) {
  if (!jobPosition) {
    return "-";
  }

  if (typeof jobPosition === "string") {
    return JOB_POSITION_LABELS[jobPosition] || jobPosition;
  }

  if (jobPosition.name) {
    return jobPosition.name;
  }

  if (jobPosition.slug) {
    return JOB_POSITION_LABELS[jobPosition.slug] || jobPosition.slug;
  }

  return "-";
}

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
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<SectionType>(
    searchParams.get("section") === "stock"
      ? "stock"
      : searchParams.get("section") === "service"
        ? "service"
        : "partner-career",
  );
  const [activeTab, setActiveTab] = useState<TabType>(
    searchParams.get("tab") === "jobs" ? "careers" : "partners",
  );
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [jobApps, setJobApps] = useState<JobApplication[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequestSummary[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestSummary[]>(
    [],
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [inviteLinkModal, setInviteLinkModal] = useState<{
    show: boolean;
    link: string;
    orgName: string;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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

      const endpoint =
        activeTab === "partners" ? "partner-requests" : "job-applications";

      const res = await fetch(
        `${API_BASE}/api/${endpoint}?${params.toString()}`,
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

      if (activeTab === "partners") {
        setRequests(normalized);
      } else {
        setJobApps(normalized);
      }
    } catch (err) {
      console.error(err);
      if (activeTab === "partners") setRequests([]);
      else setJobApps([]);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setPageLoading(false);
    }
  }, [debouncedSearch, statusFilter, activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const fetchSectionLists = async () => {
      try {
        if (activeSection === "stock") {
          const res = await fetch(`${API}/stock-requests`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setStockRequests(Array.isArray(data) ? data : []);
          }
        }

        if (activeSection === "service") {
          const res = await fetch(`${API}/service-requests`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setServiceRequests(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch section data:", err);
      }
    };

    fetchSectionLists();
  }, [activeSection]);

  const approveRequest = async (id: string) => {
    try {
      setLoadingId(id);
      setError("");

      const endpoint =
        activeTab === "partners"
          ? `partner-requests/${id}/approve`
          : `job-applications/${id}/approve`;

      const res = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.message || `Зөвшөөрөх үйлдэл амжилтгүй. (${res.status})`,
        );
      }

      // Show invite link modal for partner requests
      if (activeTab === "partners" && data?.data?.inviteLink) {
        setInviteLinkModal({
          show: true,
          link: data.data.inviteLink,
          orgName: data.data.organization?.name || "",
          email: data.data.user?.email || "",
        });
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

      const endpoint =
        activeTab === "partners"
          ? `partner-requests/${id}/reject`
          : `job-applications/${id}/reject`;

      const res = await fetch(`${API_BASE}/api/${endpoint}`, {
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
    if (activeSection === "stock") {
      return `Нийт бараа таталтын хүсэлт: ${stockRequests.length}`;
    }

    if (activeSection === "service") {
      return `Нийт үйлчилгээний хүсэлт: ${serviceRequests.length}`;
    }

    const count = activeTab === "partners" ? requests.length : jobApps.length;
    const label = activeTab === "partners" ? "Түнш хүсэлт" : "Ажлын анкет";
    return `Нийт ${label}: ${count}`;
  }, [
    activeSection,
    activeTab,
    jobApps.length,
    requests.length,
    serviceRequests.length,
    stockRequests.length,
  ]);

  const copyToClipboard = async () => {
    if (inviteLinkModal?.link) {
      await navigator.clipboard.writeText(inviteLinkModal.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="text-slate-800 font-sans">
      {/* Invite Link Modal */}
      {inviteLinkModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Амжилттай зөвшөөрөгдлөө!
                </h3>
                <p className="text-sm text-slate-500">
                  {inviteLinkModal.orgName}
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <LinkIcon size={16} />
                Нууц үг тохируулах линк
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Энэ линкийг <strong>{inviteLinkModal.email}</strong> хаягт
                илгээнэ үү. Линк 24 цагийн дотор хүчинтэй.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLinkModal.link}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      Хуулсан
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Хуулах
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setInviteLinkModal(null)}
              className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Хаах
            </button>
          </div>
        </div>
      )}

      <main className="w-full">
        <div className="w-full">
          <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 md:p-5 shadow-sm mb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-slate-900">
                    Бүртгэлийн жагсаалт
                  </h1>
                  <p className="mt-0.5 text-xs md:text-sm text-slate-400">
                    {totalText}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("ALL");
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <BookOpen size={15} className="text-slate-400" />
                    <span className="hidden sm:inline">Бүх хүсэлт</span>
                    <span className="sm:hidden">Бүгд</span>
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
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setActiveSection("partner-career")}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                activeSection === "partner-career"
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-indigo-700">
                <BookOpen size={16} />
                <p className="text-sm font-bold">Түнш ба анкет</p>
              </div>
              <p className="text-xs text-indigo-700/80">
                Энэ хэсэг дотроо түнш хүсэлт болон ажлын анкет ангилагдан харагдана.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("stock")}
              className={`group rounded-2xl border p-4 text-left transition-colors ${
                activeSection === "stock"
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-amber-700">
                <div className="flex items-center gap-2">
                  <Truck size={16} />
                  <p className="text-sm font-bold">Бараа таталтын хүсэлт</p>
                </div>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-amber-800/90">
                Агуулахын таталтын хүсэлтүүдийг хянах хэсэг
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("service")}
              className={`group rounded-2xl border p-4 text-left transition-colors ${
                activeSection === "service"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-emerald-700">
                <div className="flex items-center gap-2">
                  <Wrench size={16} />
                  <p className="text-sm font-bold">Үйлчилгээний хүсэлт</p>
                </div>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-emerald-800/90">
                Маркетинг, зөвлөгөө зэрэг үйлчилгээний хүсэлтүүд
              </p>
            </button>
          </div>

          {activeSection === "partner-career" && (
            <>
          {/* Tab pills */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("partners")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === "partners"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Building2 size={15} />
              Түнш хүсэлт
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("careers")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === "careers"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Briefcase size={15} />
              Ажлын анкет
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {activeTab === "partners" ? (
                <table className="w-full min-w-200 border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Байгууллагын нэр</th>
                      <th className="px-4 py-3">Дугаар</th>
                      <th className="px-4 py-3">Чиглэл</th>
                      <th className="px-4 py-3">Жил</th>
                      <th className="px-4 py-3">Огноо</th>
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
                                    {item.email || "-"}
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
                                <Briefcase
                                  size={14}
                                  className="text-slate-400"
                                />
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
                                <Calendar
                                  size={14}
                                  className="text-slate-400"
                                />
                                <span>
                                  {item.createdAt
                                    ? new Date(
                                        item.createdAt,
                                      ).toLocaleDateString("mn-MN")
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
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
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
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
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
              ) : (
                <table className="w-full min-w-200 border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Нэр</th>
                      <th className="px-4 py-3">Утас</th>
                      <th className="px-4 py-3">Албан тушаал</th>
                      <th className="px-4 py-3">Боловсрол</th>
                      <th className="px-4 py-3">Огноо</th>
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
                    ) : jobApps.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          Анкет олдсонгүй
                        </td>
                      </tr>
                    ) : (
                      jobApps.map((item) => {
                        const isRowLoading = loadingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className="group transition-colors hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                                  <User size={17} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {item.lastName} {item.firstName}
                                  </div>
                                  {item.address && (
                                    <div className="mt-0.5 truncate text-xs text-slate-400 flex items-center gap-1">
                                      <MapPin size={10} />
                                      {item.address}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={14} className="text-slate-400" />
                                <span>{item.phone || "-"}</span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Briefcase
                                  size={14}
                                  className="text-slate-400"
                                />
                                <span>
                                  {getJobPositionLabel(item.jobPosition)}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <BookOpen
                                  size={14}
                                  className="text-slate-400"
                                />
                                <span>{item.education || "-"}</span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar
                                  size={14}
                                  className="text-slate-400"
                                />
                                <span>
                                  {item.createdAt
                                    ? new Date(
                                        item.createdAt,
                                      ).toLocaleDateString("mn-MN")
                                    : "-"}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => approveRequest(item.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isRowLoading ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  Зөвшөөрөх
                                </button>

                                <button
                                  onClick={() => rejectRequest(item.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isRowLoading ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
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
              )}
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {pageLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="ml-2 text-sm">Ачааллаж байна...</span>
              </div>
            ) : activeTab === "partners" ? (
              requests.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  Хүсэлт олдсонгүй
                </div>
              ) : (
                requests.map((item) => {
                  const isPending = item.status === "PENDING";
                  const isRowLoading = loadingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                              <Building2 size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm truncate">
                                {item.organizationName || "-"}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {item.email || "-"}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${getStatusClass(item.status)}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            {item.phoneNumber || "-"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-slate-400" />
                            {item.businessCategory || "-"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            {item.operatingYears ?? "-"} жил
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(
                                  "mn-MN",
                                )
                              : "-"}
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                          <button
                            onClick={() => approveRequest(item.id)}
                            disabled={isRowLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
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
                            disabled={isRowLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          >
                            {isRowLoading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <X size={13} />
                            )}
                            Татгалзах
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : jobApps.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500">
                Анкет олдсонгүй
              </div>
            ) : (
              jobApps.map((item) => {
                const isRowLoading = loadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                            <User size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate">
                              {item.lastName} {item.firstName}
                            </div>
                            {item.address && (
                              <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                                <MapPin size={10} />
                                {item.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          {item.phone || "-"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={12} className="text-slate-400" />
                          {getJobPositionLabel(item.jobPosition)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={12} className="text-slate-400" />
                          {item.education || "-"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "mn-MN",
                              )
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          )}

          {activeSection === "stock" && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">Бараа таталтын хүсэлтүүд</p>
                <NextLink
                  href="/requests/stock-requests"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  Дэлгэрэнгүй <ArrowRight size={14} />
                </NextLink>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Хүсэлтийн №</th>
                      <th className="px-4 py-3">Байгууллага</th>
                      <th className="px-4 py-3">Агуулах</th>
                      <th className="px-4 py-3">Огноо</th>
                      <th className="px-4 py-3 text-right">Төлөв</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                          Бараа таталтын хүсэлт олдсонгүй
                        </td>
                      </tr>
                    ) : (
                      stockRequests.slice(0, 12).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">
                            {item.requestNumber}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.organization?.name || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.warehouse?.name || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.requestedAt
                              ? new Date(item.requestedAt).toLocaleDateString("mn-MN")
                              : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "service" && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-800">Үйлчилгээний хүсэлтүүд</p>
                <NextLink
                  href="/services"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Дэлгэрэнгүй <ArrowRight size={14} />
                </NextLink>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Гарчиг</th>
                      <th className="px-4 py-3">Төрөл</th>
                      <th className="px-4 py-3">Байгууллага</th>
                      <th className="px-4 py-3">Огноо</th>
                      <th className="px-4 py-3 text-right">Төлөв</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serviceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                          Үйлчилгээний хүсэлт олдсонгүй
                        </td>
                      </tr>
                    ) : (
                      serviceRequests.slice(0, 12).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">
                            {item.title || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.typeLabel || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.organization?.name || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString("mn-MN")
                              : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                              {item.statusLabel || getStatusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
