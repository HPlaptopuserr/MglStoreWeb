"use client";

import { HrSection } from "@/components/organisms/sections/hr/HrSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function HrSectionPage() {
  return (
    <SectionsRouteFrame active="hr">
      <SectionContent>
        <HrSection />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
