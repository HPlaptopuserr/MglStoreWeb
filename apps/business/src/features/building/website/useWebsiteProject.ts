"use client";
import { useCallback, useEffect, useState } from "react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/features/building/api/management-client";
export function useWebsiteProject(id: string) {
  const [project, setProject] = useState<WebsiteProject | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await managementFetch(`admin/projects/${id}/website`, {
          signal,
        });
        if (!response.ok)
          throw new Error(
            await responseError(response, "Төсөл ачаалж чадсангүй"),
          );
        const result = (await response.json()) as { project: WebsiteProject };
        if (!signal?.aborted) setProject(result.project);
      } catch (cause) {
        if (!signal?.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
  );
  useEffect(() => {
    const c = new AbortController();
    void reload(c.signal);
    return () => c.abort();
  }, [reload]);
  return { project, setProject, loading, error, setError, reload };
}
