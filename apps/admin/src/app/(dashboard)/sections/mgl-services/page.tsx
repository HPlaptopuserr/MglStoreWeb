"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { MglServicesSection } from "@/components/organisms/sections/mgl-services/MglServicesSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function MglServicesSectionPage() {
  const { mglServices, setMglServices, saving, saved, saveMglServices } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="mgl-services"
      onSave={() => saveMglServices()}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <MglServicesSection
          mglServices={mglServices}
          setMglServices={setMglServices}
          onSave={() => saveMglServices()}
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
