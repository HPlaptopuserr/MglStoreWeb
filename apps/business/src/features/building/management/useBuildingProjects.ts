"use client";
import { useCallback, useEffect, useState } from "react";
import type { BuildingAdminProject, BuildingOrganization } from "@mgl/types";
import { managementFetch, responseError } from "@/features/building/api/management-client";

export function useBuildingProjects(enabled: boolean) {
  const [projects, setProjects] = useState<BuildingAdminProject[]>([]);
  const [organization, setOrganization] = useState<BuildingOrganization | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return;
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.all([
          managementFetch("admin/projects", { signal }),
          managementFetch("admin/organization", { signal }),
        ]);
        for (const response of responses) {
          if (!response.ok)
            throw new Error(
              await responseError(response, "Мэдээлэл ачаалж чадсангүй"),
            );
        }
        const [projectData, orgData] = await Promise.all(
          responses.map((response) => response.json()),
        );
        if (signal?.aborted) return;
        setProjects(
          (projectData as { projects: BuildingAdminProject[] }).projects,
        );
        setOrganization(
          (orgData as { organization: BuildingOrganization | null })
            .organization,
        );
      } catch (cause: unknown) {
        if (!signal?.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [enabled],
  );
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);
  return { projects, organization, loading, error, reload };
}
