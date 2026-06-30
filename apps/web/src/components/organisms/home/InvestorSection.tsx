"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { API } from "@/lib/api";
import { InvestorCard } from "@/components/molecules/InvestorCard";

interface Investor {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  tier: "TOP" | "STRATEGIC" | "INVESTOR";
  tierLabel: string;
  featured: boolean;
  investmentLevel: string | null;
  investmentAmount?: number | null;
  joinedAt: string;
}

export function InvestorSection() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API}/investors/featured`);
        if (!res.ok) throw new Error("Failed to fetch investors");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setInvestors(data);
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || investors.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gray-950 px-6 py-12 md:px-12 md:py-16 my-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/[0.05] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.04),_transparent_70%)]" />
      </div>

      <div className="relative mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5">
          <Crown size={14} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Хөрөнгө оруулагчид
          </span>
        </div>
        <h2 className="text-2xl font-black text-white md:text-3xl">
          Платформыг дэмжигчид
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
          MGL Store-д итгэл үзүүлсэн хөрөнгө оруулагч байгууллагууд
        </p>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {investors.map((inv) => (
          <InvestorCard
            key={inv.id}
            name={inv.name}
            slug={inv.slug}
            logoUrl={inv.logoUrl}
            tier={inv.tier}
            tierLabel={inv.tierLabel}
            investmentLevel={inv.investmentLevel}
            investmentAmount={inv.investmentAmount}
            description={inv.description}
            featured={inv.featured}
          />
        ))}
      </div>
    </section>
  );
}
