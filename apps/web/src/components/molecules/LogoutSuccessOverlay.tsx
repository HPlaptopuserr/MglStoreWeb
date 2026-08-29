"use client";

import { CircleCheck, LogOut } from "lucide-react";

interface LogoutSuccessOverlayProps {
  visible: boolean;
}

export function LogoutSuccessOverlay({ visible }: LogoutSuccessOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white px-7 py-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.3)] sm:px-10 sm:py-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CircleCheck
            className="h-10 w-10"
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Session closed
        </div>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Системээс амжилттай гарлаа
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-500 sm:text-base">
          Таны бүртгэлийн session аюулгүй хаагдлаа. Дахин нэвтрэхэд бэлэн байна.
        </p>

        <div className="mx-auto mt-7 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
