"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  Truck,
  UserCircle,
  UserCog,
  UserPlus,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  X,
  Lock,
  Scale,
  Crown,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

/* ─── types ────────────────────────────────────────────────────────── */
type SystemUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isPrime: boolean;
  membershipPaidAt?: string | null;
  membershipStartedAt?: string | null;
  membershipExpiresAt?: string | null;
  membershipDiscountPhone?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  memberships: { role: string; isActive: boolean; isPrimary?: boolean; orgId?: string; orgName: string }[];
  createdAt: string;
};

type UsersSummary = {
  totalUsers: number;
  activeUsers: number;
  primeUsers: number;
  roles: Record<string, number>;
};

type UsersResponse = {
  items: SystemUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: UsersSummary;
};

/* ─── constants ────────────────────────────────────────────────────── */
const SYSTEM_ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SUPER_ADMIN: { label: "Ерөнхий админ", color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: ShieldCheck },
  ADMIN: { label: "Админ", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: ShieldCheck },
  HR_ADMIN: { label: "Хүний нөөц", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: UserCog },
  CONTENT_ADMIN: { label: "Контент админ", color: "text-sky-700", bg: "bg-sky-50 border-sky-200", icon: UserCog },
  PARTNER_ADMIN: { label: "Түнш админ", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: UserCog },
  WAREHOUSE_ADMIN: { label: "Агуулах админ", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: UserCog },
  FINANCE_ADMIN: { label: "Санхүү админ", color: "text-teal-700", bg: "bg-teal-50 border-teal-200", icon: UserCog },
  SERVICE_ADMIN: { label: "Үйлчилгээ админ", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: UserCog },
  LAWYER: { label: "Хуульч", color: "text-fuchsia-700", bg: "bg-fuchsia-50 border-fuchsia-200", icon: Scale },
  USER:  { label: "Хэрэглэгч", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: UserCog },
};

const ORG_ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OWNER:   { label: "Эзэмшигч", color: "text-violet-700",  bg: "bg-violet-50 border-violet-200", icon: Building2 },
  ADMIN:   { label: "Менежер",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     icon: ShieldCheck },
  STAFF:   { label: "Ажилтан",   color: "text-slate-600",   bg: "bg-slate-50 border-slate-200",   icon: UserCog },
  VIEWER:  { label: "Ажиглагч",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",icon: UserCircle },
};

const ITEMS_PER_PAGE = 15;
const DEFAULT_MEMBERSHIP_DURATION_MONTHS = 12;
const MEMBERSHIP_DURATION_OPTIONS = [
  { label: "1 жил", months: 12 },
  { label: "6 сар", months: 6 },
  { label: "3 сар", months: 3 },
  { label: "1 сар", months: 1 },
];

