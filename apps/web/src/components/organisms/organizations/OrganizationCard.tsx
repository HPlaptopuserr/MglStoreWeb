"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingBag, Clock, ChevronRight } from "lucide-react";
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
      className="group flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-[#FFAD02]/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      {/* Banner */}
      <div className="relative h-32 w-full bg-slate-100 sm:h-40">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />

        {/* Open badge */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-white ${
              company.isOpen ? "bg-emerald-500" : "bg-slate-800/80 backdrop-blur-md"
            }`}
          >
            {company.isOpen ? "Нээлттэй" : "Хаалттай"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pb-4 pt-3 relative z-10">
        {/* Logo */}
        <div className="-mt-10 mb-2.5">
          <InvestorRingWrapper investmentAmount={company.isInvestor ? company.investmentAmount : null} rounded="full">
            <div className="w-16 h-16 rounded-full bg-white shadow-md overflow-hidden sm:w-[72px] sm:h-[72px]">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100">
                <Image
                  src={company.logo}
                  alt={company.name}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              </div>
            </div>
          </InvestorRingWrapper>
        </div>

        {/* Name + rating */}
        <div className="flex justify-between items-start mb-0.5 gap-1">
          <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-[#FFAD02] transition-colors sm:text-base">
            {company.name}
          </h3>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-amber-700">
              {company.rating ? Number(company.rating).toFixed(1) : "5.0"}
            </span>
          </div>
        </div>

        {/* Category */}
        <p className="text-[11px] font-medium text-slate-400 mb-3 capitalize line-clamp-1">
          {toCategoryMN(company.category)}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
            <Clock size={11} className="text-slate-400" />
            <span>{company.deliveryTime ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
            <ShoppingBag size={11} className="text-slate-400" />
            <span>{company.products?.length ?? 0} бараа</span>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 mt-auto mb-3" />

        {/* CTA */}
        <div className="flex items-center justify-between text-sm font-bold text-[#FFAD02] group-hover:text-amber-600 transition-colors">
          <span>Дэлгэрэнгүй</span>
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
            <ChevronRight size={15} strokeWidth={3} className="text-[#FFAD02]" />
          </div>
        </div>
      </div>
    </Link>
  );
}
