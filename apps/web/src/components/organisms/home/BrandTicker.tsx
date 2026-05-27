"use client";

import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { API } from "@/lib/api";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";

interface Investor {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  tier: string;
  investmentLevel: string | null;
}

export const BrandTicker = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);

  useEffect(() => {
    fetch(`${API}/investors`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setInvestors(data);
      })
      .catch(() => {});
  }, []);

  if (investors.length === 0) return null;

  const items = [...investors, ...investors, ...investors];

  return (
    <section className="border-y border-slate-100 bg-slate-950 py-10 text-white">
      <div className="container mx-auto mb-7 px-4 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5">
          <Crown size={14} className="text-amber-300" />
          <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
            Хөрөнгө оруулагчид
          </h3>
          <Crown size={14} className="text-amber-300" />
        </div>
      </div>

      <div className="relative flex overflow-hidden group">
        <div className="flex animate-marquee whitespace-nowrap gap-12 min-w-full items-center">
          {items.map((inv, i) => {
            return (
              <Link
                key={`${inv.id}-${i}`}
                href={`/organizations/${inv.slug}`}
                className="flex items-center gap-3 shrink-0 group/item hover:scale-105 transition-transform"
              >
                <InvestorRingWrapper investmentAmount={inv.investmentLevel} rounded="full">
                  <div className="w-10 h-10 rounded-full bg-white overflow-hidden">
                    <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100">
                      {inv.logoUrl ? (
                        <Image
                          src={inv.logoUrl}
                          alt={inv.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400">
                          {inv.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </InvestorRingWrapper>
                <span className="text-lg font-bold text-slate-300 transition-colors group-hover/item:text-amber-300">
                  {inv.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-950 to-transparent" />
      </div>
    </section>
  );
};
