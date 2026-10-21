"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserCheck, X } from "lucide-react";
import { memberApi } from "./member-api";
import type { MglAccount } from "./member-types";

interface Props {
  organizationId: string;
  selected: MglAccount | null;
  disabled: boolean;
  onSelect: (account: MglAccount | null) => void;
}

export function MglAccountSearch({
  organizationId,
  selected,
  disabled,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MglAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setError("");
    setSearched(false);
    setLoading(false);
    if (query.trim().length < 3 || selected) return () => controller.abort();
    setLoading(true);
    const timer = setTimeout(() => {
      memberApi
        .searchAccounts(organizationId, query.trim(), controller.signal)
        .then((accounts) => {
          if (!controller.signal.aborted) {
            setResults(accounts);
            setSearched(true);
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error ? cause.message : "Хайлт амжилтгүй боллоо",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [organizationId, query, selected]);

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4"
      aria-label="MGL бүртгэл хайх"
    >
      <h3 className="text-sm font-black text-slate-900">
        MGL бүртгэлээр холбох
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Бүртгэлтэй хүнийг сонгох эсвэл доорх талбараар шинэ ажилтан үүсгэнэ.
      </p>
      {selected ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-200 bg-white p-3">
          <UserCheck className="h-5 w-5 shrink-0 text-indigo-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {selected.fullName}
            </p>
            <p className="truncate text-xs text-slate-600">
              {selected.email} · {selected.phone || "Утасгүй"}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            aria-label="Сонгосон бүртгэл цэвэрлэх"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              autoFocus
              aria-label="Нэр, утас, имэйлээр MGL бүртгэл хайх"
              value={query}
              maxLength={100}
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Нэр, утас, имэйл · 3-аас дээш тэмдэгт"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-indigo-600" />
            )}
          </div>
          <div aria-live="polite">
            {error && (
              <p role="alert" className="mt-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            {searched && !results.length && (
              <p className="mt-3 text-sm text-slate-600">
                Бүртгэл олдсонгүй. Доороос шинэ ажилтан бүртгэж болно.
              </p>
            )}
            {!!results.length && (
              <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                {results.map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      disabled={disabled || account.isMember}
                      onClick={() => onSelect(account)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex justify-between gap-2 text-sm font-bold text-slate-900">
                        <span>{account.fullName}</span>
                        {account.isMember && (
                          <span className="shrink-0 text-xs text-slate-500">
                            Ажилтнаар бүртгэлтэй
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-slate-600">
                        {account.email} · {account.phone || "Утасгүй"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
