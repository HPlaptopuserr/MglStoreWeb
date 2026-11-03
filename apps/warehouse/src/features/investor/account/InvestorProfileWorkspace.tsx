"use client";
import Link from "next/link";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useInvestorProfile } from "./useInvestorProfile";
import { InvestorBankAccountSection } from "./InvestorBankAccountSection";

export function InvestorProfileWorkspace() {
  const state = useInvestorProfile();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/investor"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
      >
        <ArrowLeft className="size-4" />
        Тайлан руу буцах
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Миний профайл</h1>
        <p className="mt-2 text-sm text-slate-500">
          Өөрийн нэр, холбоо барих мэдээллээ шинэчилнэ үү.
        </p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {state.loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
          >
            <Loader2 className="size-5 animate-spin" />
            Мэдээлэл ачаалж байна…
          </div>
        ) : state.profile ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void state.save();
            }}
            className="space-y-5"
          >
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <UserRound className="size-6" />
              </span>
              <div>
                <h2 className="font-semibold">Хувийн мэдээлэл</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Зөвхөн өөрийн бүртгэлийг засна.
                </p>
              </div>
            </div>
            {(
              [
                {
                  key: "fullName",
                  label: "Овог, нэр",
                  type: "text",
                  autoComplete: "name",
                  icon: UserRound,
                },
                {
                  key: "phone",
                  label: "Утасны дугаар",
                  type: "tel",
                  autoComplete: "tel",
                  icon: Phone,
                },
                {
                  key: "email",
                  label: "Имэйл хаяг",
                  type: "email",
                  autoComplete: "email",
                  icon: Mail,
                },
              ] as const
            ).map(({ key, label, type, autoComplete, icon: Icon }) => (
              <label
                key={key}
                className="block text-sm font-medium text-slate-700"
              >
                {label}
                <div className="relative mt-2">
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
                  />
                  <input
                    type={type}
                    autoComplete={autoComplete}
                    value={state.profile?.[key] || ""}
                    onChange={(event) => state.change(key, event.target.value)}
                    required
                    disabled={state.saving}
                    maxLength={key === "phone" ? 16 : 120}
                    pattern={
                      key === "phone" ? "(\\+?976[ -]?)?[0-9]{8}" : undefined
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>
              </label>
            ))}
            <p className="text-xs leading-5 text-slate-500">
              Холбоо барих мэдээлэл өөрчлөгдсөн ч хөрөнгө оруулалт болон дэлгүүр
              харах эрх таны бүртгэлд хадгалагдана.
            </p>
            {state.error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {state.error}
              </p>
            )}
            {state.saved && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                <CheckCircle2 className="size-4" />
                Мэдээллийг хадгаллаа.
              </p>
            )}
            <button
              type="submit"
              disabled={state.saving}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 sm:w-auto"
            >
              {state.saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {state.saving ? "Хадгалж байна…" : "Мэдээлэл хадгалах"}
            </button>
          </form>
        ) : (
          <div role="alert" className="space-y-3 text-sm text-red-700">
            <p>{state.error}</p>
            <button onClick={state.reload} className="font-semibold underline">
              Дахин оролдох
            </button>
          </div>
        )}
      </section>
      <InvestorBankAccountSection />
    </div>
  );
}
