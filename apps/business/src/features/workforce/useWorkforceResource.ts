"use client";

import { useEffect, useState } from "react";

interface ResourceResult<T> {
  path: string;
  refreshToken: unknown;
  revision: number;
  data: T | null;
  error: string;
}

/** Fetch a workforce resource, discarding responses from earlier selections. */
export function useWorkforceResource<T>(
  path: string | null,
  refreshToken: unknown = null,
  revision = 0,
) {
  const [result, setResult] = useState<ResourceResult<T> | null>(null);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const selection = { path, refreshToken, revision };

    void (async () => {
      try {
        const response = await fetch(`/api/workforce/${path}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? payload.message
              : null;
          throw new Error(
            typeof message === "string" ? message : "Мэдээлэл ачаалж чадсангүй",
          );
        }
        if (!controller.signal.aborted)
          setResult({ ...selection, data: payload as T, error: "" });
      } catch (cause) {
        if (!controller.signal.aborted)
          setResult({
            ...selection,
            data: null,
            error: cause instanceof Error ? cause.message : "Холболтын алдаа",
          });
      }
    })();

    return () => controller.abort();
  }, [path, refreshToken, revision]);

  const current =
    result?.path === path &&
    result.refreshToken === refreshToken &&
    result.revision === revision
      ? result
      : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: Boolean(path && !current),
  };
}
