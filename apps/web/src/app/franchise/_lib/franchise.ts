export type FranchiseProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  pdfPreviewUrl?: string;
  pdfThumbnailUrl?: string;
  contractTemplateId?: string;
  contractUrl?: string;
  responsiblePeople?: ProjectResponsiblePerson[];
  tags?: string[];
  isActive?: boolean;
};

export type ProjectResponsiblePerson = {
  id?: string;
  teamMemberId?: string;
  name?: string;
  role?: string;
  responsibility?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
};

export function getProjectImages(project: FranchiseProject) {
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

export function getResponsiblePeople(project: FranchiseProject) {
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

export function formatMnt(value?: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

export function isMglStoreFranchise(project: Pick<FranchiseProject, "title">) {
  const title = String(project.title || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return title.includes("mglstore");
}

export function sortMglStoreFranchiseFirst(projects: FranchiseProject[]) {
  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => {
      const aPriority = isMglStoreFranchise(a.project) ? 0 : 1;
      const bPriority = isMglStoreFranchise(b.project) ? 0 : 1;
      return aPriority - bPriority || a.index - b.index;
    })
    .map(({ project }) => project);
}

export function getContractHref(project: FranchiseProject) {
  if (project.contractUrl) return project.contractUrl;
  if (project.contractTemplateId) {
    return `/contract/sign/${encodeURIComponent(project.contractTemplateId)}`;
  }
  return "";
}
