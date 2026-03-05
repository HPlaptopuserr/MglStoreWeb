import React from "react";
import CareersFormSection from "./_sections/CareersFormSection";
import CareersHero from "./_sections/CareersHero";
import CareersWhyWeSection from "./_sections/CareersWhyWeSection";
import CareersFaqSection from "./_sections/CareersFaqSection";
import CareersWhoJoin from "./_sections/CareersWhoJoin";
import { BrandTicker } from "@/components/organisms/home/BrandTicker";
import { PartnershipContact } from "@/components/organisms/partnership/PartnershipContact";

export default function CareersPage() {
  return (
    <div className="">
      <CareersHero />
      <CareersWhyWeSection />
      <CareersWhoJoin />
      <CareersFormSection />
      <PartnershipContact />
      <BrandTicker />
    </div>
  );
}
