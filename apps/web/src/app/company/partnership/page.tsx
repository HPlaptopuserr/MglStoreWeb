import React from "react";
import PartnershipFormSection from "./_sections/PartnershipFormSection";
import PartnershipFaqSection from "./_sections/PartnershipFaqSection";
import PartnershipServiceSection from "./_sections/PartnershipServiceSection";
import { PartnershipContact } from "@/components/organisms/partnership/PartnershipContact";
import { PartnershipHeroSection } from "./_sections/PartnershipHeroSection";
import { PartnershipWorksSection } from "./_sections/PartnershipWorksSection";

export default function PartnershipPage() {
  return (
    <div className="w-full">
      <PartnershipHeroSection />
      <PartnershipWorksSection />
      <PartnershipFormSection />
      <div className="w-full flex flex-col gap-12 py-12">
        <PartnershipFaqSection />
        <PartnershipContact />
      </div>
    </div>
  );
}
