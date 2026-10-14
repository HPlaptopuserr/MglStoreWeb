"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import { memberApi } from "./member-api";
import {
  CAPABILITY_OPTIONS,
  assignableRoles,
  canManageMember,
  canManageMembers,
  capabilityLabel,
  roleLabel,
  type MemberCapability,
  type MemberRole,
  type OrganizationMember,
} from "./member-types";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Үйлдлийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.";
}

function initials(name: string, email: string) {
  const value = name.trim() || email.trim();
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function RoleBadge({ role }: { role: MemberRole }) {
  const className = {
    OWNER: "border-violet-200 bg-violet-50 text-violet-700",
    ADMIN: "border-blue-200 bg-blue-50 text-blue-700",
    STAFF: "border-emerald-200 bg-emerald-50 text-emerald-700",
    VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
  }[role];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold ${active ? "text-emerald-700" : "text-slate-400"}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {active ? "Идэвхтэй" : "Идэвхгүй"}
    </span>
  );
}

function Notice({
  kind,
  children,
  onClose,
}: {
  kind: "success" | "error";
  children: ReactNode;
  onClose?: () => void;
}) {
  const success = kind === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <span className="flex-1 leading-5">{children}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 transition hover:bg-black/5"
          aria-label="Мэдэгдэл хаах"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Цонх хаах"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-modal-title"
        className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
          <div className="flex-1">
            <h2 id="member-modal-title" className="text-xl font-black text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function CapabilityPicker({
  value,
  disabled,
  onChange,
}: {
  value: MemberCapability[];
  disabled?: boolean;
  onChange: (value: MemberCapability[]) => void;
}) {
  const toggle = (capability: MemberCapability) => {
    onChange(
      value.includes(capability)
        ? value.filter((item) => item !== capability)
        : [...value, capability],
    );
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {CAPABILITY_OPTIONS.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(option.value)}
            className={`flex min-h-20 items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                selected
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span>
              <span className="block text-sm font-black text-slate-800">
                {option.label}
              </span>
              <span className="mt-1 block text-xs font-semibold leading-4 text-slate-500">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AddMemberDialog({
  organizationId,
  actorRole,
  onClose,
  onSaved,
}: {
  organizationId: string;
  actorRole?: string | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const roles = assignableRoles(actorRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>(roles[0]?.value || "STAFF");
  const [capabilities, setCapabilities] = useState<MemberCapability[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim()) {
      setError("Ажилтны нэр болон login имэйлийг оруулна уу.");
      return;
    }
    if (password && password.trim().length < 8) {
      setError("Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна.");
      return;
    }

    setSaving(true);
    try {
      await memberApi.create({
        organizationId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password: password || undefined,
        role,
        department: department.trim() || undefined,
        capabilities: role === "VIEWER" ? [] : capabilities,
      });
      await onSaved(`${fullName.trim()} ажилтнаар нэмэгдлээ.`);
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Ажилтан нэмэх"
      description="Login мэдээлэл, байгууллагын role болон хийх ажлын эрхийг тохируулна."
      onClose={saving ? () => undefined : onClose}
    >
      <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
        {error ? <Notice kind="error">{error}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ажилтны нэр">
            <input
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder="Овог нэр"
            />
          </Field>
          <Field label="Хэлтэс / албан тушаал">
            <input
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder="Жишээ: Касс, Борлуулалт"
            />
          </Field>
          <Field label="Login имэйл">
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder="employee@company.mn"
            />
          </Field>
          <Field label="Утас">
            <input
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder="99112233"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Шинэ login-ийн нууц үг">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
                className={inputClass}
                placeholder="Шинэ хэрэглэгч бол 8-аас дээш тэмдэгт"
              />
            </Field>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              Имэйл нь MGL Store-д бүртгэлтэй бол тухайн бүртгэлийг холбоно.
              Хувийн нууц үг болон profile мэдээллийг өөрчлөхгүй.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Байгууллагын role
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {roles.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => {
                  setRole(option.value);
                  if (option.value === "VIEWER") setCapabilities([]);
                }}
                className={`rounded-2xl border p-3 text-left transition ${
                  role === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-black">{option.label}</span>
                <span
                  className={`mt-1 block text-xs font-semibold leading-4 ${
                    role === option.value ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Тусгай ажлын эрх
            </p>
            {role === "VIEWER" ? (
              <span className="text-xs font-bold text-amber-600">
                Ажиглагчид нэмэлт эрх олгохгүй
              </span>
            ) : null}
          </div>
          <CapabilityPicker
            value={capabilities}
            disabled={saving || role === "VIEWER"}
            onChange={setCapabilities}
          />
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Нэмж байна..." : "Ажилтан нэмэх"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function EditMemberDialog({
  member,
  actorRole,
  onClose,
  onSaved,
}: {
  member: OrganizationMember;
  actorRole?: string | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const roles = assignableRoles(actorRole);
  const [role, setRole] = useState<MemberRole>(member.role);
  const [department, setDepartment] = useState(member.department || "");
  const [capabilities, setCapabilities] = useState<MemberCapability[]>(
    member.capabilities,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (role !== member.role) await memberApi.changeRole(member.id, role);
      await memberApi.update(member.id, {
        department: department.trim() || null,
        capabilities: role === "VIEWER" ? [] : capabilities,
      });
      await onSaved(`${member.fullName || member.email}-ийн эрх шинэчлэгдлээ.`);
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    setSaving(true);
    setError("");
    try {
      await memberApi.toggle(member.id);
      await onSaved(
        `${member.fullName || member.email}-ийн эрх ${member.isActive ? "түр хаагдлаа" : "сэргээлээ"}.`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await memberApi.remove(member.id);
      await onSaved(`${member.fullName || member.email} байгууллагаас хасагдлаа.`);
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <Modal
      title="Ажилтны эрх засах"
      description={`${member.fullName || member.email} · ${member.email}`}
      onClose={saving ? () => undefined : onClose}
    >
      <form onSubmit={save} className="space-y-6 p-5 sm:p-6">
        {error ? <Notice kind="error">{error}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Байгууллагын role">
            <select
              value={role}
              disabled={saving}
              onChange={(event) => {
                const nextRole = event.target.value as MemberRole;
                setRole(nextRole);
                if (nextRole === "VIEWER") setCapabilities([]);
              }}
              className={inputClass}
            >
              {roles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Хэлтэс / албан тушаал">
            <input
              value={department}
              disabled={saving}
              onChange={(event) => setDepartment(event.target.value)}
              className={inputClass}
              placeholder="Жишээ: Касс, Борлуулалт"
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Тусгай ажлын эрх
            </p>
            {role === "VIEWER" ? (
              <span className="text-xs font-bold text-amber-600">
                Ажиглагчид нэмэлт эрх олгохгүй
              </span>
            ) : null}
          </div>
          <CapabilityPicker
            value={capabilities}
            disabled={saving || role === "VIEWER"}
            onChange={setCapabilities}
          />
        </div>

        {confirmRemove ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-black text-rose-800">
              Энэ ажилтныг байгууллагаас бүр мөсөн хасах уу?
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-rose-600">
              Хувийн MGL Store бүртгэл устахгүй. Зөвхөн энэ байгууллагын холбоос,
              role болон ажлын эрхүүд хасагдана.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void remove()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Тийм, хасах
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmRemove(false)}
                className="h-10 rounded-xl border border-rose-200 bg-white px-4 text-xs font-black text-rose-700"
              >
                Болих
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">Ажиллах төлөв</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Түр хаахад login хэвээр үлдэж, байгууллагад нэвтрэх боломжгүй болно.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleStatus()}
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition disabled:opacity-50 ${
                member.isActive
                  ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {member.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              {member.isActive ? "Эрх түр хаах" : "Эрх сэргээх"}
            </button>
          </div>
        )}

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          {!confirmRemove ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmRemove(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Байгууллагаас хасах
            </button>
          ) : null}
          <div className="flex flex-1 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={saving || confirmRemove}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}

export default function MembersScreen() {
  const { user } = useOrg();
  const organizationId = user.organizationId || "";
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OrganizationMember | null>(null);
  const [notice, setNotice] = useState("");
  const manageable = canManageMembers(user.orgRole);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) return;
      setLoading(true);
      setError("");
      try {
        setMembers(await memberApi.list(organizationId, signal));
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(errorMessage(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return members.filter((member) => {
      const statusMatches =
        filter === "ALL" || member.isActive === (filter === "ACTIVE");
      if (!statusMatches) return false;
      if (!term) return true;
      const searchable = [
        member.fullName,
        member.email,
        member.phone || "",
        member.department || "",
        roleLabel(member.role),
        ...member.capabilities.map(capabilityLabel),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(term);
    });
  }, [filter, members, query]);

  const summary = useMemo(
    () => ({
      total: members.length,
      active: members.filter((member) => member.isActive).length,
      managers: members.filter(
        (member) => member.role === "OWNER" || member.role === "ADMIN",
      ).length,
      inactive: members.filter((member) => !member.isActive).length,
    }),
    [members],
  );

  const saved = async (message: string) => {
    setAdding(false);
    setEditing(null);
    setNotice(message);
    await load();
  };

  const summaryCards = [
    { label: "Нийт ажилтан", value: summary.total, icon: Users, color: "text-slate-700 bg-slate-100" },
    { label: "Идэвхтэй", value: summary.active, icon: UserCheck, color: "text-emerald-700 bg-emerald-100" },
    { label: "Удирдах эрхтэй", value: summary.managers, icon: ShieldCheck, color: "text-indigo-700 bg-indigo-100" },
    { label: "Идэвхгүй", value: summary.inactive, icon: UserX, color: "text-amber-700 bg-amber-100" },
  ];

  return (
    <section aria-labelledby="members-title" className="space-y-6 pb-8">
      <header>
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Байгууллага</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Ажилтан ба эрх</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 id="members-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Ажилтан ба эрх
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                {roleLabel((user.orgRole || "VIEWER") as MemberRole)}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Багийн гишүүд, login төлөв, байгууллагын role болон хийх ажлын тусгай эрхийг нэг дор удирдана.
            </p>
          </div>
          {manageable ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={loading || Boolean(error)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              Ажилтан нэмэх
            </button>
          ) : null}
        </div>
      </header>

      {notice ? (
        <Notice kind="success" onClose={() => setNotice("")}>
          {notice}
        </Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{loading ? "—" : item.value}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:items-center sm:px-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-black text-slate-800">Role ба ажлын эрх тусдаа</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Role нь байгууллага дахь түвшинг, ажлын эрх нь POS, бараа, захиалга, хүргэлтийн хийх үйлдлийг тодорхойлно.
          </p>
        </div>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Нэр, имэйл, утас, албан тушаал..."
            />
          </div>
          <div className="flex items-center gap-2">
            {(["ALL", "ACTIVE", "INACTIVE"] as StatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`h-10 rounded-xl px-3 text-xs font-black transition ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {{ ALL: "Бүгд", ACTIVE: "Идэвхтэй", INACTIVE: "Идэвхгүй" }[value]}
              </button>
            ))}
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              aria-label="Жагсаалт шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-5">
            <Notice kind="error">{error}</Notice>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white"
            >
              <RefreshCw className="h-4 w-4" /> Дахин оролдох
            </button>
          </div>
        ) : loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Ажилтнуудыг ачаалж байна...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserRound className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-base font-black text-slate-800">
              {members.length === 0 ? "Ажилтан бүртгэгдээгүй байна" : "Хайлтад тохирох ажилтан алга"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {members.length === 0 && manageable
                ? "Эхний ажилтнаа нэмээд role болон ажлын эрхийг тохируулна уу."
                : "Хайлт эсвэл төлөвийн шүүлтүүрээ өөрчилнө үү."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((member) => {
              const editable = canManageMember(
                user.orgRole,
                user.id,
                member,
              );
              return (
                <article
                  key={member.id}
                  className={`grid gap-4 p-4 transition sm:grid-cols-[minmax(220px,1.25fr)_minmax(150px,.7fr)_minmax(210px,1fr)_auto] sm:items-center sm:px-5 ${
                    member.isActive ? "hover:bg-slate-50/70" : "bg-slate-50/60 opacity-75"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white">
                      {initials(member.fullName, member.email) || "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-900">
                          {member.fullName || "Нэргүй хэрэглэгч"}
                        </h3>
                        {member.userId === user.id ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">Та</span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{member.email}</p>
                      {member.phone ? (
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">{member.phone}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleBadge role={member.role} />
                      <StatusBadge active={member.isActive} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {member.department || "Албан тушаал оруулаагүй"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {member.capabilities.length ? (
                      member.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600"
                        >
                          {capabilityLabel(capability)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Нэмэлт ажлын эрхгүй
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => setEditing(member)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Засах
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        {member.role === "OWNER" ? "Системийн үндсэн эрх" : "Зөвхөн харах"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!manageable ? (
        <p className="text-center text-xs font-semibold text-slate-400">
          Ажилтан болон эрхийг зөвхөн эзэмшигч эсвэл менежер өөрчилнө.
        </p>
      ) : null}

      {adding ? (
        <AddMemberDialog
          organizationId={organizationId}
          actorRole={user.orgRole}
          onClose={() => setAdding(false)}
          onSaved={saved}
        />
      ) : null}
      {editing ? (
        <EditMemberDialog
          member={editing}
          actorRole={user.orgRole}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      ) : null}
    </section>
  );
}
