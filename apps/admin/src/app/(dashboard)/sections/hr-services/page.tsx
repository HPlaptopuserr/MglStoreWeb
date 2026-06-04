"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { HrServicesSection } from "@/components/organisms/sections/hr-services/HrServicesSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function HrServicesSectionPage() {
  const { hrServices, setHrServices, saving, saved, saveHrServices } =
    useSiteSettings();

  return (
    <SectionsRouteFrame
      active="hr-services"
      onSave={() => saveHrServices()}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <HrServicesSection
          hrServices={hrServices}
          setHrServices={setHrServices}
          onSave={() => saveHrServices()}
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