/* ─── helpers ──────────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "short", day: "numeric" });
}

function displayEmail(email: string) {
  return email.endsWith("@temp.local") ? "Имэйлгүй" : email;
}

function displayPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  const normalized = digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
  if (normalized.length >= 8 && normalized.length <= 12) return normalized;
  return "";
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Нэвтрээгүй";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} минутын өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} хоногийн өмнө`;
  return formatDate(dateStr);
}

function isMembershipActive(user: Pick<SystemUser, "isPrime" | "membershipExpiresAt">) {
  if (!user.isPrime) return false;
  if (!user.membershipExpiresAt) return true;
  return new Date(user.membershipExpiresAt).getTime() > Date.now();
}

function membershipStatusText(user: SystemUser) {
  if (!user.isPrime) return "Member биш";
  if (!user.membershipExpiresAt) return "Хугацаагүй member";

  const expiresAt = new Date(user.membershipExpiresAt);
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${formatDate(user.membershipExpiresAt)} дууссан`;
  if (days === 0) return "Өнөөдөр дуусна";
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.round((days % 365) / 30);
    return remainingMonths > 0
      ? `${years} жил ${remainingMonths} сар үлдсэн`
      : `${years} жил үлдсэн`;
  }
  if (days >= 45) return `${Math.round(days / 30)} сар үлдсэн`;
  if (days >= 28) return "1 сар үлдсэн";
  return `${days} хоног үлдсэн`;
}

/* ─── component ────────────────────────────────────────────────────── */
export function SystemUsersSection() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<UsersSummary>({
    totalUsers: 0,
    activeUsers: 0,
    primeUsers: 0,
    roles: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [primeFilter, setPrimeFilter] = useState<"" | "prime">("");
  const [page, setPage] = useState(1);

  /* fetch users */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter === "active") params.set("isActive", "true");
      if (statusFilter === "inactive") params.set("isActive", "false");
      if (primeFilter === "prime") params.set("isPrime", "true");

      const res = await adminFetch(`${API}/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Хэрэглэгчдийн мэдээлэл ачаалахад алдаа гарлаа");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
        const roles: Record<string, number> = {};
        for (const user of data) roles[user.role] = (roles[user.role] ?? 0) + 1;
        setSummary({
          totalUsers: data.length,
          activeUsers: data.filter((user) => user.isActive).length,
          primeUsers: data.filter((user) => user.isPrime).length,
          roles,
        });
        return;
      }

      const payload = data as UsersResponse;
      setUsers(Array.isArray(payload.items) ? payload.items : []);
      setTotalUsers(Number(payload.total || 0));
      setTotalPages(Math.max(1, Number(payload.totalPages || 1)));
      setSummary(
        payload.summary || {
          totalUsers: 0,
          activeUsers: 0,
          primeUsers: 0,
          roles: {},
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, primeFilter, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const currentPage = Math.min(page, totalPages);

  /* role summary */
  const roleSummary = summary.roles;

  const activeCount = summary.activeUsers;
  const primeCount = summary.primeUsers;

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter || primeFilter);

  const applySummaryFilter = (filter: "all" | "active" | "prime" | `role:${string}`) => {
    if (filter === "all") {
      setPage(1);
      setRoleFilter("");
      setStatusFilter("");
      setPrimeFilter("");
      return;
    }
    if (filter === "active") {
      setPage(1);
      setRoleFilter("");
      setPrimeFilter("");
      setStatusFilter((current) => (current === "active" ? "" : "active"));
      return;
    }
    if (filter === "prime") {
      setPage(1);
      setRoleFilter("");
      setStatusFilter("");
      setPrimeFilter((current) => (current === "prime" ? "" : "prime"));
      return;
    }
    setStatusFilter("");
    setPrimeFilter("");
    setPage(1);
    setRoleFilter((current) => {
      const role = filter.replace("role:", "");
      return current === role ? "" : role;
    });
  };

  /* ─── create admin user ──────────────────────────────────────────── */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({ email: "", fullName: "", password: "", role: "ADMIN" });

  const CREATE_ROLES = [
    { value: "ADMIN", label: "Админ" },
    { value: "HR_ADMIN", label: "HR Админ" },
    { value: "CONTENT_ADMIN", label: "Контент Админ" },
    { value: "PARTNER_ADMIN", label: "Партнер Админ" },
    { value: "WAREHOUSE_ADMIN", label: "Агуулах Админ" },
    { value: "FINANCE_ADMIN", label: "Санхүү Админ" },
    { value: "SERVICE_ADMIN", label: "Үйлчилгээ Админ" },
    { value: "LAWYER", label: "Хуульч" },
  ];

  const handleCreateUser = async () => {
    const { email, fullName, password, role } = createForm;
    if (!email.trim() || !fullName.trim() || !password || !role) {
      setCreateError("Бүх талбарыг бөглөнө үү");
      return;
    }
    if (password.length < 6) {
      setCreateError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await adminFetch(`${API}/admin/users`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), password, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Хэрэглэгч үүсгэхэд алдаа гарлаа");
      setShowCreateModal(false);
      setCreateForm({ email: "", fullName: "", password: "", role: "ADMIN" });
      loadUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setCreating(false);
    }
  };

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Системийн хэрэглэгчид</h2>
            <p className="text-xs text-slate-400">Бүх хэрэглэгчдийн мэдээлэл, төрөл, статус</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(""); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Шинэ админ
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </button>
        </div>
      </div>

      {/* create admin modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Шинэ админ хэрэглэгч</h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Бүтэн нэр</label>
                <div className="relative">
                  <UserCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Нэр оруулна уу"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Имэйл</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Нууц үг</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Хамгийн багадаа 6 тэмдэгт"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {CREATE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Болих
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Үүсгэх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* total */}
        <button
          type="button"
          onClick={() => applySummaryFilter("all")}
          className={`rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            !roleFilter && !statusFilter && !primeFilter
              ? "border-slate-300 ring-2 ring-slate-100"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{summary.totalUsers}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Нийт</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => applySummaryFilter("active")}
          className={`rounded-2xl border bg-emerald-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === "active"
              ? "border-emerald-300 ring-2 ring-emerald-100"
              : "border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">Идэвхтэй</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => applySummaryFilter("prime")}
          className={`rounded-2xl border bg-amber-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            primeFilter === "prime"
              ? "border-amber-300 ring-2 ring-amber-100"
              : "border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Crown className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700">{primeCount}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Prime</p>
            </div>
          </div>
        </button>
        {Object.entries(SYSTEM_ROLE_META).map(([key, meta]) => {
          const count = roleSummary[key] ?? 0;
          if (!count) return null;
          const Icon = meta.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applySummaryFilter(`role:${key}`)}
              className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${meta.bg} ${
                roleFilter === key ? "ring-2 ring-violet-100" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/60`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${meta.color}`}>{count}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider opacity-60">{meta.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Нэр, имэйл, утас хайх..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-shadow"
          />
        </div>

        {/* role filter */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
              setPrimeFilter("");
            }}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-shadow"
          >
            <option value="">Бүх төрөл</option>
            {Object.entries(SYSTEM_ROLE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as typeof statusFilter);
              setPrimeFilter("");
            }}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-shadow"
          >
            <option value="">Бүх статус</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* results count */}
        <div className="ml-auto flex items-center gap-2">
          <p className="text-xs font-medium text-slate-400">
            {totalUsers} хэрэглэгч {hasActiveFilters ? "(шүүсэн)" : ""}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setStatusFilter("");
                setPrimeFilter("");
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
          )}
        </div>
      </div>

      {/* content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ачаалж байна...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <XCircle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
          <p className="text-sm font-medium text-rose-600">{error}</p>
          <button
            onClick={loadUsers}
            className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {hasActiveFilters ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Хэрэглэгч бүртгэгдээгүй"}
          </p>
        </div>
      ) : (
        <>
          {/* user cards grid */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((u) => (
              <UserCard key={u.id} user={u} onRoleChanged={loadUsers} />
            ))}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-300">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors ${
                        p === currentPage
                          ? "bg-violet-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── user card ────────────────────────────────────────────────────── */
