import React from "react";
import CareersFormSection from "./_sections/CareersFormSection";
import CareersSequenceSection from "./_sections/CareersSequence";
import CareersWhyWeSection from "./_sections/CareersWhyWeSection";
import CareersFaqSection from "./_sections/CareersFaqSection";

export default function CareersPage() {
  return (
    <div className="">
      <div className="space-y-16 container mx-auto px-4 py-12">
        <CareersFormSection />
        <CareersSequenceSection />
        <CareersWhyWeSection />
        <CareersFaqSection />
      </div>
    </div>
  );
}
