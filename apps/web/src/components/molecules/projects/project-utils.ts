import type { ProjectItem } from "./project-types";

export function formatMnt(value?: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

export function getProjectImages(project: ProjectItem) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

