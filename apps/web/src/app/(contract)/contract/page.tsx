"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, FileText, Loader2, Lock, Search, ShieldCheck } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoginModal } from "@/components/organisms/auth/LoginModal";

type ContractTemplate = {
  id: string;
  title: string;
  description: string;
  feePlanLabel: string;
  isPaid: boolean;
  submissionCount: number;
  createdAt: string;
  headerData?: {
    contractTitle?: string;
    subtitle?: string;
    feePlans?: { key: string; label: string; price?: number }[];
  } | null;
};

export default function ContractCatalogPage() {
  const { user, loading: authLoading, login, register } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/contracts/available`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error || "Гэрээний жагсаалт ачаалахад алдаа гарлаа");
        setTemplates(data.contracts || []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Гэрээний жагсаалт ачаалахад алдаа гарлаа"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      `${template.title} ${template.description} ${template.feePlanLabel}`.toLowerCase().includes(q),
    );
  }, [query, templates]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_48%,#ffffff_100%)] text-slate-950">
      <section className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#ffffff,#f8fafc)]">
        <div className="container mx-auto px-4 py-9 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
                <FileText className="h-3.5 w-3.5" />
                Гэрээний сан
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Хийх боломжтой гэрээнүүд
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Сонгосон гэрээ бүр таны бүртгэлтэй хэрэглэгч дээр хадгалагдаж, баталгаажсаны дараа админ хэсэгт бүртгэгдэнэ.
              </p>
            </div>
            {!authLoading && !user && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-500"
              >
                <Lock className="h-4 w-4" />
                Нэвтрэх / Бүртгүүлэх
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-white sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Гэрээний нэр, багцаар хайх..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-amber-400 focus:bg-white focus:shadow-sm focus:ring-4 focus:ring-amber-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Нийт загвар</div>
              <div className="text-lg font-black text-slate-950">{filtered.length}</div>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-orange-500">Бүртгэлтэй</div>
              <div className="text-lg font-black text-orange-600">{templates.reduce((sum, item) => sum + item.submissionCount, 0)}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              Гэрээнүүдийг ачаалж байна...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-orange-300" />
            <div className="font-bold text-slate-700">Идэвхтэй гэрээний загвар олдсонгүй</div>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <article key={template.id} className="group flex min-h-[280px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-white transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/60">
                <div>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${template.isPaid ? "border-orange-100 bg-orange-50 text-orange-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
                      {template.isPaid ? "Төлбөртэй" : "Үнэгүй"}
                    </span>
                  </div>
                  <h2 className="line-clamp-2 text-xl font-black uppercase leading-snug tracking-tight text-slate-950">{template.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{template.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Цахим баталгаажуулалт
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                      Админ бүртгэл
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {template.feePlanLabel || "Багцгүй"}
                    </span>
                    <span>{template.submissionCount} бүртгэл</span>
                  </div>
                  {user ? (
                    <Link
                      href={`/contract/sign/${template.id}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Сонгож гэрээ хийх <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAuthOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <Lock className="h-4 w-4" />
                      Нэвтэрч сонгох
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {authOpen && (
        <LoginModal
          open={authOpen}
          onClose={() => { setAuthOpen(false); setAuthError(""); }}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          onRegister={async (fullName, identifier, password) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              await register(fullName, identifier, password);
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Бүртгүүлэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          isLoading={authBusy}
          error={authError}
        />
      )}
    </main>
  );
}
