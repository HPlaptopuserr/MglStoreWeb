"use client";

import Image from "next/image";
import Link from "next/link";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";

interface InvestorCardProps {
  name: string;
  slug: string;
  logoUrl?: string | null;
  tier: "TOP" | "STRATEGIC" | "INVESTOR";
  tierLabel: string;
  investmentLevel?: string | null;
  investmentAmount?: number | null;
  description?: string | null;
  featured?: boolean;
}

const TIER_STYLES = {
  TOP: {
    badge: "bg-[#FFAD02] text-slate-950",
    ring: "ring-1 ring-[#FFAD02]/35",
    glow: "shadow-xl shadow-[#FFAD02]/10",
    scale: "md:col-span-2 md:row-span-2",
    logoSize: "w-20 h-20 md:w-28 md:h-28",
    nameSize: "text-xl md:text-2xl",
  },
  STRATEGIC: {
    badge: "bg-slate-900 text-white",
    ring: "ring-1 ring-slate-200",
    glow: "shadow-lg shadow-slate-200/70",
    scale: "",
    logoSize: "w-16 h-16 md:w-20 md:h-20",
    nameSize: "text-base md:text-lg",
  },
  INVESTOR: {
    badge: "bg-slate-100 text-slate-700",
    ring: "ring-1 ring-slate-200",
    glow: "shadow-sm shadow-slate-200/70",
    scale: "",
    logoSize: "w-14 h-14 md:w-16 md:h-16",
    nameSize: "text-sm md:text-base",
  },
};

export function InvestorCard({
  name,
  slug,
  logoUrl,
  tier,
  tierLabel,
  investmentLevel,
  investmentAmount,
  description,
  featured,
}: InvestorCardProps) {
  const style = TIER_STYLES[tier] || TIER_STYLES.INVESTOR;

  return (
    <Link
      href={`/organizations/${slug}`}
      className={`group relative flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-200/80 md:p-8 ${style.ring} ${style.glow} ${style.scale}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b from-slate-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${style.badge}`}
        >
          {tierLabel}
        </span>
      </div>

      <div className="mt-2">
        <InvestorRingWrapper investmentAmount={investmentAmount} rounded="xl">
          <div
            className={`relative ${style.logoSize} overflow-hidden rounded-2xl bg-slate-50`}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={name}
                fill
                className="object-contain p-2"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </InvestorRingWrapper>
      </div>

      <h3
        className={`font-bold text-slate-950 ${style.nameSize} leading-tight`}
      >
        {name}
      </h3>

      {investmentLevel && (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
          {investmentLevel}
        </span>
      )}

      {/* Description */}
      {description && tier !== "INVESTOR" && (
        <p className="line-clamp-2 max-w-[240px] text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}

      <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-[#FFAD02]/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  );
}
