"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "../lib";
import { WalkingDuck } from "./MglLoadingScreen";

type MglAppBootLoaderProps = {
  label?: string;
  initialDurationMs?: number;
  routeDurationMs?: number;
  className?: string;
};

export function MglAppBootLoader({
  label = "Ачааллаж байна",
  initialDurationMs = 850,
  routeDurationMs = 420,
  className,
}: MglAppBootLoaderProps) {
  const pathname = usePathname();
  const firstPath = useRef(true);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = firstPath.current ? initialDurationMs : routeDurationMs;
    const startedAt = window.performance.now();
    let animationFrame = 0;
    let hideTimeout = 0;

    setVisible(true);
    setProgress(0);

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const nextProgress = Math.min(96, Math.round((elapsed / duration) * 96));
      setProgress(nextProgress);

      if (elapsed < duration) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      setProgress(100);
      hideTimeout = window.setTimeout(() => setVisible(false), 120);
    };

    animationFrame = window.requestAnimationFrame(tick);
    firstPath.current = false;

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(hideTimeout);
    };
  }, [initialDurationMs, pathname, routeDurationMs]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 grid place-items-center bg-white px-6 text-slate-950 transition-opacity duration-200",
        className,
      )}
      style={{ zIndex: 2147483647 }}
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-2">
        <WalkingDuck />
        <span className="tabular-nums text-sm font-black tracking-[0.18em] text-slate-700">
          {progress}%
        </span>
      </div>
    </div>
  );
}
