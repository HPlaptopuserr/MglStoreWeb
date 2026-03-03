import React from "react";
import PartnershipInfoSection from "./_sections/PartnershipInfoSection";
import PartnershipFormSection from "./_sections/PartnershipFormSection";
import PartnershipFaqSection from "./_sections/PartnershipFaqSection";
import PartnershipServiceSection from "./_sections/PartnershipServiceSection";
import { PartnerShipContact } from "@/components/organisms/partnership/PartnershipContact";

export default function PartnershipPage() {
  return (
    <div className="w-full">
      <PartnershipInfoSection />
      <PartnershipServiceSection />
      <PartnershipFormSection />
      <div className="w-full flex flex-col gap-12 py-12">
        <PartnershipFaqSection />
        <PartnerShipContact />
      </div>
    </div>
  );
}
