"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { clubPresentationPages } from "./club-presentation";

const LAST_PAGE = clubPresentationPages.length - 1;

export function useClubPresentation() {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useLockBodyScroll(expanded);

  const selectPage = useCallback((index: number) => {
    setPage(Math.max(0, Math.min(LAST_PAGE, index)));
  }, []);
  const next = useCallback(
    () => setPage((value) => Math.min(LAST_PAGE, value + 1)),
    [],
  );
  const previous = useCallback(
    () => setPage((value) => Math.max(0, value - 1)),
    [],
  );

  const close = useCallback(() => {
    if (document.fullscreenElement === viewerRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setExpanded(false);
  }, []);

  function toggleExpanded() {
    if (expanded) {
      close();
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setExpanded(true);
    // Keep the immersive layout available when native fullscreen is unsupported.
    void viewerRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  useEffect(() => {
    if (!expanded) return;
    const focus = previousFocus.current;
    expandButtonRef.current?.focus();
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      focus?.focus({ preventScroll: true });
    };
  }, [expanded]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const viewer = viewerRef.current;
      if (!viewer || (!expanded && !viewer.contains(document.activeElement)))
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.matches("select, input, textarea, [contenteditable='true']")
      )
        return;
      if (expanded && event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (["ArrowRight", "PageDown"].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        selectPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectPage(LAST_PAGE);
      } else if (expanded && event.key === "Tab") {
        const controls = Array.from(
          viewer.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], select, summary, [tabindex='0']",
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded, close, next, previous, selectPage]);

  return {
    page,
    expanded,
    viewerRef,
    expandButtonRef,
    selectPage,
    next,
    previous,
    toggleExpanded,
  };
}
