"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { toCategoryMN } from "@/lib/constants";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";

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
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-[#FFAD02]/30 hover:shadow-[#FFAD02]/8"
    >
      {/* Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        {/* Open badge */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm ${
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
        <div className="absolute bottom-3 left-[68px] z-10 sm:left-[74px]">
          <span className="inline-block rounded-full bg-[#FFAD02]/90 px-2.5 py-0.5 text-[10px] font-bold text-gray-900 backdrop-blur-sm shadow-sm">
            {toCategoryMN(company.category)}
          </span>
        </div>

        {/* Logo */}
        <div className="absolute bottom-[-20px] left-3 z-10 sm:bottom-[-22px] sm:left-4">
          <InvestorRingWrapper investmentAmount={company.isInvestor ? company.investmentAmount : null} rounded="full">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white shadow-md sm:h-14 sm:w-14">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          </InvestorRingWrapper>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-7 sm:px-4 sm:pb-4 sm:pt-8">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-[13px] font-bold text-gray-900 group-hover:text-[#FFAD02] transition-colors sm:text-sm">
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
          <span className="text-xs font-bold text-gray-400 group-hover:text-[#FFAD02] transition-colors">Дэлгэрэнгүй</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 transition-all group-hover:bg-[#FFAD02] group-hover:shadow-md group-hover:shadow-[#FFAD02]/30">
            <ArrowUpRight size={13} className="text-gray-500 transition-all group-hover:text-gray-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFAD02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  );
}
