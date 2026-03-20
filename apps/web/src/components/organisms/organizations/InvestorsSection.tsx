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
    <div className="relative bg-gray-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/[0.05] blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5">
            <Crown size={14} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Хөрөнгө оруулагчид
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white">
            Платформыг дэмжигчид
          </h2>

          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            MGL Store-д итгэл үзүүлсэн хөрөнгө оруулагч байгууллагууд
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
    </div>
  );
}