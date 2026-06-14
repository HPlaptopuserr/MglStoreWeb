"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  type PersonalAccountOption,
  type VendorLoginRole,
  vendorLoginRoleLabel,
} from "./vendor-login-types";
export type { PersonalAccountOption, VendorLoginRole } from "./vendor-login-types";

type Props = {
  selectedAccount: PersonalAccountOption | null;
  onSelectedAccountChange: (account: PersonalAccountOption | null) => void;
  role: VendorLoginRole;
  onRoleChange: (role: VendorLoginRole) => void;
  disabledUserIds?: string[];
  tone?: "indigo" | "emerald";
  title?: string;
  description?: string;
  badge?: string;
};

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 450;
const EMPTY_DISABLED_USER_IDS: string[] = [];

function getAccountInitial(account: PersonalAccountOption) {
  return (account.fullName || account.email || "?").charAt(0).toUpperCase();
}

function getAccountAvatarUrl(account?: PersonalAccountOption | null) {
  return resolveMediaUrl(account?.avatarUrl);
}

export function VendorLoginAccountSelector({
  selectedAccount,
  onSelectedAccountChange,
  role,
  onRoleChange,
  disabledUserIds = EMPTY_DISABLED_USER_IDS,
  tone = "indigo",
  title = "Vendor login эрх шинээр олгох",
  description = "Personal account сонгож тухайн байгууллагын page role онооно.",
  badge = "Personal account",
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [results, setResults] = useState<PersonalAccountOption[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);
  const disabledSet = useMemo(() => new Set(disabledUserIds), [disabledUserIds]);
  const trimmedSearch = search.trim();
  const canSearch = trimmedSearch.length >= MIN_SEARCH_LENGTH;
  const accent =
    tone === "emerald"
      ? {
          shell: "border-emerald-200 bg-emerald-50",
          text: "text-emerald-950",
          muted: "text-emerald-700",
          badge: "text-emerald-700",
          focus: "focus:border-emerald-500 focus:ring-emerald-500/10",
          hover: "hover:bg-emerald-50",
        }
      : {
          shell: "border-indigo-200 bg-indigo-50",
          text: "text-indigo-950",
          muted: "text-indigo-700",
          badge: "text-indigo-600",
          focus: "focus:border-indigo-500 focus:ring-indigo-500/10",
          hover: "hover:bg-indigo-50",
        };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const query = debouncedSearch;
    if (query.length < MIN_SEARCH_LENGTH) {
      requestSeq.current += 1;
      setLoading(false);
      setResults([]);
      return;
    }

    let cancelled = false;
    const seq = ++requestSeq.current;

    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: "1", limit: "20" });
        params.set("search", query);

        const res = await adminFetch(`${API}/admin/users?${params.toString()}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled || seq !== requestSeq.current) return;

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        setResults(
          items
            .filter((item: PersonalAccountOption) => !disabledSet.has(item.id))
            .slice(0, 8),
        );
      } catch {
        if (!cancelled && seq === requestSeq.current) setResults([]);
      } finally {
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      }
    };

    fetchAccounts();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, disabledSet]);

  const showResults = !selectedAccount && canSearch;

  const selectAccount = (account: PersonalAccountOption) => {
    onSelectedAccountChange(account);
    setSearch(account.fullName || account.email);
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent.shell}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className={`text-sm font-black ${accent.text}`}>{title}</h4>
          <p className={`text-xs font-semibold leading-5 ${accent.muted}`}>
            {description}
          </p>
        </div>
        <span className={`rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${accent.badge}`}>
          {badge}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Personal account хайх
          </label>
          {selectedAccount ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-xs font-black text-white">
                {getAccountAvatarUrl(selectedAccount) ? (
                  <img
                    src={getAccountAvatarUrl(selectedAccount)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getAccountInitial(selectedAccount)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">
                  {selectedAccount.fullName || "Нэргүй хэрэглэгч"}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {selectedAccount.email}
                  {selectedAccount.phone ? ` · ${selectedAccount.phone}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectedAccountChange(null);
                  setSearch("");
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Сонгосон хэрэглэгч цэвэрлэх"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Нэр, email, утсаар хайх"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 ${accent.focus}`}
              />
              {trimmedSearch.length > 0 && trimmedSearch.length < MIN_SEARCH_LENGTH ? (
                <p className="mt-1 px-1 text-[10px] font-bold text-slate-400">
                  3-аас дээш тэмдэгт бичээд хайна.
                </p>
              ) : null}
              {showResults && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  {loading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      Хайж байна...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-3 py-3 text-xs font-bold text-slate-400">
                      Personal account олдсонгүй
                    </div>
                  ) : (
                    results.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => selectAccount(account)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${accent.hover}`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-slate-600">
                          {getAccountAvatarUrl(account) ? (
                            <img src={getAccountAvatarUrl(account)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getAccountInitial(account)
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
              )}
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Login email
          </label>
          <input
            type="email"
            value={selectedAccount?.email || ""}
            readOnly
            placeholder="Personal account сонгоно"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Login утас
          </label>
          <input
            value={selectedAccount?.phone || ""}
            readOnly
            placeholder="Утас алга"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Role
          </label>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as VendorLoginRole)}
            className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-900 outline-none transition focus:ring-4 ${accent.focus}`}
          >
            {(Object.keys(vendorLoginRoleLabel) as VendorLoginRole[]).map((value) => (
              <option key={value} value={value}>
                {vendorLoginRoleLabel[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={`mt-4 flex items-center gap-2 text-xs font-semibold leading-5 ${accent.muted}`}>
        <ShieldCheck size={14} />
        Энэ нь байгууллагын контакт email/утас биш, vendor portal-д нэвтрэх account context болно.
      </p>
    </div>
  );
}
