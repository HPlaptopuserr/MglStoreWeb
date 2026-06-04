"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { ProjectsSection } from "@/components/organisms/sections/projects/ProjectsSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function FranchiseSectionPage() {
  const {
    franchiseProjects,
    setFranchiseProjects,
    projectPaymentAccounts,
    saving,
    saved,
    saveFranchiseProjects,
  } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="franchise"
      onSave={saveFranchiseProjects}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <ProjectsSection
          mode="franchise"
          projects={franchiseProjects}
          paymentAccounts={projectPaymentAccounts}
          setProjects={setFranchiseProjects}
          onSave={saveFranchiseProjects}
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
