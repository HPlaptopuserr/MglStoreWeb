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
    <div className="relative overflow-hidden bg-[#0D0D0D]">
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-amber-500/8 blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      {/* Divider line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFAD02]/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFAD02]/20 bg-[#FFAD02]/10 px-4 py-1.5">
            <Crown size={12} className="text-[#FFAD02]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFAD02]">
              Хөрөнгө оруулагчид
            </span>
          </div>

          <h2 className="text-xl font-black text-white sm:text-3xl">
            Платформыг дэмжигчид
          </h2>
          <p className="max-w-sm text-sm text-gray-500">
            MGL Store-д итгэл үзүүлсэн хөрөнгө оруулагч байгууллагууд
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
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

      {/* Bottom fade to light */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent" />
    </div>
  );
}
