"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Star, MapPin, ChevronRight, ShoppingBag } from "lucide-react";
import type { CompanyCard } from "@mgl/types";
import { getInvestorRingStyle } from "@/lib/utils";

interface FeaturedStoreCardProps {
  company: CompanyCard;
  className?: string;
}

export const FeaturedStoreCard = ({
  company,
  className,
}: FeaturedStoreCardProps) => {
  return (
    <Link
      href={`/organizations/${company.slug}`}
      className={`group flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 snap-start hover:-translate-y-1 overflow-hidden ${className || "min-w-70 sm:min-w-[320px]"}`}
    >
      <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/30 to-transparent" />

        <div className="absolute top-4 right-4 z-20">
          <span
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm text-white ${
              company.isOpen
                ? "bg-[#0bb783]"
                : "bg-slate-800/80 backdrop-blur-md"
            }`}
          >
            {company.isOpen ? "Нээлттэй" : "Хаалттай"}
          </span>
        </div>


      </div>

      <div className="flex flex-col flex-1 pb-6 px-6 bg-white relative z-10 rounded-b-3xl">
        <div
          className="z-20 -mt-9 mb-3 shrink-0 w-[76px] h-[76px] rounded-full"
          style={
            company.isInvestor && company.investmentAmount
              ? { ...getInvestorRingStyle(company.investmentAmount), borderRadius: "9999px" }
              : undefined
          }
        >
          <div className="w-full h-full rounded-full border-[3px] border-white bg-white shadow-sm overflow-hidden">
            <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-start mb-1">
          <h3 className="font-extrabold text-xl text-[#0f172a] line-clamp-1 group-hover:text-orange-600 transition-colors">
            {company.name}
          </h3>
          <div className="flex items-center gap-1.5 bg-[#fff8f0] px-2.5 py-1 rounded-xl shrink-0 mt-0.5">
            <Star size={13} className="fill-[#fb923c] text-[#fb923c]" />
            <span className="text-[13px] font-bold text-[#b45309]">
              {company.rating ? Number(company.rating).toFixed(1) : "5.0"}
            </span>
          </div>
        </div>

        <p className="text-[13px] font-medium text-[#64748b] mb-5 line-clamp-1 capitalize">
          {company.category ?? "Дэлгүүр"}
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-slate-100 rounded-xl text-[13px] font-semibold text-[#475569]">
            <Clock size={13} className="text-[#94a3b8]" />
            <span>{company.deliveryTime ?? "N/A"}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-slate-100 rounded-xl text-[13px] font-semibold text-[#475569]">
            <ShoppingBag size={13} className="text-[#94a3b8]" />
            <span>{company.products?.length ?? 0} бараа</span>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 mt-auto mb-5" />

        <div className="flex items-center justify-between text-[15px] font-bold text-[#ea580c] group-hover:text-[#c2410c] transition-colors">
          <span>Дэлгүүр рүү орох</span>
          <div className="w-9 h-9 rounded-full bg-[#fff7ed] flex items-center justify-center transition-colors">
            <ChevronRight
              size={18}
              strokeWidth={3}
              className="text-[#fb923c] group-hover:text-[#ea580c] transition-colors"
            />
          </div>
        </div>
      </div>
    </Link>
  );
};
