"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogOut, UserRound } from "lucide-react";

interface InvestorProfileMenuProps {
  userName: string;
  onSignOut: () => void;
}

export function InvestorProfileMenu({
  userName,
  onSignOut,
}: InvestorProfileMenuProps) {
  const root = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const close = () => {
    if (root.current) root.current.open = false;
  };

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && root.current?.open) {
        close();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <details ref={root} className="relative">
      <summary
        ref={trigger}
        aria-label="Профайлын цэс"
        title={`${userName} · Профайл`}
        className="flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl px-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden"
      >
        <UserRound className="size-4 shrink-0" />
        <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">
          {userName}
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
        <p className="truncate border-b border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-500">
          {userName}
        </p>
        <Link
          href="/investor/profile"
          onClick={close}
          className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <UserRound className="size-4" />
          Миний профайл
        </Link>
        <button
          type="button"
          onClick={() => {
            close();
            onSignOut();
          }}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <LogOut className="size-4" />
          Гарах
        </button>
      </div>
    </details>
  );
}
