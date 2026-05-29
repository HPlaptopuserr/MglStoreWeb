"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { BranchesSection } from "@/components/organisms/sections/branches/BranchesSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function BranchesSectionPage() {
  const {
    showBranchMapOnWeb,
    branchMapVisibilitySaving,
    toggleBranchMapOnWeb,
  } = useSiteSettings();

  return (
    <SectionsRouteFrame active="branches">
      <SectionContent>
        <BranchesSection
          showBranchMapOnWeb={showBranchMapOnWeb}
          onToggle={toggleBranchMapOnWeb}
          saving={branchMapVisibilitySaving}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
