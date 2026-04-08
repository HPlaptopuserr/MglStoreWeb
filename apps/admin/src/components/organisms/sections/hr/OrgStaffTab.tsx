"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  X,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  UserCircle,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

/* ─── types ──────────────────────────────────────────────────────────── */
type Org = { id: string; name: string; slug: string };

type StaffMember = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
};

type SystemUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  organizationName: string | null;
};

const ROLES = [
  { value: "STAFF", label: "Ажилтан" },
  { value: "ADMIN", label: "Менежер" },
  { value: "VIEWER", label: "Ажиглагч" },
];

const ROLE_COLORS: Record<string, string> = {
  STAFF: "bg-slate-100 text-slate-700",
  ADMIN: "bg-amber-100 text-amber-700",
  VIEWER: "bg-green-100 text-green-700",
  OWNER: "bg-rose-100 text-rose-700",
};

/* ─── component ──────────────────────────────────────────────────────── */
export function OrgStaffTab() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [members, setMembers] = useState<StaffMember[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [staffRole, setStaffRole] = useState("STAFF");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* user search */
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* load system users for picker */
  const loadSystemUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminFetch(`${API}/admin/users`);
      if (!res.ok) return;
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  /* filtered user list (exclude already-assigned members) */
  const filteredUsers = useMemo(() => {
    const memberUserIds = new Set(members.map((m) => m.userId));
    let list = allUsers.filter((u) => !memberUserIds.has(u.id));
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone?.includes(q) ?? false),
      );
    }
    return list.slice(0, 20);
  }, [allUsers, members, userSearch]);

  /* load orgs */
  useEffect(() => {
    adminFetch(`${API}/partners?status=APPROVED`)
      .then((r) => r.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => setOrgs([]))
      .finally(() => setLoadingOrgs(false));
  }, []);

  /* load members */
  const loadMembers = useCallback((orgId: string) => {
    if (!orgId) return;
    setLoadingMembers(true);
    adminFetch(`${API}/admin/organizations/${orgId}/staff`)
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  useEffect(() => {
    if (selectedOrgId) loadMembers(selectedOrgId);
    else setMembers([]);
  }, [selectedOrgId, loadMembers]);

  /* create member from selected user */
  const handleCreate = async () => {
    if (!selectedUser) {
      setFormError("Хэрэглэгч сонгоно уу");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await adminFetch(`${API}/admin/organizations/${selectedOrgId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: selectedUser.fullName || selectedUser.email,
          email: selectedUser.email,
          phone: selectedUser.phone || undefined,
          role: staffRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Алдаа гарлаа");
      setFormOpen(false);
      setSelectedUser(null);
      setUserSearch("");
      setStaffRole("CASHIER");
      loadMembers(selectedOrgId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  /* toggle active */
  const handleToggle = async (memberId: string) => {
    try {
      const res = await adminFetch(
        `${API}/admin/organizations/${selectedOrgId}/staff/${memberId}/toggle`,
        { method: "PATCH" },
      );
      if (!res.ok) return;
      const updated = await res.json();
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isActive: updated.isActive } : m)),
      );
    } catch {
      /* ignore */
    }
  };

  /* delete member */
  const handleDelete = async (memberId: string) => {
    try {
      const res = await adminFetch(
        `${API}/admin/organizations/${selectedOrgId}/staff/${memberId}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setConfirmDeleteId(null);
    } catch {
      /* ignore */
    }
  };

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* org selector + add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <option value="">
              {loadingOrgs ? "Ачаалж байна..." : "— Байгууллага сонгох —"}
            </option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {selectedOrgId && (
          <button
            type="button"
            onClick={() => { setFormOpen(true); setFormError(""); setSelectedUser(null); setUserSearch(""); setStaffRole("CASHIER"); loadSystemUsers(); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Ажилтан нэмэх
          </button>
        )}
      </div>

      {/* members table */}
      {selectedOrgId && (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {loadingMembers ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ачаалж байна...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Бүртгэлтэй ажилтан байхгүй байна.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Нэр</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Имэйл</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Утас</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Эрх</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Төлөв</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.fullName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="px-4 py-3 text-slate-600">{m.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[m.role] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {m.roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(m.id)}
                        className="flex items-center gap-1 text-xs font-medium"
                        title="Идэвхжүүлэх / идэвхгүй болгох"
                      >
                        {m.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                            <span className="text-emerald-600">Идэвхтэй</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-slate-400" />
                            <span className="text-slate-400">Идэвхгүй</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === m.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-500">Устгах уу?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            className="rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Тийм
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                          >
                            Үгүй
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedOrgId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Байгууллага сонгоод ажилтнуудын жагсаалтыг харна уу
          </p>
        </div>
      )}

      {/* add modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Ажилтан нэмэх</h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {formError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</p>
              )}

              {/* selected user preview */}
              {selectedUser ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <span className="text-sm font-bold text-violet-700">
                      {selectedUser.fullName?.charAt(0)?.toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{selectedUser.fullName || "Нэргүй"}</p>
                    <p className="truncate text-xs text-slate-500">{selectedUser.email}</p>
                    {selectedUser.phone && (
                      <p className="text-xs text-slate-400">{selectedUser.phone}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                    className="rounded p-1 text-slate-400 hover:text-rose-500"
                    title="Өөр хэрэглэгч сонгох"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* user search & pick */
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Хэрэглэгч сонгох <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Нэр, имэйл, утсаар хайх..."
                      className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                      autoFocus
                    />
                  </div>

                  {/* user list */}
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ачаалж байна...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        {userSearch ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Хэрэглэгч байхгүй"}
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserSearch(""); }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <span className="text-xs font-bold text-slate-600">
                              {u.fullName?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{u.fullName || "Нэргүй"}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="truncate">{u.email}</span>
                              {u.phone && (
                                <>
                                  <span>·</span>
                                  <span>{u.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {u.role}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* role selector */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Албан тушаал</label>
                <div className="relative">
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !selectedUser}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Нэмэх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
