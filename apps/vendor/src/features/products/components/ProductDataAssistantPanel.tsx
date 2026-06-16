"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CopyCheck,
  ListChecks,
  Layers,
  LineChart,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import {
  analyzeProductDraft,
  type AssistantSeverity,
} from "@/lib/ai-assistant";
import type { BusinessCategory, FormState, Product } from "../types";

type Props = {
  form: FormState;
  categories: BusinessCategory[];
  products: Product[];
  editingId: string | null;
  onApplyCategory: (id: string) => void;
  onApplyDescription: (description: string) => void;
  onSwitchToEdit?: (product: Product) => void;
};

const severityStyle: Record<AssistantSeverity, string> = {
  good: "border-emerald-100 bg-emerald-50 text-emerald-700",
  info: "border-sky-100 bg-sky-50 text-sky-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  critical: "border-red-100 bg-red-50 text-red-700",
};

export function ProductDataAssistantPanel({
  form,
  categories,
  products,
  editingId,
  onApplyCategory,
  onApplyDescription,
  onSwitchToEdit,
}: Props) {
  const result = useMemo(
    () =>
      analyzeProductDraft({
        draft: form,
        categories,
        products,
        editingId,
      }),
    [categories, editingId, form, products],
  );

  const scoreTone =
    result.score >= 86
      ? "text-emerald-600"
      : result.score >= 66
        ? "text-amber-600"
        : "text-red-600";

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Bot size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                Product data assistant
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                Бодит catalog дата дээр тулгуурлаж ангилал, давхардал, үнэ,
                тайлбарын чанарыг шалгана.
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black leading-none ${scoreTone}`}>
                {result.score}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                score
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-bold leading-5 text-slate-700 ring-1 ring-indigo-100">
            {result.summary}
          </p>
        </div>
      </div>

      {result.actionPlan.length > 0 && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-white/85 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-500">
            <ListChecks size={14} />
            Дараагийн алхам
          </div>
          <ol className="space-y-1.5">
            {result.actionPlan.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="flex gap-2 text-xs font-semibold leading-5 text-slate-600"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.categorySuggestions.length > 0 && !form.businessCategoryId && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Layers size={14} />
            Ангилал санал
          </div>
          <div className="space-y-2">
            {result.categorySuggestions.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onApplyCategory(category.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-800">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                    {category.reason}
                  </span>
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-700">
                  {category.confidence}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result.duplicateSuggestions.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
            <CopyCheck size={14} />
            Давхардал шалгалт
          </div>
          <div className="space-y-2">
            {result.duplicateSuggestions.map((duplicate) => {
              const product = productById.get(duplicate.id);
              return (
                <div
                  key={duplicate.id}
                  className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-amber-900">
                        {duplicate.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-4 text-amber-700">
                        {duplicate.reason} Тааралт: {duplicate.score}%
                      </p>
                    </div>
                  </div>
                  {product && onSwitchToEdit && (
                    <button
                      type="button"
                      onClick={() => onSwitchToEdit(product)}
                      className="mt-2 h-8 w-full rounded-lg bg-amber-100 text-xs font-black text-amber-800 transition hover:bg-amber-200"
                    >
                      Энэ барааг засах
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.tags.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Tag size={14} />
            Search tags
          </div>
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.marketInsights.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <LineChart size={14} />
            Market insight
          </div>
          <div className="space-y-2">
            {result.marketInsights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-xl border px-3 py-2.5 ${severityStyle[insight.severity]}`}
              >
                <p className="text-xs font-black">{insight.title}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-4 opacity-80">
                  {insight.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.descriptionSuggestion && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Wand2 size={14} />
            Тайлбар санал
          </div>
          <p className="text-xs font-semibold leading-5 text-slate-600">
            {result.descriptionSuggestion}
          </p>
          <button
            type="button"
            onClick={() =>
              onApplyDescription(result.descriptionSuggestion || "")
            }
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-indigo-600"
          >
            <CheckCircle2 size={14} />
            Тайлбарт хийх
          </button>
        </div>
      )}

      {result.issues.length > 0 && (
        <div className="mt-4 space-y-2">
          {result.issues.slice(0, 4).map((issue) => (
            <div
              key={issue.id}
              className={`rounded-xl border px-3 py-2.5 ${severityStyle[issue.severity]}`}
            >
              <p className="text-xs font-black">{issue.title}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-4 opacity-80">
                {issue.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
