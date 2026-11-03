import type { WebsiteProject } from "@mgl/types/building-website";

type ProjectAddress = Pick<WebsiteProject, "slug">;
export function buildingPlaceUrl(
  project: ProjectAddress,
  preview: boolean,
  block?: string,
  floor?: number,
  unit?: string,
) {
  const segments = ["building", preview ? "preview" : "hotkhon", project.slug];
  if (block !== undefined) segments.push(block);
  if (floor !== undefined) segments.push(String(floor));
  if (unit !== undefined) segments.push(unit);
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

/** Project information has a dedicated route in both public and preview modes. */
export function buildingProjectDetailsUrl(
  project: ProjectAddress,
  preview: boolean,
) {
  return `${buildingPlaceUrl(project, preview)}/details`;
}

/** Dedicated full-page masterplan for choosing a block before a floor and unit. */
export function buildingBlockSelectionUrl(
  project: ProjectAddress,
  preview: boolean,
) {
  return `${buildingPlaceUrl(project, preview)}/blocks`;
}
