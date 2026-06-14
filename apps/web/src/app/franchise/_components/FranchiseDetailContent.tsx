"use client";

import { PaidAccessDetailContent } from "@/components/molecules/paid-access/PaidAccessDetailContent";
import { resolveProjectFileUrl } from "@/components/molecules/projects/project-utils";
import type { FranchiseProject } from "../_lib/franchise";
import {
  getContractHref,
  getProjectImages,
  getResponsiblePeople,
} from "../_lib/franchise";

export function FranchiseDetailContent({
  project,
  onBack,
}: {
  project: FranchiseProject;
  onBack?: () => void;
}) {
  return (
    <PaidAccessDetailContent
      kindLabel="Franchise"
      title={project.title}
      accessMessage="Франчайз танилцуулга, дэлгэрэнгүй мэдээлэл болон PDF нээгдлээ."
      images={getProjectImages(project)}
      body={project.details || project.summary}
      people={getResponsiblePeople(project)}
      pdfUrl={resolveProjectFileUrl(project.pdfUrl)}
      contractHref={getContractHref(project)}
      contractLabel="Гэрээ хийх"
      onBack={onBack}
    />
  );
}
