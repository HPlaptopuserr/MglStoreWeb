"use client";

import { PartnerCard } from "@mgl/ui";
import { Handshake, TrendingUp, Briefcase, UserPlus } from "lucide-react";

export const PartnershipContact = () => {
  return (
    <section className="w-full py-12">
      <div className="mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
            Partnership
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Хамтын ажиллагаа
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Бизнесээ өргөжүүлэх эсвэл MGL Store багт нэгдэх боломжууд.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
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
