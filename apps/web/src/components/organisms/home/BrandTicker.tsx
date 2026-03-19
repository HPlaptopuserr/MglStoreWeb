"use client";

import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { API } from "@/lib/api";
import { getInvestorRingStyle } from "@/lib/utils";

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
    <section className="py-12 border-t border-slate-100 bg-white">
      <div className="container mx-auto px-4 text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Crown size={14} className="text-amber-400" />
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Хөрөнгө оруулагчид
          </h3>
          <Crown size={14} className="text-amber-400" />
        </div>
      </div>

      <div className="relative flex overflow-hidden group">
        <div className="flex animate-marquee whitespace-nowrap gap-12 min-w-full items-center">
          {items.map((inv, i) => {
            const ringStyle = getInvestorRingStyle(inv.investmentLevel);
            return (
              <Link
                key={`${inv.id}-${i}`}
                href={`/organizations/${inv.slug}`}
                className="flex items-center gap-3 shrink-0 group/item hover:scale-105 transition-transform"
              >
                <div
                  className="rounded-full shrink-0"
                  style={
                    ringStyle
                      ? { ...ringStyle, borderRadius: "9999px" }
                      : undefined
                  }
                >
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-white overflow-hidden">
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
                </div>
                <span className="text-lg font-bold text-slate-300 group-hover/item:text-amber-500 transition-colors">
                  {inv.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>
    </section>
  );
};
