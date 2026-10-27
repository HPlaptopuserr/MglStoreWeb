import type { BuildingProjectSummary, BuildingProjectDetail } from "@mgl/types";
import { buildingApiBase as base } from "@/features/building/server/building-session";

export async function getBuildingProjects(): Promise<BuildingProjectSummary[]> {
  const response = await fetch(`${base}/api/building/projects`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Төслүүдийг ачаалж чадсангүй");
  const data = (await response.json()) as {
    projects: BuildingProjectSummary[];
  };
  return data.projects;
}
export async function getBuildingProject(
  id: string,
): Promise<BuildingProjectDetail | null> {
  const response = await fetch(
    `${base}/api/building/projects/${encodeURIComponent(id)}`,
    { cache: "no-store", signal: AbortSignal.timeout(10000) },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Төслийг ачаалж чадсангүй");
  const data = (await response.json()) as { project: BuildingProjectDetail };
  return data.project;
}
