"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, FileText, X } from "lucide-react";
import { motion } from "motion/react";
import { API } from "@/lib/api";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { HrEmbeddedFormPanel } from "./HrEmbeddedFormPanel";
import { HrServiceDetailList } from "./HrServiceDetailList";
import type { HrMenuService } from "./HrServiceMenuCard";
import { HrServiceSummaryGrid } from "./HrServiceSummaryGrid";
import type { HrForm } from "./hr-form-types";

type HrServiceDetailModalProps = {
  service: HrMenuService;
  onClose: () => void;
};

export function HrServiceDetailModal({
  service,
  onClose,
}: HrServiceDetailModalProps) {
  const [form, setForm] = useState<HrForm | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasForm = Boolean(service.hasForm && service.formSlug);

  useLockBodyScroll();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setForm(null);

    if (!hasForm || !service.formSlug) {
      setLoadingForm(false);
      return;
    }

    setLoadingForm(true);
    fetch(`${API}/forms/${encodeURIComponent(service.formSlug)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HrForm | null) => {
        if (!cancelled && data) setForm(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasForm, service.formSlug]);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      data-lenis-prevent="true"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Хаах"
      />
      <motion.article
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        style={{ height: "min(860px, calc(100vh - 48px))" }}
        className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                  HR материал
                </p>
                <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {service.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Хаах"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasForm && (
            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
                Маягт бөглөх
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Энэ PDF-ийн мэдээллийг доорх web маягтаар шууд бөглөж илгээнэ.
                PDF нь зөвхөн лавлагаа файл хэлбэрээр үлдэнэ.
              </p>
            </div>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-4 sm:px-6"
          data-lenis-prevent="true"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <div className="space-y-4">
            {hasForm && (
              <HrEmbeddedFormPanel
                form={form}
                formSlug={service.formSlug}
                formTitle={service.formTitle}
                loading={loadingForm}
                className="bg-white"
              />
            )}

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <HrServiceSummaryGrid service={service} />
              <HrServiceDetailList details={service.details} />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {service.fileUrl && (
              <a
                href={service.fileUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition ${
                  hasForm
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-emerald-600 text-white hover:bg-slate-950"
                }`}
              >
                Файл нээх
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Хаах
            </button>
          </div>
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}
