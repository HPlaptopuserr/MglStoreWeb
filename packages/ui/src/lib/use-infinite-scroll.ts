"use client";

import {
  useEffect,
  useRef,
  type RefObject,
  type MutableRefObject,
} from "react";

interface UseInfiniteScrollOptions {
  enabled: boolean;
  onLoadMore: () => void | Promise<void>;
  onError?: (error: unknown) => void;
  rootRef?: RefObject<Element | null>;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useInfiniteScroll<T extends Element = HTMLDivElement>({
  enabled,
  onLoadMore,
  onError,
  rootRef,
  rootMargin = "600px 0px",
  threshold = 0,
}: UseInfiniteScrollOptions): RefObject<T | null> {
  const sentinelRef = useRef<T>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const onErrorRef = useRef(onError);
  const triggeredRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
    onErrorRef.current = onError;
  }, [onError, onLoadMore]);

  useEffect(() => {
    if (!enabled) triggeredRef.current = false;
  }, [enabled]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !enabled ||
      !sentinel ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggeredRef.current) return;
        triggeredRef.current = true;
        Promise.resolve(onLoadMoreRef.current()).catch((error: unknown) => {
          triggeredRef.current = false;
          onErrorRef.current?.(error);
        });
      },
      {
        root: rootRef?.current ?? null,
        rootMargin,
        threshold,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, rootMargin, rootRef, threshold]);

  return sentinelRef as MutableRefObject<T | null>;
}
