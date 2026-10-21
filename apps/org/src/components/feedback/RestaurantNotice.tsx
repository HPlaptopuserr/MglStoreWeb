"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";

interface RestaurantNoticeProps {
  message: string;
  onDismiss: () => void;
}

export function RestaurantNotice({
  message,
  onDismiss,
}: RestaurantNoticeProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-emerald-300/40 bg-[#10332f] p-4 text-sm font-bold text-emerald-100 shadow-2xl motion-safe:animate-[notice-enter_180ms_ease-out]"
      >
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"
        />
        <span className="min-w-0 flex-1 break-words">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Мэдэгдэл хаах"
          className="rounded-lg p-1 text-emerald-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
