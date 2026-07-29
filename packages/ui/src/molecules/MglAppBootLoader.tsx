"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "../lib";
import { MglCraneLoader } from "./MglLoadingScreen";

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
  minimumVisibleMs = 1350,
  maxWaitMs = 2500,
  criticalImageWaitMs = 700,
  className,
}: MglAppBootLoaderProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    let cancelled = false;

    setVisible(true);

    const complete = async () => {
      await waitForAppReady({
        minimumVisibleMs,
        maxWaitMs,
        criticalImageWaitMs,
      });
      if (cancelled || loadIdRef.current !== loadId) return;
      window.setTimeout(() => {
        if (!cancelled && loadIdRef.current === loadId) setVisible(false);
      }, 180);
    };

    complete();

    return () => {
      cancelled = true;
    };
  }, [criticalImageWaitMs, maxWaitMs, minimumVisibleMs, pathname]);

  if (!visible) return null;

  return (
    <div
      className={cn("mgl-app-boot-loader", className)}
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <MglCraneLoader />
      <style>{`
        .mgl-app-boot-loader {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: grid;
          min-height: 100dvh;
          place-items: center;
          padding: 24px;
          color: #020617;
          background: radial-gradient(
            circle at 50% 43%,
            #ffffff 0%,
            #fbfcfe 58%,
            #f4f7fb 100%
          );
          transition: opacity 200ms ease;
        }

      `}</style>
    </div>
  );
}
