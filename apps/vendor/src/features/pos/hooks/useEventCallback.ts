"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/** Stable UI handler that always uses the latest committed cart/payment state. */
export function useEventCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  }, [callback]);
  return useCallback((...args: Args) => latest.current(...args), []);
}
