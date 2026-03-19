"use client";

import { PartnershipWorkInfoCard } from "@/components/molecules/PartnershipWorkInfoCard";
import { partnershipServices } from "@/lib/mock-data";

export default function PartnershipServiceSection() {
  const displayedCards = partnershipServices.slice(0, 8);
  return (
    <section className="w-full py-10 md:py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center md:text-left">
          Хамтын ажиллагааны үйлчилгээ
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedCards.map((service) => (
            <PartnershipWorkInfoCard key={service.title} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
}
