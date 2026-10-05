"use client";

import { useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { VendorLoginAccountSelector } from "../partners/VendorLoginAccountSelector";
import { assignableVendorLoginRoles, type PersonalAccountOption, type VendorLoginRole } from "../partners/vendor-login-types";
import type { BusinessAppControl } from "./mgl-business.model";

export function BusinessMemberAdd({ organization, disabled, onSavingChange, onAdded }: {
  organization: BusinessAppControl;
  disabled: boolean;
  onSavingChange: (saving: boolean) => void;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<PersonalAccountOption | null>(null);
  const [role, setRole] = useState<VendorLoginRole>("STAFF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const memberIds = useMemo(() => organization.members.map(member => member.userId), [organization.members]);
  const atLimit = organization.activeMembers >= organization.maxMembers;

  async function addMember() {
    if (!account || disabled || saving || atLimit) return;
    setSaving(true);
    onSavingChange(true);
    setError("");
    try {
      const response = await adminFetch(`${API}/partners/${encodeURIComponent(organization.id)}/members`, {
        method: "POST",
        body: JSON.stringify({ fullName: account.fullName || account.email, email: account.email, role }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(typeof data === "object" && data !== null && "message" in data && typeof data.message === "string"
          ? data.message : "Ажилтан нэмэхэд алдаа гарлаа.");
      }
      setOpen(false);
      setAccount(null);
      setSaved(true);
      await onAdded();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Ажилтан нэмэхэд алдаа гарлаа.");
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-slate-950">Ажилтны удирдлага</h3>
        <p className="mt-1 text-sm text-slate-500">{organization.name} · {organization.activeMembers} / {organization.maxMembers} ажилтан</p>
      </div>
      <button type="button" disabled={disabled || saving || atLimit} aria-expanded={open}
        onClick={() => { setOpen(!open); setSaved(false); setError(""); }}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50">
        <UserPlus size={18} />Ажилтан нэмэх
      </button>
    </div>
    {disabled && <p className="mt-3 text-sm text-amber-700">Эхлээд байгууллагын тохиргоог хадгална уу.</p>}
    {atLimit && <p className="mt-3 text-sm text-amber-700">Ажилтны лимит дүүрсэн. Нэмэхийн өмнө лимитээ өсгөж хадгална уу.</p>}
    {saved && <p role="status" className="mt-3 text-sm text-emerald-700">Ажилтан нэмэгдлээ. Доорх хэсгээс аппын эрхийг онооно уу.</p>}
    {open && <fieldset disabled={disabled || saving} className="mt-5 space-y-4">
      <legend className="sr-only">Байгууллагад ажилтан нэмэх</legend>
      <VendorLoginAccountSelector selectedAccount={account} onSelectedAccountChange={setAccount}
        role={role} onRoleChange={setRole} disabledUserIds={memberIds} allowedRoles={assignableVendorLoginRoles}
        title="Хэрэглэгч хайж сонгох" description="Нэр, утас эсвэл имэйлээр бүртгэлтэй хэрэглэгчийг хайна."
        badge="Ажилтан" roleDescription="Менежер ажилтан нэмнэ. Аппын тусгай эрхийг доорх эрхийн хэсгээс удирдана." autoFocus />
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!account || atLimit || saving} onClick={() => void addMember()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50">
          {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Нэмж байна…" : "Байгууллагад нэмэх"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">Болих</button>
      </div>
    </fieldset>}
  </section>;
}
