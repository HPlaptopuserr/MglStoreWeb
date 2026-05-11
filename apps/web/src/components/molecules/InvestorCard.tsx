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
  description?: string | null;
  featured?: boolean;
}

const TIER_STYLES = {
  TOP: {
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900",
    ring: "ring-2 ring-amber-400/40",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
    scale: "md:col-span-2 md:row-span-2",
    logoSize: "w-20 h-20 md:w-28 md:h-28",
    nameSize: "text-xl md:text-2xl",
  },
  STRATEGIC: {
    badge: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
    ring: "ring-1 ring-purple-400/30",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.1)]",
    scale: "",
    logoSize: "w-16 h-16 md:w-20 md:h-20",
    nameSize: "text-base md:text-lg",
  },
  INVESTOR: {
    badge: "bg-gray-700 text-gray-200",
    ring: "ring-1 ring-gray-700/30",
    glow: "",
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
  description,
  featured,
}: InvestorCardProps) {
  const style = TIER_STYLES[tier] || TIER_STYLES.INVESTOR;

  return (
    <Link
      href={`/organizations/${slug}`}
      className={`group relative flex flex-col items-center gap-4 rounded-2xl border border-gray-800/60 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-6 md:p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${style.ring} ${style.glow} ${style.scale}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${style.badge}`}
        >
          {tierLabel}
        </span>
      </div>

      <div className="mt-2">
        <InvestorRingWrapper investmentAmount={investmentLevel} rounded="xl">
          <div
            className={`relative ${style.logoSize} rounded-2xl bg-white/10 backdrop-blur-sm overflow-hidden`}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={name}
                fill
                className="object-contain p-2"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/40">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </InvestorRingWrapper>
      </div>

      <h3
        className={`font-bold text-white ${style.nameSize} leading-tight`}
      >
        {name}
      </h3>

      {/* Investment level label */}
{/*       {investmentLevel && (
        <span className="text-xs font-medium text-amber-400/80">
          {investmentLevel}
        </span>
      )}
 */}
      {/* Description */}
      {description && tier !== "INVESTOR" && (
        <p className="text-xs text-gray-400 line-clamp-2 max-w-[240px]">
          {description}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  );
}
