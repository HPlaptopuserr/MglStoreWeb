"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from "lucide-react";
import { API } from "@/lib/api";

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

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "CASHIER",
};

const ROLES = [
  { value: "CASHIER", label: "Кассчин" },
  { value: "DRIVER", label: "Жолооч" },
  { value: "STAFF", label: "Ажилтан" },
  { value: "ADMIN", label: "Менежер" },
  { value: "VIEWER", label: "Ажиглагч" },
];

const ROLE_COLORS: Record<string, string> = {
  CASHIER: "bg-violet-100 text-violet-700",
  DRIVER: "bg-sky-100 text-sky-700",
  STAFF: "bg-slate-100 text-slate-700",
  ADMIN: "bg-amber-100 text-amber-700",
  VIEWER: "bg-green-100 text-green-700",
  OWNER: "bg-rose-100 text-rose-700",
};

/* ─── component ──────────────────────────────────────────────────────── */
export function HrSection() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [members, setMembers] = useState<StaffMember[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* load orgs */
  useEffect(() => {
    fetch(`${API}/partners?status=APPROVED`)
      .then((r) => r.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => setOrgs([]))
      .finally(() => setLoadingOrgs(false));
  }, []);

  /* load members */
  const loadMembers = useCallback((orgId: string) => {
    if (!orgId) return;
    setLoadingMembers(true);
    fetch(`${API}/admin/organizations/${orgId}/staff`)
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  useEffect(() => {
    if (selectedOrgId) loadMembers(selectedOrgId);
    else setMembers([]);
  }, [selectedOrgId, loadMembers]);

  /* create member */
  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError("Нэр болон имэйл шаардлагатай");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`${API}/admin/organizations/${selectedOrgId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password.trim() || undefined,
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Алдаа гарлаа");
      setFormOpen(false);
      setForm(EMPTY_FORM);
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
      const res = await fetch(
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
      const res = await fetch(
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
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900">Хүний нөөц — Ажилтны бүртгэл</h2>
        </div>

        {selectedOrgId && (
          <button
            type="button"
            onClick={() => { setFormOpen(true); setFormError(""); setForm(EMPTY_FORM); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Ажилтан нэмэх
          </button>
        )}
      </div>

      {/* org selector */}
      <div className="relative max-w-xs">
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

      {/* add modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Шинэ ажилтан бүртгэх</h3>
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

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Нэр <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Нэр оруулах"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Имэйл <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Утасны дугаар</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="99112233"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Нууц үг <span className="text-slate-400">(заавал биш)</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Нууц үг оруулах"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Албан тушаал</label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
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
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
