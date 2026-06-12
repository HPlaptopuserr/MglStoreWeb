"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type MembershipUpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MembershipUpgradeModal({
  children,
  onClose,
  open,
}: MembershipUpgradeModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden overscroll-contain bg-slate-950/55 px-3 pb-3 pt-12 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Popup хаах"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Membership upgrade"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)] sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
              Membership
            </p>
            <h2 className="truncate text-lg font-black text-slate-950">
              Гишүүнчлэл upgrade хийх
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Popup хаах"
          >
            <X size={18} />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 [scrollbar-gutter:stable] sm:p-5"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
