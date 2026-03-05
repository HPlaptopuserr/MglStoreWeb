"use client";

import { PartnerCard } from "@mgl/ui";
import { Handshake, TrendingUp, Briefcase, UserPlus } from "lucide-react";

export const PartnershipContact = () => {
  return (
    <section className="w-full py-16 px-4 md:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-78xl bg-white rounded-[2rem] p-8 md:p-16 shadow-sm border border-gray-100">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
          Хамтын ажиллагаа
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <PartnerCard
            title="Бизнесийн хамтрал"
            href="/company/partnership"
            MainIcon={Handshake}
            FloatingIcon={TrendingUp}
            bgCircle="bg-orange-100"
            floatBg="bg-blue-100"
            floatIconColor="text-blue-600"
            mainIconColor="text-[#FFB700]"
            floatPosition="-top-2 -right-2"
          />

          <PartnerCard
            title="Ажилд орох"
            href="/company/careers"
            MainIcon={Briefcase}
            FloatingIcon={UserPlus}
            bgCircle="bg-purple-100"
            floatBg="bg-green-100"
            floatIconColor="text-green-600"
            mainIconColor="text-purple-600"
            floatPosition="-bottom-2 -left-2"
          />
        </div>
      </div>
    </section>
  );
};
