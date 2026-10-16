"use client";
import { useCallback, useEffect, useState } from "react";
import { requestError, transferRequest } from "./transfer-api";
/** Keep results tied to their request so old warehouse/search data cannot leak into a new view. */
export function useTransferResource<T>(path: string | null, delayMs = 0) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error: string;
  } | null>(null);
  const key = `${revision}:${path}`;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void transferRequest<T>(path, { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) setResult({ key, data, error: "" });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({ key, error: requestError(error) });
        });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, key, delayMs]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error ?? "",
    loading: Boolean(path && !current),
    refresh: useCallback(() => setRevision((value) => value + 1), []),
  };
}
