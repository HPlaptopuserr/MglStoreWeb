import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { REELS_FEED_TABS } from "../_lib/reels.feed";
import type { ReelsFeedMode } from "../_lib/reels.types";

type ReelsHeaderProps = {
  activeMode: ReelsFeedMode;
  counts: Record<ReelsFeedMode, number>;
  onModeChange: (mode: ReelsFeedMode) => void;
  reelCount: number;
};

export function ReelsHeader({
  activeMode,
  counts,
  onModeChange,
  reelCount,
}: ReelsHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 h-12 bg-gradient-to-b from-black/76 via-black/36 to-transparent px-3 pt-2 sm:h-16 sm:px-5 sm:pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/30 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white hover:text-black sm:h-11 sm:w-11"
            aria-label="Нүүр рүү буцах"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-lg font-black leading-5 tracking-tight">
              MGL Shop Reels
            </p>
            <p className="text-[11px] font-bold text-white/58">
              {reelCount} худалдааны video
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/25 sm:flex"
          aria-label="Профайл"
        >
          M
        </Link>
      </div>

      <nav
        className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-4 text-[12px] font-black text-white/52 drop-shadow sm:top-5 sm:gap-5 sm:text-sm"
        aria-label="Reels feed төрөл"
      >
        {REELS_FEED_TABS.filter(
          (tab) =>
            (tab.id !== "following" ||
              counts.following > 0 ||
              activeMode === "following") &&
            (tab.id !== "live" || counts.live > 0 || activeMode === "live"),
        ).map((tab) => {
          const active = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              className={`relative pb-1 transition ${
                active ? "text-white" : "text-white/48 hover:text-white/78"
              }`}
              type="button"
              onClick={() => onModeChange(tab.id)}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {tab.id === "live" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-red-500 ${
                      active ? "opacity-100" : "opacity-70"
                    }`}
                  />
                )}
                <span>{tab.label}</span>
                {counts[tab.id] > 0 && tab.id !== "reels" && (
                  <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[9px] leading-none text-white/70">
                    {counts[tab.id]}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-white" />
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
