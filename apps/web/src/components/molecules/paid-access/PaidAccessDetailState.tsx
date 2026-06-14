"use client";

import { ArrowLeft, Loader2 } from "lucide-react";

export function PaidAccessDetailLoading({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/75">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        {label}
      </div>
    </main>
  );
}

export function PaidAccessDetailError({
  title,
  message,
  backLabel,
  onBack,
}: {
  title: string;
  message: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-red-200/20 bg-red-500/10 p-5">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-red-200">
          Алдаа
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-red-50/75">
          {message}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#0d0d10] transition hover:bg-white/90"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      </section>
    </main>
  );
}
