"use client";

import { PaidAccessDetailContent } from "@/components/molecules/paid-access/PaidAccessDetailContent";
import type { ProjectItem } from "./project-types";
import {
  getProjectImages,
  getResponsiblePeople,
  resolveProjectFileUrl,
} from "./project-utils";

export function ProjectDetailContent({
  project,
  onBack,
}: {
  project: ProjectItem;
  onBack?: () => void;
}) {
  return (
    <PaidAccessDetailContent
      kindLabel="Төсөл"
      title={project.title}
      accessMessage="Таны access баталгаажсан тул дэлгэрэнгүй мэдээлэл болон PDF нээгдлээ."
      images={getProjectImages(project)}
      body={project.details || project.summary}
      people={getResponsiblePeople(project)}
      pdfUrl={resolveProjectFileUrl(project.pdfUrl)}
      onBack={onBack}
    />
  );
}
