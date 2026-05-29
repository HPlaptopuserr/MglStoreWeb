"use client";

import { QrGeneratorPanel } from "@/components/organisms/QrGeneratorPanel";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function QrSectionPage() {
  return (
    <SectionsRouteFrame active="qr">
      <SectionContent>
        <QrGeneratorPanel showHeader={false} />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
