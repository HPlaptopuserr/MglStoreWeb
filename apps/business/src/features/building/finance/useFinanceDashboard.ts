"use client";
import { useEffect, useState } from "react";
import { managementFetch, responseError } from "@/features/building/api/management-client";
import type { DashboardData } from "../dashboard/model";

export function useFinanceDashboard(project: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const key = `${project}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    void managementFetch(`admin/dashboard${project ? `?project=${encodeURIComponent(project)}` : ""}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(await responseError(response, "Мэдээлэл ачаалж чадсангүй"));
        return response.json() as Promise<DashboardData>;
      }).then(value => { if (!controller.signal.aborted) { setData(value); setError(""); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "Алдаа гарлаа"); } })
      .finally(() => { if (!controller.signal.aborted) setLoadedKey(key); });
    return () => controller.abort();
  }, [project, revision, key]);
  return { data: loadedKey === key ? data : null, error: loadedKey === key ? error : "", loading: loadedKey !== key, reload: () => setRevision(value => value + 1) };
}
