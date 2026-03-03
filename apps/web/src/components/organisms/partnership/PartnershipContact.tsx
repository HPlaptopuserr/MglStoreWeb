import React from "react";
import { PartnerCard } from "../../molecules/cards/PartnerCard";

export const PartnerShipContact = () => {
  return (
    <section className="w-full py-12 bg-white rounded-2xl shadow-sm">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="text-center text-xl md:text-2xl font-semibold mb-10 text-gray-900">
          Хамтын ажиллагаа
        </h2>

        <div className="w-full max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <PartnerCard
              title="Бизнесийн"
              highlight="хамтрал"
              image="/images/handshake.png"
              href="/company/partnership"
            />

            <PartnerCard
              title="Ажилд орох"
              image="/images/job.png"
              href="/career"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
