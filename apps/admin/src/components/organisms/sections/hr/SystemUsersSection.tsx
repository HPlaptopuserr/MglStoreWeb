"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  memberships: { role: string; isActive: boolean; isPrimary?: boolean; orgId?: string; orgName: string }[];
  createdAt: string;
};

/* ─── constants ────────────────────────────────────────────────────── */
const SYSTEM_ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ADMIN: { label: "Админ", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: ShieldCheck },
  USER:  { label: "Хэрэглэгч", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: UserCog },
};

const ORG_ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OWNER:   { label: "Эзэмшигч", color: "text-violet-700",  bg: "bg-violet-50 border-violet-200", icon: Building2 },
  ADMIN:   { label: "Менежер",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     icon: ShieldCheck },
  STAFF:   { label: "Ажилтан",   color: "text-slate-600",   bg: "bg-slate-50 border-slate-200",   icon: UserCog },
  VIEWER:  { label: "Ажиглагч",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",icon: UserCircle },
};

const ITEMS_PER_PAGE = 15;

/* ─── helpers ──────────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "short", day: "numeric" });
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

/* ─── component ────────────────────────────────────────────────────── */
export function SystemUsersSection() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);

  /* fetch users */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`${API}/admin/users`);
      if (!res.ok) throw new Error("Хэрэглэгчдийн мэдээлэл ачаалахад алдаа гарлаа");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  /* filtered + paginated */
  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          (u.phone?.includes(q) ?? false),
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") list = list.filter((u) => u.isActive);
    if (statusFilter === "inactive") list = list.filter((u) => !u.isActive);
    return list;
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* role summary */
  const roleSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;
    return counts;
  }, [users]);

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

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
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{users.length}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Нийт</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">Идэвхтэй</p>
            </div>
          </div>
        </div>
        {Object.entries(SYSTEM_ROLE_META).map(([key, meta]) => {
          const count = roleSummary[key] ?? 0;
          if (!count) return null;
          const Icon = meta.icon;
          return (
            <div key={key} className={`rounded-2xl border p-4 ${meta.bg}`}>
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/60`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${meta.color}`}>{count}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider opacity-60">{meta.label}</p>
                </div>
              </div>
            </div>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Нэр, имэйл, утас хайх..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-shadow"
          />
        </div>

        {/* role filter */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-shadow"
          >
            <option value="">Бүх статус</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* results count */}
        <p className="text-xs font-medium text-slate-400 ml-auto">
          {filtered.length} хэрэглэгч {search || roleFilter || statusFilter ? "(шүүсэн)" : ""}
        </p>
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
      ) : paged.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {search || roleFilter || statusFilter ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Хэрэглэгч бүртгэгдээгүй"}
          </p>
        </div>
      ) : (
        <>
          {/* user cards grid */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paged.map((u) => (
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
  const [changingRole, setChangingRole] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

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
            <span className="truncate">{user.email}</span>
          </div>
          {user.phone && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{user.phone}</span>
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

        {/* verified */}
        {user.emailVerified && (
          <span className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Баталгаажсан
          </span>
        )}
      </div>

      {/* bottom row */}
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
