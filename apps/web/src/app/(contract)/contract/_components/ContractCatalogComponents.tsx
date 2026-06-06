"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type ContractCatalogTemplate = {
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

type ContractCatalogHeroProps = {
  isGuest: boolean;
  onAuthOpen: () => void;
};

export function ContractCatalogHero({
  isGuest,
  onAuthOpen,
}: ContractCatalogHeroProps) {
  return (
    <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_40%,#f8fafc_100%)]">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-orange-700 shadow-sm">
              <FileText className="h-3.5 w-3.5" />
              Гэрээний сан
            </div>
            <h1 className="text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Хийх боломжтой гэрээнүүд
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-base font-semibold leading-7 text-slate-600">
              Сонгосон гэрээ таны account дээр хадгалагдаж, баталгаажсаны дараа
              админ архивт автоматаар бүртгэгдэнэ.
            </p>
          </div>

          {isGuest && (
            <button
              type="button"
              onClick={onAuthOpen}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-orange-600 sm:w-auto"
            >
              <Lock className="h-4 w-4" />
              Нэвтрэх / Бүртгүүлэх
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

type ContractCatalogToolbarProps = {
  query: string;
  total: number;
  submissionTotal: number;
  onQueryChange: (value: string) => void;
};

export function ContractCatalogToolbar({
  query,
  total,
  submissionTotal,
  onQueryChange,
}: ContractCatalogToolbarProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Гэрээний нэр, багц, тайлбараар хайх..."
            className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-base font-bold text-slate-950 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
          <MetricPill label="Нийт загвар" value={total} tone="slate" />
          <MetricPill label="Бүртгэлтэй" value={submissionTotal} tone="orange" />
        </div>
      </div>
    </section>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "orange";
}) {
  const styles =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-slate-300 bg-slate-100 text-slate-900";

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 ${styles}`}>
      <div className="text-[11px] font-black uppercase tracking-wide opacity-75">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
    </div>
  );
}

type ContractTemplateCardProps = {
  template: ContractCatalogTemplate;
  isAuthenticated: boolean;
  onAuthOpen: () => void;
};

export function ContractTemplateCard({
  template,
  isAuthenticated,
  onAuthOpen,
}: ContractTemplateCardProps) {
  const planLabel = template.feePlanLabel || "Багцгүй";
  const submitLabel = `${template.submissionCount} бүртгэл`;

  return (
    <article className="group flex min-h-[330px] flex-col overflow-hidden rounded-[28px] border-2 border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_22px_60px_rgba(249,115,22,0.18)]">
      <div className="h-2 bg-[linear-gradient(90deg,#fb923c,#f97316,#0f172a)]" />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
            <FileText className="h-6 w-6" />
          </div>
          <span
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-black ${
              template.isPaid
                ? "border-orange-300 bg-orange-100 text-orange-800"
                : "border-emerald-300 bg-emerald-100 text-emerald-800"
            }`}
          >
            {template.isPaid ? "Төлбөртэй" : "Үнэгүй"}
          </span>
        </div>

        <div className="flex-1">
          <h2 className="line-clamp-2 text-2xl font-black uppercase leading-tight tracking-tight text-slate-950">
            {template.title}
          </h2>
          <p className="mt-3 line-clamp-3 min-h-[72px] text-base font-semibold leading-6 text-slate-600">
            {template.description}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <InfoBadge
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Цахим баталгаажуулалт"
              tone="emerald"
            />
            <InfoBadge
              icon={<BadgeCheck className="h-4 w-4" />}
              label="Админ бүртгэл"
              tone="orange"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            <div className="min-w-0 pr-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Багц
              </div>
              <div className="truncate text-sm font-black text-slate-950">
                {planLabel}
              </div>
            </div>
            <div className="pl-3">
              <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">
                Бүртгэл
              </div>
              <div className="text-sm font-black text-orange-700">
                {submitLabel}
              </div>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <Link
            href={`/contract/sign/${template.id}`}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-center text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-orange-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Сонгож гэрээ хийх
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAuthOpen}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 text-center text-sm font-black text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"
          >
            <Lock className="h-4 w-4" />
            Нэвтэрч сонгох
          </button>
        )}
      </div>
    </article>
  );
}

function InfoBadge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "orange";
}) {
  const styles =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-orange-200 bg-orange-50 text-orange-800";

  return (
    <span
      className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${styles}`}
    >
      {icon}
      <span className="leading-tight">{label}</span>
    </span>
  );
}

export function ContractCatalogEmptyState() {
  return (
    <div className="rounded-[28px] border-2 border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
        <Sparkles className="h-8 w-8" />
      </div>
      <div className="text-lg font-black text-slate-950">
        Идэвхтэй гэрээний загвар олдсонгүй
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        Хайлтын утгаа өөрчлөөд дахин шалгана уу.
      </p>
    </div>
  );
}
