"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "../lib";
import { WalkingDuck } from "./MglLoadingScreen";

type MglSystemErrorScreenProps = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export function MglSystemErrorScreen({
  title = "Систем түр алдаа гаргалаа",
  message = "Хуудсыг дахин ачаалаад үргэлжлүүлнэ үү. Давтагдвал админ багт мэдэгдэнэ.",
  retryLabel = "Дахин оролдох",
  onRetry,
  className,
}: MglSystemErrorScreenProps) {
  return (
    <main
      className={cn(
        "grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_50%_25%,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] px-5 text-slate-950",
        className,
      )}
      role="alert"
    >
      <section className="flex w-full max-w-md flex-col items-center rounded-[28px] border border-orange-100 bg-white/90 px-6 py-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <WalkingDuck />
        <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <AlertTriangle size={19} />
        </span>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-orange-500">
          System status
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            <RotateCcw size={16} />
            {retryLabel}
          </button>
        )}
      </section>
    </main>
  );
}
