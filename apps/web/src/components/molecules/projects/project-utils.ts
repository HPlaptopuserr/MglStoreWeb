import type { ProjectItem } from "./project-types";
import { resolveApiAssetUrl } from "@/lib/api";

export function formatMnt(value?: number) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "₮0";
  return `₮${Math.round(amount).toLocaleString("mn-MN")}`;
}

export function getProjectImages(project: ProjectItem) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((image): image is string => typeof image === "string")
        .map((image) => image.trim())
        .filter(Boolean),
    ),
  );
}

export function getResolvedProjectImages(project: ProjectItem) {
  return getProjectImages(project)
    .map((image) => resolveApiAssetUrl(image))
    .filter(Boolean);
}

export function resolveProjectFileUrl(url?: string | null) {
  return resolveApiAssetUrl(url);
}
