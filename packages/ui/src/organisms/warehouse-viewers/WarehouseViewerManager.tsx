"use client";
import { MonthlyDividendEditor } from "./MonthlyDividendEditor";
import { InvestmentAmountEditor } from "./InvestmentAmountEditor";
import { InvestorBankAccountDetails } from "./InvestorBankAccountDetails";
import { useEffect, useId, useRef, useState } from "react";
import type { WarehouseViewerMember } from "@mgl/types";
import { RemoveWarehouseViewerDialog } from "./RemoveWarehouseViewerDialog";
import { Eye, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import {
  type WarehouseViewerTransport,
  useWarehouseViewers,
} from "./useWarehouseViewers";

export function WarehouseViewerManager({
  warehouseId,
  apiBase,
  request,
  onInvestmentSaved,
}: {
  warehouseId: string;
  onInvestmentSaved?: () => void;
} & WarehouseViewerTransport) {
  const state = useWarehouseViewers(warehouseId, { apiBase, request });
  const [phone, setPhone] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const addFormId = useId();
  const phoneInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (addOpen) phoneInput.current?.focus();
  }, [addOpen]);
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase("mn-MN");
  const visibleMembers = state.members.filter((member) =>
    [member.fullName, member.phoneNumber, member.email].some((value) =>
      value?.toLocaleLowerCase("mn-MN").includes(search),
    ),
  );
  const [removingMember, setRemovingMember] =
    useState<WarehouseViewerMember | null>(null);
  const saveInvestment = async (
    userId: string,
    amount: string,
    version: number,
  ) => {
    const saved = await state.saveInvestment(userId, amount, version);
    if (saved) onInvestmentSaved?.();
    return saved;
  };
  const saveDividend = async (
    userId: string,
    amount: string,
    version: number,
    month: string,
  ) => {
    const saved = await state.saveDividend(userId, amount, version, month);
    if (saved) onInvestmentSaved?.();
    return saved;
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Хөрөнгө оруулагчид</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Хөрөнгө оруулалт, сарын ногдол ашиг болон харах эрхийг нэг дор
              удирдана.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={addOpen}
          aria-controls={addFormId}
          onClick={() => setAddOpen((open) => !open)}
          disabled={state.busy || state.loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {addOpen ? "Форм хаах" : "Харах эрх нэмэх"}
        </button>
      </div>
      <div id={addFormId} hidden={!addOpen}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await state.add(phone.trim())) {
              setPhone("");
              setQuery("");
              setAddOpen(false);
            }
          }}
          className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-xs font-semibold text-slate-600">
            Бүртгэлтэй утасны дугаар
            <input
              ref={phoneInput}
              type="tel"
              disabled={state.busy || state.loading}
              autoComplete="off"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Жишээ: 99112233"
              required
              maxLength={20}
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="submit"
            disabled={state.busy || state.loading || !phone.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {state.busy ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Эрх олгох
          </button>
        </form>
      </div>
      {state.error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
          <button
            onClick={() => void state.reload()}
            className="ml-3 underline"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {state.message && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          Харах эрхтэй хүмүүс
          {!state.loading && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">
              {state.members.length}
            </span>
          )}
        </h3>
        <label className="relative block sm:w-72">
          <span className="sr-only">Хөрөнгө оруулагч хайх</span>
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Нэр, утас, имэйлээр хайх"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      {state.loading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Хэрэглэгчдийг ачаалж байна…
        </p>
      ) : !state.members.length && !state.error ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Харах эрхтэй хөрөнгө оруулагч нэмээгүй байна.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {visibleMembers.map((member) => (
            <li
              key={member.id}
              className="relative rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="grid gap-4 xl:pr-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:gap-6">
                <div className="flex min-w-0 items-start gap-3 pr-10 xl:pr-0">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
                  >
                    {member.fullName.trim().slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-900">
                      {member.fullName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {member.phoneNumber || "Утас бүртгэлгүй"}
                    </p>
                    {!member.email.endsWith("@temp.local") && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {member.email}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      <Eye className="size-3" aria-hidden="true" />
                      Зөвхөн харах
                    </span>
                  </div>
                </div>
                <div className="grid items-start gap-3 md:grid-cols-2 md:gap-5 xl:border-l xl:border-slate-100 xl:pl-6">
                  {member.investmentAmount != null && (
                    <InvestmentAmountEditor
                      key={member.investmentVersion}
                      member={member}
                      compact
                      busy={state.busy}
                      onSave={saveInvestment}
                    />
                  )}
                  <MonthlyDividendEditor
                    key={`${member.monthlyDividend?.month}:${member.monthlyDividend?.version}`}
                    member={member}
                    compact
                    busy={state.busy}
                    onSave={saveDividend}
                  />
                </div>
              </div>
              <button
                aria-label={`${member.fullName}-ийн харах эрхийг цуцлах`}
                title="Харах эрх цуцлах"
                aria-haspopup="dialog"
                onClick={() => setRemovingMember(member)}
                disabled={state.busy}
                className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <X className="size-4" />
              </button>
              <InvestorBankAccountDetails
                account={member.bankAccount ?? null}
                collapsible
              />
            </li>
          ))}
        </ul>
      )}
      {!state.loading &&
        state.members.length > 0 &&
        visibleMembers.length === 0 && (
          <div
            role="status"
            className="py-8 text-center text-sm text-slate-500"
          >
            <p>Хайлтад тохирох хөрөнгө оруулагч олдсонгүй.</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 min-h-11 rounded-lg px-3 font-semibold text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Хайлт цэвэрлэх
            </button>
          </div>
        )}
      {removingMember && (
        <RemoveWarehouseViewerDialog
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onConfirm={async () => {
            const removed = await state.remove(removingMember.userId);
            if (removed) setRemovingMember(null);
            return removed;
          }}
        />
      )}
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Өөрийн MGL Store хаягаар нэвтэрч зөвхөн энэ дэлгүүрийн бараа,
        борлуулалт, өртөг, ашгийн тайланг харна. Мэдээлэл өөрчлөх эрх олгохгүй.
      </p>
    </section>
  );
}
