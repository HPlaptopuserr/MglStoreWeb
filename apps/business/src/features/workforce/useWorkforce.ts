"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { WorkforceSnapshot } from "@mgl/types";
export interface WorkforceRange {
  from: string;
  to: string;
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function useWorkforce() {
  const router = useRouter(),
    search = useSearchParams(),
    organizationId = search.get("organizationId") ?? "";
  const [range, setRange] = useState<WorkforceRange>(() => ({
    from: today(),
    to: today(),
  }));
  const [data, setData] = useState<WorkforceSnapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [toast, setToast] = useState("");
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        let selected = organizationId;
        if (!selected) {
          const session = await fetch("/api/workforce-session", {
            signal: controller.signal,
          });
          const result = (await session.json()) as {
            message?: string;
            organizations?: { id: string }[];
          };
          if (session.status === 401) {
            router.replace("/attendance/login");
            return;
          }
          if (!session.ok)
            throw new Error(result.message ?? "Эрх шалгахад алдаа гарлаа");
          selected = result.organizations?.[0]?.id ?? "";
        }
        const query = new URLSearchParams({
          from: range.from,
          to: range.to,
          organizationId: selected,
        });
        const response = await fetch(`/api/workforce/snapshot?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/attendance/login");
          return;
        }
        if (!response.ok) {
          const result = (await response.json()) as { message?: string };
          throw new Error(result.message ?? "Мэдээлэл ачаалж чадсангүй");
        }
        const snapshot = (await response.json()) as WorkforceSnapshot;
        if (!controller.signal.aborted) setData(snapshot);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Холболтын алдаа");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [organizationId, range.from, range.to, revision, router]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const run = useCallback(
    async <T = unknown>(
      path: string,
      method = "POST",
      body?: unknown,
    ): Promise<T> => {
      const query = new URLSearchParams({
        organizationId: data?.organization.id ?? organizationId,
      });
      const response = await fetch(`/api/workforce/${path}?${query}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = (await response.json()) as T & { message?: string };
      if (response.status === 401) router.replace("/attendance/login");
      if (!response.ok) throw new Error(result.message ?? "Үйлдэл амжилтгүй");
      refresh();
      return result;
    },
    [data?.organization.id, organizationId, refresh, router],
  );
  return {
    data:
      data &&
      data.range.from === range.from &&
      data.range.to === range.to &&
      (!organizationId || data.organization.id === organizationId)
        ? data
        : null,
    loading,
    error,
    range,
    setRange,
    refresh,
    run,
    toast,
    setToast,
  };
}
export type WorkforceController = ReturnType<typeof useWorkforce>;
