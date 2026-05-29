"use client";

import { VendorFeaturesSection } from "@/components/organisms/sections/vendor-features/VendorFeaturesSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function VendorFeaturesSectionPage() {
  return (
    <SectionsRouteFrame active="vendor-features">
      <SectionContent>
        <VendorFeaturesSection />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