function UserCard({ user, onRoleChanged }: { user: SystemUser; onRoleChanged: () => void }) {
  const meta = SYSTEM_ROLE_META[user.role] ?? SYSTEM_ROLE_META.USER;
  const RoleIcon = meta.icon;
  const initial = user.fullName?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase();
  const emailLabel = displayEmail(user.email);
  const phoneLabel = displayPhone(user.phone);
  const [changingRole, setChangingRole] = useState(false);
  const [changingPrime, setChangingPrime] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [durationMonths, setDurationMonths] = useState(String(DEFAULT_MEMBERSHIP_DURATION_MONTHS));
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const activeMember = isMembershipActive(user);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === user.role) { setRoleMenuOpen(false); return; }
    setChangingRole(true);
    setRoleMenuOpen(false);
    try {
      const res = await adminFetch(`${API}/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Role солиход алдаа гарлаа");
        return;
      }
      onRoleChanged();
    } catch {
      alert("Role солиход алдаа гарлаа");
    } finally {
      setChangingRole(false);
    }
  };

  const updateMembership = async (
    isPrime: boolean,
    options?: { durationMonths?: number; expiresAt?: string },
  ) => {
    setChangingPrime(true);
    try {
      const res = await adminFetch(`${API}/admin/users/${user.id}/prime`, {
        method: "PATCH",
        body: JSON.stringify({ isPrime, ...options }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Membership эрх солиход алдаа гарлаа");
        return;
      }
      setMemberMenuOpen(false);
      onRoleChanged();
    } catch {
      alert("Membership эрх солиход алдаа гарлаа");
    } finally {
      setChangingPrime(false);
    }
  };

  const grantMembership = () => {
    if (durationMonths === "custom") {
      if (!customExpiresAt) {
        alert("Дуусах огноо сонгоно уу");
        return;
      }
      updateMembership(true, { expiresAt: customExpiresAt });
      return;
    }

    const months = Number(durationMonths) || DEFAULT_MEMBERSHIP_DURATION_MONTHS;
    updateMembership(true, { durationMonths: months });
  };

  const selectedDurationLabel =
    durationMonths === "custom"
      ? customExpiresAt
        ? formatDate(customExpiresAt)
        : "Огноо сонгоно"
      : MEMBERSHIP_DURATION_OPTIONS.find(
          (option) => String(option.months) === durationMonths,
        )?.label || "1 сар";

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md hover:border-slate-300">
      {/* status dot */}
      <div
        className={`absolute top-4 right-4 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
          user.isActive ? "bg-emerald-400" : "bg-slate-300"
        }`}
        title={user.isActive ? "Идэвхтэй" : "Идэвхгүй"}
      />

      {/* top */}
      <div className="flex items-start gap-3.5">
        {/* avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.bg} border`}>
            <span className={`text-base font-bold ${meta.color}`}>{initial}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {user.fullName || "Нэргүй"}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{emailLabel}</span>
          </div>
          {phoneLabel && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{phoneLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* divider */}
      <div className="my-3.5 border-t border-slate-100" />

      {/* meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* role badge — clickable */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleMenuOpen((v) => !v)}
            disabled={changingRole}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${meta.bg} ${meta.color} ${changingRole ? "opacity-50" : ""}`}
            title="Role солих"
          >
            {changingRole ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RoleIcon className="h-3 w-3" />
            )}
            {meta.label}
            <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
          </button>
          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {Object.entries(SYSTEM_ROLE_META).map(([key, rm]) => {
                  const Icon = rm.icon;
                  const isActive = key === user.role;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleRoleChange(key)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? `${rm.bg} ${rm.color}`
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {rm.label}
                      {isActive && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setDurationMonths(String(DEFAULT_MEMBERSHIP_DURATION_MONTHS));
              setCustomExpiresAt("");
              setMemberMenuOpen((value) => !value);
            }}
            disabled={changingPrime}
            className={`inline-flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
              activeMember
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : user.isPrime
                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-amber-50 hover:text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
            }`}
            title={
              activeMember
                ? "Membership хугацаа сунгах / цуцлах"
                : "Membership эрх өгөх"
            }
          >
            {changingPrime ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Crown className="h-3 w-3" />
            )}
            {activeMember ? "Member" : user.isPrime ? "Сунгах" : "Member болгох"}
          </button>

          {memberMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMemberMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-amber-200 bg-white p-3 shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                  {activeMember ? "Member сунгах" : "Member хугацаа"}
                </p>
                {activeMember && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Одоогийн хугацаа: {membershipStatusText(user)}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {MEMBERSHIP_DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.months}
                      type="button"
                      onClick={() => setDurationMonths(String(option.months))}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                        durationMonths === String(option.months)
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDurationMonths("custom")}
                    className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                      durationMonths === "custom"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Огноо
                  </button>
                </div>
                {durationMonths === "custom" && (
                  <input
                    type="date"
                    value={customExpiresAt}
                    onChange={(event) => setCustomExpiresAt(event.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  />
                )}
                <button
                  type="button"
                  onClick={grantMembership}
                  disabled={changingPrime}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {changingPrime && <Loader2 className="h-4 w-4 animate-spin" />}
                  {activeMember
                    ? `${selectedDurationLabel}-ээр сунгах`
                    : `${selectedDurationLabel}-ийн эрх олгох`}
                </button>
                {activeMember && (
                  <button
                    type="button"
                    onClick={() => updateMembership(false)}
                    disabled={changingPrime}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Member эрх цуцлах
                  </button>
                )}
                {user.isPrime && !activeMember && (
                  <p className="mt-2 text-xs font-semibold text-rose-500">
                    Өмнөх member хугацаа дууссан байна.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {user.emailVerified && (
          <span className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Баталгаажсан
          </span>
        )}
      </div>

      {/* bottom row */}
      {(user.isPrime || user.membershipExpiresAt) && (
        <div
          className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold ${
            activeMember
              ? "bg-amber-50 text-amber-700"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>{membershipStatusText(user)}</span>
          {user.membershipExpiresAt && (
            <span className="ml-auto text-[10px] opacity-70">
              {formatDate(user.membershipExpiresAt)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end text-[11px] text-slate-400">
        <span className="flex items-center gap-1 shrink-0">
          {user.lastLoginAt ? (
            <>
              <Clock className="h-3 w-3" />
              {timeAgo(user.lastLoginAt)}
            </>
          ) : (
            <>
              <CalendarDays className="h-3 w-3" />
              {formatDate(user.createdAt)}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
