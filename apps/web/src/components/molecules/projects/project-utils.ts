import type { ProjectItem } from "./project-types";

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

export function getResponsiblePeople(project: ProjectItem) {
  return Array.isArray(project.responsiblePeople)
    ? project.responsiblePeople.filter(
        (person) =>
          person?.name ||
          person?.role ||
          person?.responsibility ||
          person?.phone ||
          person?.email ||
          person?.avatarUrl,
      )
    : [];
}
