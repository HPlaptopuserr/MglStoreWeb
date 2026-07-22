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
  CreditCard,
  CheckCircle2,
  XCircle,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { requestsApi } from "./requests-api.service";
import { InviteLinkModal, type InviteLinkData } from "./InviteLinkModal";
import { useAdminAuth } from "@/lib/admin-auth";

import {
  CARD_PROVIDERS,
  getJobPositionLabel,
  getRequestTotalText,
  getStatusClass,
  getStatusLabel,
  type CardTerminalRequest,
  type JobApplication,
  type PartnerRequest,
  type SectionType,
  type ServiceRequestSummary,
  type StockRequestSummary,
  type TabType,
} from "./request.model";
export default function RequestsPage() {
  const searchParams = useSearchParams();
  const { hasPermission, isFullAdmin } = useAdminAuth();

  const canSeePartnerRequests =
    isFullAdmin || hasPermission("MANAGE_REGISTRATIONS");
  const canSeeJobApps = isFullAdmin || hasPermission("MANAGE_JOB_APPLICATIONS");
  const canSeeStock = isFullAdmin || hasPermission("MANAGE_STOCK");
  const canSeeService = isFullAdmin || hasPermission("MANAGE_SERVICES");
  const canSeeCardTerminal =
    isFullAdmin || hasPermission("MANAGE_REGISTRATIONS");

  // Determine default section based on permissions
  const defaultSection: SectionType =
    canSeePartnerRequests || canSeeJobApps
      ? "partner-career"
      : canSeeStock
        ? "stock"
        : "service";

  const defaultTab: TabType = canSeePartnerRequests ? "partners" : "careers";

  const [activeSection, setActiveSection] = useState<SectionType>(
    searchParams.get("section") === "stock" && canSeeStock
      ? "stock"
      : searchParams.get("section") === "service" && canSeeService
        ? "service"
        : defaultSection,
  );
  const [activeTab, setActiveTab] = useState<TabType>(
    searchParams.get("tab") === "jobs" ? "careers" : defaultTab,
  );
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [jobApps, setJobApps] = useState<JobApplication[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequestSummary[]>([]);
  const [serviceRequests, setServiceRequests] = useState<
    ServiceRequestSummary[]
  >([]);
  const [cardTerminalRequests, setCardTerminalRequests] = useState<
    CardTerminalRequest[]
  >([]);
  const [cardTerminalFilter, setCardTerminalFilter] = useState("");
  const [cardApproveOpen, setCardApproveOpen] = useState<string | null>(null);
  const [cardAction, setCardAction] = useState<"APPROVED" | "REJECTED">(
    "APPROVED",
  );
  const [cardTerminalId, setCardTerminalId] = useState("");
  const [cardBridgeUrl, setCardBridgeUrl] = useState("");
  const [cardAdminNote, setCardAdminNote] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaveError, setCardSaveError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [inviteLinkModal, setInviteLinkModal] = useState<InviteLinkData | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRequests = useCallback(async () => {
    // Skip fetching if user doesn't have permission for the active tab
    if (activeTab === "partners" && !canSeePartnerRequests) return;
    if (activeTab === "careers" && !canSeeJobApps) return;

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

      const res = await requestsApi.primary(activeTab, params);

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
  }, [
    debouncedSearch,
    statusFilter,
    activeTab,
    canSeePartnerRequests,
    canSeeJobApps,
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const fetchSectionLists = async () => {
      try {
        if (activeSection === "stock" && canSeeStock) {
          const res = await requestsApi.stock();
          if (res.ok) {
            const data = await res.json();
            setStockRequests(Array.isArray(data) ? data : []);
          }
        }

        if (activeSection === "service" && canSeeService) {
          const res = await requestsApi.service();
          if (res.ok) {
            const data = await res.json();
            setServiceRequests(Array.isArray(data) ? data : []);
          }
        }

        if (activeSection === "card-terminal" && canSeeCardTerminal) {
          const res = await requestsApi.cardTerminals(cardTerminalFilter);
          if (res.ok) {
            const data = await res.json();
            setCardTerminalRequests(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch section data:", err);
      }
    };

    fetchSectionLists();
  }, [activeSection, cardTerminalFilter]);

  const approveRequest = async (id: string) => {
    try {
      setLoadingId(id);
      setError("");

      const res = await requestsApi.decidePrimary(activeTab, id, "approve");

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

      const res = await requestsApi.decidePrimary(activeTab, id, "reject");

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

  const handleCardTerminalSave = async (requestId: string) => {
    setCardSaveError(null);
    if (cardAction === "APPROVED" && !cardTerminalId.trim()) {
      setCardSaveError("Card Terminal ID оруулна уу");
      return;
    }
    setCardSaving(true);
    try {
      const res = await requestsApi.updateCardTerminal(requestId, {
        status: cardAction,
        cardTerminalId: cardTerminalId.trim() || undefined,
        terminalBridgeUrl: cardBridgeUrl.trim() || undefined,
        adminNote: cardAdminNote.trim() || undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setCardSaveError(data.message || "Алдаа гарлаа");
        return;
      }
      setCardApproveOpen(null);
      setCardTerminalId("");
      setCardBridgeUrl("");
      setCardAdminNote("");
      // re-fetch
      const refreshRes = await requestsApi.cardTerminals(cardTerminalFilter);
      if (refreshRes.ok) setCardTerminalRequests(await refreshRes.json());
    } catch {
      setCardSaveError("Сүлжээний алдаа гарлаа");
    } finally {
      setCardSaving(false);
    }
  };

  const totalText = useMemo(
    () =>
      getRequestTotalText({
        section: activeSection,
        tab: activeTab,
        partnerCount: requests.length,
        jobCount: jobApps.length,
        stockCount: stockRequests.length,
        serviceCount: serviceRequests.length,
        cardTerminals: cardTerminalRequests,
      }),
    [
      activeSection,
      activeTab,
      jobApps.length,
      requests.length,
      serviceRequests.length,
      stockRequests.length,
      cardTerminalRequests,
    ],
  );

  return (
    <div className="text-slate-800 font-sans">
      {inviteLinkModal?.show && (
        <InviteLinkModal
          data={inviteLinkModal}
          onClose={() => setInviteLinkModal(null)}
        />
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

          {/* Section cards — only show sections the user can access */}
          {[
            canSeePartnerRequests || canSeeJobApps,
            canSeeStock,
            canSeeService,
            canSeeCardTerminal,
          ].filter(Boolean).length > 1 && (
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              {(canSeePartnerRequests || canSeeJobApps) && (
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
                    Энэ хэсэг дотроо түнш хүсэлт болон ажлын анкет ангилагдан
                    харагдана.
                  </p>
                </button>
              )}

              {canSeeStock && (
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
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                  <p className="text-xs text-amber-800/90">
                    Агуулахын таталтын хүсэлтүүдийг хянах хэсэг
                  </p>
                </button>
              )}

              {canSeeService && (
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
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                  <p className="text-xs text-emerald-800/90">
                    Маркетинг, зөвлөгөө зэрэг үйлчилгээний хүсэлтүүд
                  </p>
                </button>
              )}

              {canSeeCardTerminal && (
                <button
                  type="button"
                  onClick={() => setActiveSection("card-terminal")}
                  className={`group rounded-2xl border p-4 text-left transition-colors ${
                    activeSection === "card-terminal"
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-blue-700">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} />
                      <p className="text-sm font-bold">Card Terminal</p>
                    </div>
                    {cardTerminalRequests.filter((r) => r.status === "PENDING")
                      .length > 0 && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-600">
                        {
                          cardTerminalRequests.filter(
                            (r) => r.status === "PENDING",
                          ).length
                        }
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-800/90">
                    Vendor-уудын card terminal холболтын хүсэлтүүд
                  </p>
                </button>
              )}
            </div>
          )}

          {activeSection === "partner-career" && (
            <>
              {/* Tab pills — only show when both tabs are available */}
              {canSeePartnerRequests && canSeeJobApps && (
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
              )}

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
                                    <Phone
                                      size={14}
                                      className="text-slate-400"
                                    />
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
                                    <Clock
                                      size={14}
                                      className="text-slate-400"
                                    />
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
                                    <Phone
                                      size={14}
                                      className="text-slate-400"
                                    />
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
                                <Briefcase
                                  size={12}
                                  className="text-slate-400"
                                />
                                {item.businessCategory || "-"}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                {item.operatingYears ?? "-"} жил
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar
                                  size={12}
                                  className="text-slate-400"
                                />
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
                <p className="text-sm font-bold text-slate-800">
                  Бараа таталтын хүсэлтүүд
                </p>
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
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
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
                              ? new Date(item.requestedAt).toLocaleDateString(
                                  "mn-MN",
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}
                            >
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
                <p className="text-sm font-bold text-slate-800">
                  Үйлчилгээний хүсэлтүүд
                </p>
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
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
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
                              ? new Date(item.createdAt).toLocaleDateString(
                                  "mn-MN",
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}
                            >
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
          {activeSection === "card-terminal" && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex gap-2">
                {[
                  { value: "", label: "Бүгд" },
                  { value: "PENDING", label: "Хүлээгдэж буй" },
                  { value: "APPROVED", label: "Зөвшөөрөгдсөн" },
                  { value: "REJECTED", label: "Татгалзсан" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCardTerminalFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      cardTerminalFilter === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {cardTerminalRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Хүсэлт байхгүй байна</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cardTerminalRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <NextLink
                              href={`/partners/${req.organizationId}`}
                              className="font-bold text-slate-900 hover:text-blue-600 text-sm"
                            >
                              {req.organization.name}
                            </NextLink>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-sm text-slate-600">
                              {CARD_PROVIDERS[req.providerType] ??
                                req.providerType}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building2 size={12} />
                              {req.organization.taxId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {req.contactPhone}
                            </span>
                            {req.contactEmail && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {req.contactEmail}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {req.status === "PENDING" && (
                            <Clock size={15} className="text-amber-500" />
                          )}
                          {req.status === "APPROVED" && (
                            <CheckCircle2
                              size={15}
                              className="text-emerald-500"
                            />
                          )}
                          {req.status === "REJECTED" && (
                            <XCircle size={15} className="text-red-500" />
                          )}
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              req.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : req.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {req.status === "PENDING"
                              ? "Хүлээгдэж буй"
                              : req.status === "APPROVED"
                                ? "Зөвшөөрөгдсөн"
                                : "Татгалзсан"}
                          </span>
                        </div>
                      </div>

                      {req.businessNote && (
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          {req.businessNote}
                        </p>
                      )}

                      {req.status === "APPROVED" && req.cardTerminalId && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs space-y-1">
                          <p className="font-bold text-emerald-800">
                            Олгосон credentials
                          </p>
                          <p className="text-emerald-700">
                            Terminal ID:{" "}
                            <span className="font-mono bg-white px-1 rounded">
                              {req.cardTerminalId}
                            </span>
                          </p>
                          {req.terminalBridgeUrl && (
                            <p className="text-emerald-700 break-all">
                              Bridge URL:{" "}
                              <span className="font-mono bg-white px-1 rounded">
                                {req.terminalBridgeUrl}
                              </span>
                            </p>
                          )}
                        </div>
                      )}

                      {req.adminNote && (
                        <p className="text-xs text-slate-500 italic">
                          Тэмдэглэл: {req.adminNote}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Илгээсэн:{" "}
                          {new Date(req.createdAt).toLocaleString("mn-MN")}
                        </span>
                        {req.reviewedAt && (
                          <span>
                            Шийдвэрлэсэн:{" "}
                            {new Date(req.reviewedAt).toLocaleString("mn-MN")}
                          </span>
                        )}
                      </div>

                      {/* Approve panel — only for PENDING */}
                      {req.status === "PENDING" && (
                        <div className="border-t border-slate-100 pt-3">
                          <button
                            onClick={() => {
                              setCardApproveOpen(
                                cardApproveOpen === req.id ? null : req.id,
                              );
                              setCardSaveError(null);
                              setCardTerminalId("");
                              setCardBridgeUrl("");
                              setCardAdminNote("");
                              setCardAction("APPROVED");
                            }}
                            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Шийдвэр гаргах
                            {cardApproveOpen === req.id ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>

                          {cardApproveOpen === req.id && (
                            <div className="mt-3 space-y-3">
                              {cardSaveError && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                                  <AlertCircle
                                    size={15}
                                    className="text-red-500 shrink-0 mt-0.5"
                                  />
                                  <p className="text-sm text-red-700">
                                    {cardSaveError}
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setCardAction("APPROVED")}
                                  className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                                    cardAction === "APPROVED"
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  Зөвшөөрөх
                                </button>
                                <button
                                  onClick={() => setCardAction("REJECTED")}
                                  className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                                    cardAction === "REJECTED"
                                      ? "bg-red-600 text-white border-red-600"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  Татгалзах
                                </button>
                              </div>

                              {cardAction === "APPROVED" && (
                                <>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                      Card Terminal ID{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={cardTerminalId}
                                      onChange={(e) =>
                                        setCardTerminalId(e.target.value)
                                      }
                                      placeholder="Terminal ID"
                                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                      Bridge URL
                                    </label>
                                    <input
                                      type="url"
                                      value={cardBridgeUrl}
                                      onChange={(e) =>
                                        setCardBridgeUrl(e.target.value)
                                      }
                                      placeholder="http://... (заавал биш)"
                                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                  Admin тэмдэглэл
                                </label>
                                <textarea
                                  value={cardAdminNote}
                                  onChange={(e) =>
                                    setCardAdminNote(e.target.value)
                                  }
                                  placeholder="Vendor-т харагдах тайлбар..."
                                  rows={2}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                                />
                              </div>

                              <button
                                onClick={() => handleCardTerminalSave(req.id)}
                                disabled={cardSaving}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                              >
                                {cardSaving ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                                Хадгалах
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
