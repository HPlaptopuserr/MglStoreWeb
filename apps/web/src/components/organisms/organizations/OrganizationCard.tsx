"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { toCategoryMN } from "@/lib/constants";
import { getInvestorRingStyle } from "@/lib/utils";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  category: string;
  rating: number;
  deliveryTime: string;
  products: string[];
  isInvestor?: boolean;
  investmentAmount?: number;
}

interface OrganizationCardProps {
  company: StoreItem;
}

export function OrganizationCard({ company }: OrganizationCardProps) {
  return (
    <Link
      href={`/organizations/${company.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-900/8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-gray-900/12"
    >
      {/* Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Open badge */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm ${
              company.isOpen
                ? "bg-emerald-500/90 text-white"
                : "bg-black/50 text-white/70"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${company.isOpen ? "bg-white" : "bg-gray-400"}`} />
            {company.isOpen ? "Нээлттэй" : "Хаалттай"}
          </span>
        </div>

        {/* Category pill */}
        <div className="absolute bottom-2.5 left-[68px] z-10 sm:left-[72px]">
          <span className="inline-block rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
            {toCategoryMN(company.category)}
          </span>
        </div>

        {/* Logo */}
        <div className="absolute bottom-[-20px] left-3 z-10 sm:bottom-[-22px] sm:left-4">
          <div
            style={
              company.isInvestor && company.investmentAmount
                ? { ...getInvestorRingStyle(company.investmentAmount), borderRadius: "9999px" }
                : undefined
            }
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md sm:h-14 sm:w-14">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-7 sm:px-4 sm:pb-4 sm:pt-8">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-[13px] font-bold text-gray-900 group-hover:text-black sm:text-sm">
                {company.name}
              </h3>
              {company.isInvestor && (
                <BadgeCheck size={13} className="shrink-0 text-[#FFAD02]" />
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs font-bold text-[#FFAD02]">Дэлгэрэнгүй</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFAD02]/10 transition-colors group-hover:bg-[#FFAD02]/20">
            <ArrowUpRight size={13} className="text-[#FFAD02] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
