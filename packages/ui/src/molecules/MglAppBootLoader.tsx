"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "../lib";
import { WalkingDuck } from "./MglLoadingScreen";

type MglAppBootLoaderProps = {
  label?: string;
  minimumVisibleMs?: number;
  maxWaitMs?: number;
  criticalImageWaitMs?: number;
  className?: string;
};

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();

  return new Promise<void>((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

async function waitForFonts() {
  if (!("fonts" in document)) return;
  await document.fonts.ready.catch(() => undefined);
}

function isCriticalImage(image: HTMLImageElement) {
  if (image.loading === "lazy") return false;
  if (image.closest("[data-loader-ignore]")) return false;

  const rect = image.getBoundingClientRect();
  const hasLayout = rect.width > 0 && rect.height > 0;
  const isNearFirstViewport =
    rect.top < window.innerHeight + 240 && rect.bottom > -120;

  return hasLayout && isNearFirstViewport;
}

async function waitForCriticalImages(timeoutMs: number) {
  const images = Array.from(document.images).filter(
    (image) =>
      isCriticalImage(image) && (!image.complete || image.naturalWidth === 0),
  );

  if (images.length === 0) return;

  await Promise.race([
    Promise.all(
      images.map(async (image) => {
        await image.decode().catch(() => undefined);
      }),
    ),
    wait(timeoutMs),
  ]);
}

function waitForPaintFrames(frameCount = 2) {
  return new Promise<void>((resolve) => {
    let frames = 0;
    const tick = () => {
      frames += 1;
      if (frames >= frameCount) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForAppReady({
  minimumVisibleMs,
  maxWaitMs,
  criticalImageWaitMs,
}: {
  minimumVisibleMs: number;
  maxWaitMs: number;
  criticalImageWaitMs: number;
}) {
  const startedAt = window.performance.now();
  const readiness = (async () => {
    await waitForWindowLoad();
    await waitForFonts();
    await waitForPaintFrames();
    await waitForCriticalImages(criticalImageWaitMs);
  })();

  await Promise.race([readiness, wait(maxWaitMs)]);

  const elapsed = window.performance.now() - startedAt;
  if (elapsed < minimumVisibleMs) {
    await wait(minimumVisibleMs - elapsed);
  }
}

export function MglAppBootLoader({
  label = "Ачааллаж байна",
  minimumVisibleMs = 320,
  maxWaitMs = 2500,
  criticalImageWaitMs = 700,
  className,
}: MglAppBootLoaderProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    let animationFrame = 0;
    let progressTimeout = 0;
    let cancelled = false;

    setVisible(true);
    setProgress(8);

    const tick = () => {
      setProgress((current) => {
        if (current >= 92) return current;
        const increment = current < 45 ? 7 : current < 75 ? 4 : 2;
        return Math.min(92, current + increment);
      });
      progressTimeout = window.setTimeout(() => {
        animationFrame = window.requestAnimationFrame(tick);
      }, 140);
    };

    animationFrame = window.requestAnimationFrame(tick);

    const complete = async () => {
      await waitForAppReady({
        minimumVisibleMs,
        maxWaitMs,
        criticalImageWaitMs,
      });
      if (cancelled || loadIdRef.current !== loadId) return;
      window.clearTimeout(progressTimeout);
      window.cancelAnimationFrame(animationFrame);
      setProgress(100);
      window.setTimeout(() => {
        if (!cancelled && loadIdRef.current === loadId) setVisible(false);
      }, 180);
    };

    complete();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(progressTimeout);
    };
  }, [criticalImageWaitMs, maxWaitMs, minimumVisibleMs, pathname]);

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
