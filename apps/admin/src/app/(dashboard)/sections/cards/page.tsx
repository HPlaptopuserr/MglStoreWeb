"use client";

import { CardsSection } from "@/components/organisms/sections/cards/CardsSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function CardsSectionPage() {
  return (
    <SectionsRouteFrame active="cards">
      <SectionContent>
        <CardsSection />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
