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
  investmentAmount?: number | null;
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
    <section className="relative overflow-hidden border-y border-slate-900 bg-[#050812] py-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,158,11,0.18),transparent_42%),linear-gradient(90deg,rgba(15,23,42,0.92),rgba(2,6,23,0.72),rgba(15,23,42,0.92))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      <div className="container relative mx-auto mb-2 px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-white/[0.04] px-3.5 py-1 shadow-[0_10px_26px_rgba(245,158,11,0.1)] backdrop-blur">
          <Crown size={12} className="text-amber-300" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100">
            Хөрөнгө оруулагчид
          </h3>
          <Crown size={12} className="text-amber-300" />
        </div>
      </div>

      <div className="group relative flex overflow-hidden">
        <div className="flex min-w-full animate-marquee items-center gap-10 whitespace-nowrap py-0.5">
          {items.map((inv, i) => {
            return (
              <Link
                key={`${inv.id}-${i}`}
                href={`/organizations/${inv.slug}`}
                className="group/item flex shrink-0 items-center gap-2.5 rounded-full border border-white/5 bg-white/[0.03] py-1 pl-1 pr-3.5 shadow-sm shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-amber-300/25 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-amber-950/30"
              >
                <InvestorRingWrapper investmentAmount={inv.investmentAmount} rounded="full">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-white p-0.5 shadow-md shadow-black/25">
                    <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-100">
                      {inv.logoUrl ? (
                        <Image
                          src={inv.logoUrl}
                          alt={inv.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-400">
                          {inv.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </InvestorRingWrapper>
                <span className="max-w-[240px] truncate text-sm font-black tracking-tight text-slate-200 transition-colors group-hover/item:text-amber-200">
                  {inv.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#050812] via-[#050812]/90 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#050812] via-[#050812]/90 to-transparent" />
      </div>
    </section>
  );
};
