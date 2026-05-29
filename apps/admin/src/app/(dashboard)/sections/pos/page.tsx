"use client";

import { PosRegistersSection } from "@/components/organisms/sections/pos/PosRegistersSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function PosSectionPage() {
  return (
    <SectionsRouteFrame active="pos">
      <SectionContent>
        <PosRegistersSection />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
