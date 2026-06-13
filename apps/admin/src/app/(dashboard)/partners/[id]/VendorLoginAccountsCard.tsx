"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { VendorLoginContextOverview } from "./VendorLoginContextOverview";

type VendorLoginMember = {
  id: string;
  userId: string;
  role: string;
  isPrimary?: boolean;
  memberActive?: boolean;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  canLogin?: boolean;
  loginIdentifier?: string | null;
  accountContext?: string | null;
  lastLoginAt?: string | null;
};

type PartnerForLoginAccounts = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  members?: VendorLoginMember[];
  stats?: {
    users?: number;
  };
};

type PersonalAccountOption = {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
};

type Props = {
  partner: PartnerForLoginAccounts;
  onMembersUpdated: (members: VendorLoginMember[]) => void;
};

const roleLabel: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

const assignableRoles = ["ADMIN", "STAFF", "VIEWER"] as const;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizePhoneInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits.startsWith("976") && digits.length === 11
    ? digits.slice(3)
    : digits;
};

async function readJsonResponse(response: Response) {
  const responseText = await response.text().catch(() => "");
  let data: any = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {}
  return { data, responseText };
}

function getInitials(member: VendorLoginMember) {
  const base = member.fullName || member.email || "?";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function FieldLine({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  muted?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="break-all text-sm font-bold text-slate-900">
        {value || <span className="text-slate-400">{muted || "Оруулаагүй"}</span>}
      </p>
    </div>
  );
}

function MemberStatusPill({ member }: { member: VendorLoginMember }) {
  const active = member.isActive && member.memberActive !== false;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-rose-100 text-rose-800"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-600" : "bg-rose-600"
        }`}
      />
      {active ? "Нэвтрэх эрхтэй" : "Идэвхгүй"}
    </span>
  );
}

export function VendorLoginAccountsCard({ partner, onMembersUpdated }: Props) {
  const members = partner.members ?? [];
  const primaryOwner = useMemo(
    () => members.find((member) => member.isPrimary || member.role === "OWNER") ?? members[0],
    [members],
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [grantNotice, setGrantNotice] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<PersonalAccountOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<PersonalAccountOption | null>(null);
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(
    null,
  );
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string>>({});
  const [phoneNotice, setPhoneNotice] = useState("");
  const [grantForm, setGrantForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: members.length === 0 ? "OWNER" : "ADMIN",
  });

  useEffect(() => {
    if (!grantOpen) return;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({ page: "1", limit: "20" });
        const query = userSearch.trim();
        if (query) params.set("search", query);
        const res = await adminFetch(`${API}/admin/users?${params.toString()}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;

        const memberUserIds = new Set(members.map((member) => member.userId));
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        setUserResults(
          items
            .filter((item: PersonalAccountOption) => !memberUserIds.has(item.id))
            .slice(0, 8),
        );
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [grantOpen, members, userSearch]);

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const resetPassword = async (member: VendorLoginMember) => {
    if (!confirm(`${member.fullName || member.email} хэрэглэгчийн нууц үгийг шинэчлэх үү?`)) return;
    const key = `reset:${member.userId}`;
    setBusyAction(key);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/members/${member.userId}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Нууц үг шинэчлэхэд алдаа гарлаа");
      setTempPasswords((prev) => ({ ...prev, [member.userId]: data.tempPassword }));
      setVisibleSecrets((prev) => ({ ...prev, [`password:${member.userId}`]: true }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Нууц үг шинэчлэхэд алдаа гарлаа");
    } finally {
      setBusyAction(null);
    }
  };

  const generateInviteLink = async (member: VendorLoginMember) => {
    const key = `invite:${member.userId}`;
    setBusyAction(key);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/members/${member.userId}/invite-link`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Invite link үүсгэхэд алдаа гарлаа");
      setInviteLinks((prev) => ({ ...prev, [member.userId]: data.inviteLink }));
      setVisibleSecrets((prev) => ({ ...prev, [`invite:${member.userId}`]: true }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Invite link үүсгэхэд алдаа гарлаа");
    } finally {
      setBusyAction(null);
    }
  };

  const makeOwner = async (member: VendorLoginMember) => {
    if (!confirm(`${member.fullName || member.email} хэрэглэгчийг owner болгох уу?`)) return;
    const key = `owner:${member.userId}`;
    setBusyAction(key);
    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/members/${member.userId}/owner`, {
        method: "PATCH",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Owner солиход алдаа гарлаа");
      onMembersUpdated(data.members ?? []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Owner солиход алдаа гарлаа");
    } finally {
      setBusyAction(null);
    }
  };

  const changeRole = async (member: VendorLoginMember, role: string) => {
    if (role === member.role) return;
    const key = `role:${member.userId}`;
    setBusyAction(key);
    try {
      const res = await adminFetch(
        `${API}/partners/${partner.id}/members/${member.userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Role солиход алдаа гарлаа");
      onMembersUpdated(data.members ?? []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Role солиход алдаа гарлаа");
    } finally {
      setBusyAction(null);
    }
  };

  const startPhoneEdit = (member: VendorLoginMember) => {
    setEditingPhoneUserId(member.userId);
    setPhoneNotice("");
    setPhoneErrors((prev) => ({ ...prev, [member.userId]: "" }));
    setPhoneDrafts((prev) => ({
      ...prev,
      [member.userId]: member.phone || "",
    }));
  };

  const cancelPhoneEdit = (member: VendorLoginMember) => {
    setEditingPhoneUserId(null);
    setPhoneErrors((prev) => ({ ...prev, [member.userId]: "" }));
    setPhoneDrafts((prev) => ({
      ...prev,
      [member.userId]: member.phone || "",
    }));
  };

  const savePhone = async (member: VendorLoginMember) => {
    const draft = phoneDrafts[member.userId] ?? "";
    const normalizedPhone = normalizePhoneInput(draft);

    if (draft.trim() && (normalizedPhone.length < 6 || normalizedPhone.length > 12)) {
      setPhoneErrors((prev) => ({
        ...prev,
        [member.userId]: "Login утас 6-12 оронтой дугаар байх ёстой.",
      }));
      return;
    }

    const key = `phone:${member.userId}`;
    setBusyAction(key);
    setPhoneErrors((prev) => ({ ...prev, [member.userId]: "" }));
    setPhoneNotice("");

    try {
      const res = await adminFetch(
        `${API}/partners/${partner.id}/members/${member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone || null }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Login утас солиход алдаа гарлаа");
      }

      setEditingPhoneUserId(null);
      if (Array.isArray(data?.members)) {
        onMembersUpdated(data.members);
      }
      setPhoneNotice(
        data?.pendingConfirmation
          ? `${data.maskedEmail || member.email || "Login email"} рүү баталгаажуулах холбоос илгээгдлээ. Хэрэглэгч email дээрээс баталгаажуулсны дараа login утас солигдоно.`
          : `${member.fullName || member.email || "Хэрэглэгч"}-ийн login утас шинэчлэгдлээ.`,
      );
    } catch (error) {
      setPhoneErrors((prev) => ({
        ...prev,
        [member.userId]:
          error instanceof Error
            ? error.message
            : "Login утас солиход алдаа гарлаа",
      }));
    } finally {
      setBusyAction(null);
    }
  };

  const selectPersonalAccount = (account: PersonalAccountOption) => {
    setSelectedAccount(account);
    setUserSearch(account.fullName || account.email);
    setGrantError("");
    setGrantNotice("");
    setGrantForm((prev) => ({
      ...prev,
      fullName: account.fullName || account.email,
      email: account.email,
      phone: account.phone || "",
    }));
  };

  const clearSelectedAccount = () => {
    setSelectedAccount(null);
    setUserSearch("");
    setGrantError("");
    setGrantNotice("");
    setGrantForm((prev) => ({
      ...prev,
      fullName: "",
      email: "",
      phone: "",
    }));
  };

  const grantLoginAccess = async () => {
    if (!selectedAccount) {
      setGrantError("Personal account-оос хэрэглэгч хайж сонгоно уу.");
      setGrantNotice("");
      return;
    }
    if (!isValidEmail(grantForm.email)) {
      setGrantError("Login email бүрэн зөв байх ёстой. Жишээ: owner@company.mn");
      setGrantNotice("");
      return;
    }

    const key = "grant-login";
    setBusyAction(key);
    setGrantError("");
    setGrantNotice("");
    const payload = {
      fullName: grantForm.fullName.trim(),
      email: grantForm.email.trim().toLowerCase(),
      phone: grantForm.phone.trim() || null,
      role: grantForm.role,
    };

    try {
      const res = await adminFetch(`${API}/partners/${partner.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { data, responseText } = await readJsonResponse(res);

      const missingNewEndpoint =
        res.status === 404 && responseText.includes("Cannot POST");

      if (missingNewEndpoint) {
        const fallbackRes = await adminFetch(`${API}/admin/organizations/${partner.id}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const fallback = await readJsonResponse(fallbackRes);

        if (!fallbackRes.ok || !fallback.data?.userId) {
          const message =
            fallback.data?.message ||
            fallback.data?.error ||
            fallback.responseText.slice(0, 220) ||
            `HTTP ${fallbackRes.status}`;
          throw new Error(`${message} (${fallbackRes.status})`);
        }

        const newMember: VendorLoginMember = {
          id: fallback.data.memberId,
          userId: fallback.data.userId,
          role: fallback.data.role,
          isPrimary: members.length === 0 || fallback.data.role === "OWNER",
          memberActive: true,
          email: fallback.data.email,
          phone: payload.phone,
          fullName: fallback.data.fullName,
          isActive: true,
          hasPassword: false,
          lastLoginAt: null,
        };

        onMembersUpdated(
          members.length === 0
            ? [{ ...newMember, role: "OWNER", isPrimary: true }]
            : [...members, newMember],
        );

        try {
          const resetRes = await adminFetch(
            `${API}/partners/${partner.id}/members/${fallback.data.userId}/reset-password`,
            { method: "POST" },
          );
          const reset = await resetRes.json().catch(() => null);
          if (resetRes.ok && reset?.tempPassword) {
            setTempPasswords((prev) => ({
              ...prev,
              [fallback.data.userId]: reset.tempPassword,
            }));
            setVisibleSecrets((prev) => ({
              ...prev,
              [`password:${fallback.data.userId}`]: true,
            }));
          }
        } catch {}

        setGrantForm({ fullName: "", email: "", phone: "", role: "ADMIN" });
        setSelectedAccount(null);
        setUserSearch("");
        setGrantOpen(false);
        return;
      }

      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data?.members)) {
          onMembersUpdated(data.members);
          setGrantNotice(
            `${data?.message || "Энэ user аль хэдийн login эрхтэй байна"} — доорх жагсаалтыг серверээс шинэчиллээ.`,
          );
          return;
        }

        const message =
          data?.message ||
          data?.error ||
          responseText.slice(0, 220) ||
          `HTTP ${res.status}`;
        throw new Error(`${message} (${res.status})`);
      }
      if (!data) {
        throw new Error("API response хоосон эсвэл JSON биш байна. Серверээ refresh/restart хийнэ үү.");
      }

      onMembersUpdated(data.members ?? []);
      if (data.inviteLink && data.grantedUserId) {
        setInviteLinks((prev) => ({ ...prev, [data.grantedUserId]: data.inviteLink }));
        setVisibleSecrets((prev) => ({ ...prev, [`invite:${data.grantedUserId}`]: true }));
      }
      setGrantForm({ fullName: "", email: "", phone: "", role: "ADMIN" });
      setSelectedAccount(null);
      setUserSearch("");
      setGrantOpen(false);
    } catch (error) {
      setGrantError(
        error instanceof Error
            ? error.message
            : "Vendor login эрх олгоход алдаа гарлаа",
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-amber-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">
              <ShieldCheck size={14} />
              Vendor login account
            </div>
            <h3 className="text-lg font-black text-slate-950">Нэвтрэх хэрэглэгчийн эрх</h3>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Vendor portal руу байгууллагын контакт утсаар биш, энд байгаа login user-ийн и-мэйл эсвэл утсаар нэвтэрнэ.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-right shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Owner user</p>
              <p className="text-sm font-black text-slate-950">{primaryOwner?.fullName || primaryOwner?.email || "Үүсээгүй"}</p>
            </div>
            <button
              onClick={() => {
                setGrantOpen((value) => !value);
                setGrantError("");
                setGrantNotice("");
                setSelectedAccount(null);
                setUserSearch("");
                setGrantForm((prev) => ({ ...prev, role: members.length === 0 ? "OWNER" : prev.role }));
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              {grantOpen ? <X size={14} /> : <Plus size={14} />}
              {grantOpen ? "Form хаах" : "Login эрх олгох"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <VendorLoginContextOverview members={members} partner={partner} />

        {grantOpen && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="text-sm font-black text-indigo-950">Vendor login эрх шинээр олгох</h4>
                <p className="text-xs font-semibold leading-5 text-indigo-700">
                  Энэ user vendor portal дээр login email эсвэл login утсаар нэвтэрнэ.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">
                {members.length === 0 ? "First owner" : "Additional user"}
              </span>
            </div>

            {grantError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                <p>{grantError}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-red-600">
                  Оруулсан login email: {grantForm.email.trim() || "хоосон"}
                </p>
              </div>
            )}

            {grantNotice && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                <p>{grantNotice}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-emerald-700">
                  Одоо дээрх “Нэвтрэх боломжтой user-үүд” хэсэгт бодит login account харагдана.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Personal account хайх
                </label>
                {selectedAccount ? (
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-white px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-xs font-black text-white">
                      {selectedAccount.avatarUrl ? (
                        <img
                          src={selectedAccount.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (selectedAccount.fullName || selectedAccount.email || "?")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">
                        {selectedAccount.fullName || "Нэргүй хэрэглэгч"}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {selectedAccount.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedAccount}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Сонгосон хэрэглэгч цэвэрлэх"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={userSearch}
                      onChange={(event) => {
                        setUserSearch(event.target.value);
                        if (grantError) setGrantError("");
                        if (grantNotice) setGrantNotice("");
                      }}
                      placeholder="Нэр, email, утсаар хайх"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl">
                      {usersLoading ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-slate-500">
                          <Loader2 size={14} className="animate-spin" />
                          Хайж байна...
                        </div>
                      ) : userResults.length === 0 ? (
                        <div className="px-3 py-3 text-xs font-bold text-slate-400">
                          Personal account олдсонгүй
                        </div>
                      ) : (
                        userResults.map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => selectPersonalAccount(account)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-indigo-50"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-slate-600">
                              {account.avatarUrl ? (
                                <img
                                  src={account.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (account.fullName || account.email || "?")
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black text-slate-900">
                                {account.fullName || "Нэргүй хэрэглэгч"}
                              </span>
                              <span className="block truncate text-xs font-semibold text-slate-500">
                                {account.email}
                                {account.phone ? ` · ${account.phone}` : ""}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Login email
                </label>
                <input
                  type="email"
                  value={grantForm.email}
                  readOnly
                  placeholder="Personal account сонгоно"
                  className="w-full rounded-xl border border-indigo-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Login утас
                </label>
                <input
                  value={grantForm.phone}
                  readOnly
                  placeholder="Personal account дээр утас алга"
                  className="w-full rounded-xl border border-indigo-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Role
                </label>
                <select
                  value={grantForm.role}
                  onChange={(event) => setGrantForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold leading-5 text-indigo-700">
                Сонгосон personal account-д энэ байгууллагын page role онооно.
              </p>
              <button
                onClick={grantLoginAccess}
                disabled={
                  busyAction === "grant-login" ||
                  !selectedAccount ||
                  !isValidEmail(grantForm.email)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {busyAction === "grant-login" ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Эрх олгох
              </button>
            </div>
          </div>
        )}

        {phoneNotice && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold leading-6 text-indigo-800">
            {phoneNotice}
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <UserRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black text-slate-900">Login user үүсээгүй байна</p>
            <p className="mt-1 text-sm text-slate-500">
              Байгууллагын owner user үүсгэж invite link илгээх flow-оор бүртгэнэ.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {members.map((member) => {
              const password = tempPasswords[member.userId];
              const inviteLink = inviteLinks[member.userId];
              const isPasswordVisible = visibleSecrets[`password:${member.userId}`];
              const isInviteVisible = visibleSecrets[`invite:${member.userId}`];

              return (
                <article
                  key={member.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm">
                        {getInitials(member)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-black text-slate-950">
                            {member.fullName || "Нэргүй хэрэглэгч"}
                          </h4>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                            {roleLabel[member.role] ?? member.role}
                          </span>
                          {member.isPrimary && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                              <Crown size={11} />
                              Primary owner
                            </span>
                          )}
                          <MemberStatusPill member={member} />
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <FieldLine icon={<Mail size={12} />} label="Login email" value={member.email} />
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                <Phone size={12} />
                                Login phone
                              </div>
                              {editingPhoneUserId !== member.userId && (
                                <button
                                  type="button"
                                  onClick={() => startPhoneEdit(member)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                  <PencilLine size={11} />
                                  Засах
                                </button>
                              )}
                            </div>
                            {editingPhoneUserId === member.userId ? (
                              <div className="space-y-2">
                                <input
                                  value={phoneDrafts[member.userId] ?? ""}
                                  onChange={(event) => {
                                    setPhoneDrafts((prev) => ({
                                      ...prev,
                                      [member.userId]: event.target.value,
                                    }));
                                    if (phoneErrors[member.userId]) {
                                      setPhoneErrors((prev) => ({
                                        ...prev,
                                        [member.userId]: "",
                                      }));
                                    }
                                    if (phoneNotice) setPhoneNotice("");
                                  }}
                                  inputMode="tel"
                                  placeholder="9911xxxx"
                                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                                {phoneErrors[member.userId] && (
                                  <p className="text-xs font-semibold leading-5 text-red-600">
                                    {phoneErrors[member.userId]}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => savePhone(member)}
                                    disabled={busyAction === `phone:${member.userId}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                  >
                                    {busyAction === `phone:${member.userId}` ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Check size={13} />
                                    )}
                                    Хадгалах
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelPhoneEdit(member)}
                                    disabled={busyAction === `phone:${member.userId}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    <X size={13} />
                                    Болих
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="break-all text-sm font-bold text-slate-900">
                                {member.phone || (
                                  <span className="text-slate-400">
                                    Login утас алга
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {member.lastLoginAt
                            ? `Сүүлд нэвтэрсэн: ${new Date(member.lastLoginAt).toLocaleString("mn-MN")}`
                            : member.hasPassword
                              ? "Нууц үгтэй, хараахан нэвтрээгүй"
                              : "Invite link-ээр нууц үгээ тохируулна"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[560px]">
                      <label className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Page role
                        </span>
                        <select
                          value={member.role}
                          disabled={
                            member.role === "OWNER" ||
                            Boolean(member.isPrimary) ||
                            busyAction === `role:${member.userId}`
                          }
                          onChange={(event) => changeRole(member, event.target.value)}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-900 outline-none transition focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {member.role === "OWNER" && <option value="OWNER">Owner</option>}
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel[role]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => resetPassword(member)}
                        disabled={busyAction === `reset:${member.userId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busyAction === `reset:${member.userId}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Reset password
                      </button>
                      <button
                        onClick={() => generateInviteLink(member)}
                        disabled={busyAction === `invite:${member.userId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                      >
                        {busyAction === `invite:${member.userId}` ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Invite link
                      </button>
                      <button
                        onClick={() => makeOwner(member)}
                        disabled={Boolean(member.isPrimary) || busyAction === `owner:${member.userId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyAction === `owner:${member.userId}` ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                        Owner болгох
                      </button>
                    </div>
                  </div>

                  {(password || inviteLink) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {password && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-amber-800">
                            <KeyRound size={13} />
                            Түр нууц үг
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm font-black text-amber-950">
                              {isPasswordVisible ? password : "••••••••"}
                            </code>
                            <button
                              onClick={() => setVisibleSecrets((prev) => ({ ...prev, [`password:${member.userId}`]: !isPasswordVisible }))}
                              className="rounded-xl border border-amber-200 bg-white p-2 text-amber-700 hover:bg-amber-100"
                            >
                              {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => copyText(password, `password:${member.userId}`)}
                              className="rounded-xl border border-amber-200 bg-white p-2 text-amber-700 hover:bg-amber-100"
                            >
                              {copiedKey === `password:${member.userId}` ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                          </div>
                        </div>
                      )}

                      {inviteLink && (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-indigo-800">
                            <Send size={13} />
                            Vendor invite link
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 overflow-hidden rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-950">
                              {isInviteVisible ? inviteLink : "••••••••"}
                            </code>
                            <button
                              onClick={() => setVisibleSecrets((prev) => ({ ...prev, [`invite:${member.userId}`]: !isInviteVisible }))}
                              className="rounded-xl border border-indigo-200 bg-white p-2 text-indigo-700 hover:bg-indigo-100"
                            >
                              {isInviteVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => copyText(inviteLink, `invite:${member.userId}`)}
                              className="rounded-xl border border-indigo-200 bg-white p-2 text-indigo-700 hover:bg-indigo-100"
                            >
                              {copiedKey === `invite:${member.userId}` ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
