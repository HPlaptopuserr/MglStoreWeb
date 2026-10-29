"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { InvestorProfileMenu } from "./InvestorProfileMenu";
import { InvestmentHeaderWallet } from "./InvestmentHeaderWallet";

interface InvestorViewerHeaderProps {
  userName: string;
  onSignOut: () => void;
}

export function InvestorViewerHeader({
  userName,
  onSignOut,
}: InvestorViewerHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-8">
        <Link
          href="/investor"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:gap-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200 sm:size-10">
            <Eye className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold sm:text-base">
              Дундын дэлгүүр
            </p>
            <p className="hidden text-xs text-slate-500 md:block">
              Хөрөнгө оруулагчийн хуудас
            </p>
          </div>
        </Link>
        <nav
          aria-label="Хэрэглэгчийн цэс"
          className="flex shrink-0 items-center gap-1 sm:gap-3"
        >
          <InvestorProfileMenu userName={userName} onSignOut={onSignOut} />
          <InvestmentHeaderWallet />
        </nav>
      </div>
    </header>
  );
}
