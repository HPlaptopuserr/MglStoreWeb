"use client";

import { Crown } from "lucide-react";
import { InvestorCard } from "@/components/molecules/InvestorCard";
import type { Investor } from "@/app/organizations/page";

interface InvestorsSectionProps {
  investors: Investor[];
}

const TIER_LABEL: Record<string, string> = {
  TOP: "Top Investor",
  STRATEGIC: "Strategic Investor",
  INVESTOR: "Investor",
};

export function InvestorsSection({ investors }: InvestorsSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#eef2f7_0%,#f8fafc_100%)]">
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col items-center gap-3 text-center sm:mb-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#FFAD02] shadow-sm shadow-slate-200/70">
            <Crown size={12} />
            Хөрөнгө оруулагчид
          </div>

          <h2 className="text-xl font-black text-slate-950 sm:text-3xl">
            Платформыг дэмжигчид
          </h2>
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            MGL Store-д итгэл үзүүлсэн хөрөнгө оруулагч байгууллагууд
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
          {investors.map((inv) => (
            <InvestorCard
              key={inv.id}
              name={inv.name}
              slug={inv.slug}
              logoUrl={inv.logoUrl}
              tier={inv.tier}
              tierLabel={inv.tierLabel || TIER_LABEL[inv.tier] || "Investor"}
              investmentLevel={inv.investmentLevel}
              description={inv.description}
              featured={inv.featured}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
