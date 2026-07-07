"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Loader2,
  QrCode,
  X,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Settings2,
  Banknote,
  CalendarDays,
  ArrowUpDown,
  BadgePercent,
  Save,
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
  { value: "", label: "Төлсөн хүсэлтүүд" },
  { value: "PAID", label: "Төлсөн" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Шинэ эхэнд" },
  { value: "oldest", label: "Хуучин эхэнд" },
  { value: "amountDesc", label: "Дүн ихээс" },
  { value: "amountAsc", label: "Дүн багаас" },
];

const AGENT_STATUS_FILTERS = [
  { value: "all", label: "Бүгд" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

type AgentStatusFilter = (typeof AGENT_STATUS_FILTERS)[number]["value"];

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface MembershipAgent {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  commissionRate: number;
  isActive: boolean;
  registrationCount: number;
  paidMemberCount: number;
  revenue: number;
  pendingCommission: number;
  paidCommission: number;
  createdAt: string;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("976") && digits.length === 11
    ? digits.slice(3)
    : digits;
}

function registrationIdentityKey(registration: AssociationRegistration) {
  const phone = normalizePhone(registration.phone);
  if (phone) return `phone:${phone}`;
  return `name:${registration.lastName.trim().toLowerCase()}:${registration.firstName.trim().toLowerCase()}`;
}

function dedupeLatestRegistrations(registrations: AssociationRegistration[]) {
  const latestByIdentity = new Map<string, AssociationRegistration>();

  for (const registration of registrations) {
    const key = registrationIdentityKey(registration);
    const current = latestByIdentity.get(key);
    if (
      !current ||
      new Date(registration.createdAt).getTime() >
        new Date(current.createdAt).getTime()
    ) {
      latestByIdentity.set(key, registration);
    }
  }

  return registrations.filter(
    (registration) =>
      latestByIdentity.get(registrationIdentityKey(registration))?.id ===
      registration.id,
  );
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
      <span className={active ? "text-indigo-500" : "text-slate-400"}>
        {icon}
      </span>
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
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-3 text-slate-400"
      />
    </div>
  );
}

export default function AssociationPage() {
  const [registrations, setRegistrations] = useState<AssociationRegistration[]>(
    [],
  );
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
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
  const [agentCodeFilter, setAgentCodeFilter] = useState("");
  const [agents, setAgents] = useState<MembershipAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [agentStatusFilter, setAgentStatusFilter] =
    useState<AgentStatusFilter>("all");
  const [savingAgentId, setSavingAgentId] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAgentId, setCopiedAgentId] = useState("");

  const registrationUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000/association"
      : "https://mglstore.mn/association";
  const agentSignupUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000/association/agent"
      : "https://mglstore.mn/association/agent";
  const profileBaseUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000/profile"
      : "https://mglstore.mn/profile";

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (typeFilter) params.set("membershipType", typeFilter);
        if (paymentStatusFilter)
          params.set("paymentStatus", paymentStatusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (sort !== "newest") params.set("sort", sort);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (agentCodeFilter.trim())
          params.set("agentCode", agentCodeFilter.trim());
        params.set("limit", "200");

        const [listRes, statsRes, agentsRes] = await Promise.all([
          adminFetch(`${API}/admin/association/registrations?${params}`),
          adminFetch(`${API}/admin/association/stats`),
          adminFetch(`${API}/admin/association/agents`),
        ]);

        if (listRes.ok) {
          const json = await listRes.json();
          const data = Array.isArray(json) ? json : (json.data ?? []);
          setRegistrations(dedupeLatestRegistrations(data));
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
        if (agentsRes.ok) {
          const json = await agentsRes.json();
          setAgents(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      statusFilter,
      typeFilter,
      paymentStatusFilter,
      dateFrom,
      dateTo,
      sort,
      debouncedSearch,
      agentCodeFilter,
    ],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAgentReferralUrl = useCallback(
    (code: string) => `${profileBaseUrl}?ref=${encodeURIComponent(code)}`,
    [profileBaseUrl],
  );

  const handleAgentLinkCopy = useCallback(
    async (agent: MembershipAgent) => {
      await navigator.clipboard.writeText(getAgentReferralUrl(agent.code));
      setCopiedAgentId(agent.id);
      setTimeout(() => setCopiedAgentId(""), 2000);
    },
    [getAgentReferralUrl],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setPaymentStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
    setAgentCodeFilter("");
  }, []);

  const updateAgent = async (
    agentId: string,
    payload: Partial<Pick<MembershipAgent, "commissionRate" | "isActive">>,
  ) => {
    setSavingAgentId(agentId);
    try {
      const res = await adminFetch(
        `${API}/admin/association/agents/${agentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) fetchData(true);
    } finally {
      setSavingAgentId("");
    }
  };

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (debouncedSearch) filters.push(`Хайлт: ${debouncedSearch}`);
    if (statusFilter) {
      filters.push(
        STATUS_FILTERS.find((item) => item.value === statusFilter)?.label ??
          statusFilter,
      );
    }
    if (typeFilter) filters.push(MEMBERSHIP_TYPES[typeFilter].label);
    if (paymentStatusFilter) {
      filters.push(
        PAYMENT_STATUS_FILTERS.find(
          (item) => item.value === paymentStatusFilter,
        )?.label ?? paymentStatusFilter,
      );
    }
    if (dateFrom || dateTo)
      filters.push(`${dateFrom || "эхлэл"} - ${dateTo || "өнөөдөр"}`);
    if (sort !== "newest")
      filters.push(
        SORT_OPTIONS.find((item) => item.value === sort)?.label ?? sort,
      );
    if (agentCodeFilter.trim())
      filters.push(`Agent: ${agentCodeFilter.trim().toUpperCase()}`);
    return filters;
  }, [
    debouncedSearch,
    statusFilter,
    typeFilter,
    paymentStatusFilter,
    dateFrom,
    dateTo,
    sort,
    agentCodeFilter,
  ]);

  const hasActiveFilters = Boolean(
    search ||
    statusFilter ||
    typeFilter ||
    paymentStatusFilter ||
    agentCodeFilter ||
    dateFrom ||
    dateTo ||
    sort !== "newest",
  );
  const activeFilterCount = activeFilters.length;
  const pendingList = registrations.filter((r) => r.status === "PENDING");
  const otherList = registrations.filter((r) => r.status !== "PENDING");
  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();

    return agents.filter((agent) => {
      const matchesStatus =
        agentStatusFilter === "all" ||
        (agentStatusFilter === "active" && agent.isActive) ||
        (agentStatusFilter === "inactive" && !agent.isActive);

      if (!matchesStatus) return false;
      if (!query) return true;

      return [agent.code, agent.fullName, agent.phone, agent.email ?? ""].some(
        (value) => value.toLowerCase().includes(query),
      );
    });
  }, [agents, agentSearch, agentStatusFilter]);

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Холбооны гишүүнчлэл
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн нэгдсэн холбоо
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/association/payments"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Banknote size={15} />
            Төлбөр
          </Link>
          <Link
            href="/association/settings"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Settings2 size={15} />
            Тохиргоо
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
            <QrCode size={16} />
            QR / Линк
          </button>
        </div>
      </div>

      {/* ── QR / link panel ─────────────────────────────────── */}
      {showQr && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Бүртгүүлэх линк
              </p>
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
                Энэ линкийг QR код болгон хэвлэж, танхим болон социал хуудаст
                байршуулна уу.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center gap-2 sm:w-36">
              <QrCode size={56} className="text-indigo-500" />
              <p className="text-[11px] font-semibold text-indigo-600 text-center">
                QR хэвлэх
              </p>
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

      {agents.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BadgePercent size={17} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900">
                  Agent performance
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {filteredAgents.length} / {agents.length} agent · Code бүрээр
                  орлого, commission, бүртгэлийн тоо
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-72">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(event) => setAgentSearch(event.target.value)}
                  placeholder="Agent code, нэр, утас, email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  aria-label="Agent хайх"
                />
                {agentSearch && (
                  <button
                    type="button"
                    onClick={() => setAgentSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label="Agent хайлтыг цэвэрлэх"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {AGENT_STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setAgentStatusFilter(filter.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                      agentStatusFilter === filter.value
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <Link
                href={agentSignupUrl}
                target="_blank"
                className="inline-flex items-center justify-center rounded-xl border border-indigo-100 px-3 py-2 text-xs font-black text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
              >
                Public signup
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {filteredAgents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <BadgePercent size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-600">
                  Agent олдсонгүй
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Хайлт эсвэл төлөвийн filter-ээ өөрчилж үзнэ үү.
                </p>
              </div>
            ) : (
              filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[180px_1fr] lg:grid-cols-[180px_1fr_220px]">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setAgentCodeFilter(agent.code)}
                          className="block truncate text-left text-sm font-black text-indigo-700 hover:text-indigo-900"
                        >
                          {agent.code}
                        </button>
                        <p className="truncate text-xs font-semibold text-slate-600">
                          {agent.fullName} · {agent.phone}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate rounded-lg border border-indigo-100 bg-white px-2 py-1 text-[11px] font-bold text-indigo-600">
                            {getAgentReferralUrl(agent.code)}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleAgentLinkCopy(agent)}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                              copiedAgentId === agent.id
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                            aria-label={`${agent.code} agent link хуулах`}
                            title="Agent link хуулах"
                          >
                            {copiedAgentId === agent.id ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Гишүүн
                          </p>
                          <p className="mt-0.5 font-black text-slate-900">
                            {agent.paidMemberCount}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Орлого
                          </p>
                          <p className="mt-0.5 font-black text-slate-900">
                            {agent.revenue.toLocaleString()}₮
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Commission
                          </p>
                          <p className="mt-0.5 font-black text-indigo-700">
                            {agent.pendingCommission.toLocaleString()}₮
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
                        <label className="relative flex-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={agent.commissionRate}
                            onChange={(event) =>
                              setAgents((current) =>
                                current.map((item) =>
                                  item.id === agent.id
                                    ? {
                                        ...item,
                                        commissionRate:
                                          Number(event.target.value) || 0,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-black outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            aria-label={`${agent.code} commission хувь`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                            %
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateAgent(agent.id, {
                              commissionRate: agent.commissionRate,
                            })
                          }
                          disabled={savingAgentId === agent.id}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-60"
                          title="Хувь хадгалах"
                        >
                          {savingAgentId === agent.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Save size={15} />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateAgent(agent.id, { isActive: !agent.isActive })
                      }
                      className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-black lg:ml-3 ${
                        agent.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {agent.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_160px_180px_210px_180px]">
          <div className="relative min-w-0">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
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
          <div className="relative min-w-0">
            <BadgePercent
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={agentCodeFilter}
              onChange={(e) => setAgentCodeFilter(e.target.value.toUpperCase())}
              placeholder="Agent code"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-black uppercase tracking-wide text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
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
                <X size={14} />
                Цэвэрлэх
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
          <p className="text-sm text-slate-400 font-semibold">
            Ачааллаж байна...
          </p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-base font-black text-slate-500">
            Бүртгэл олдсонгүй
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Шүүлтүүрийг өөрчилж дахин хайна уу
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <X size={14} />
              Бүх шүүлтүүр арилгах
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
                  <MemberRegistrationCard
                    key={reg.id}
                    registration={reg}
                    onRefresh={() => fetchData(true)}
                  />
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
                  <span className="text-xs text-slate-400">
                    {otherList.length}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                {otherList.map((reg) => (
                  <MemberRegistrationCard
                    key={reg.id}
                    registration={reg}
                    onRefresh={() => fetchData(true)}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 py-2">
            Нийт <span className="font-bold">{registrations.length}</span>{" "}
            бүртгэл харагдаж байна
          </p>
        </div>
      )}
    </div>
  );
}
