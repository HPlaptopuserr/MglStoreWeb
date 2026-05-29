"use client";

import { TeamSection } from "@/components/organisms/sections/team/TeamSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function TeamSectionPage() {
  return (
    <SectionsRouteFrame active="team">
      <SectionContent>
        <TeamSection />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
