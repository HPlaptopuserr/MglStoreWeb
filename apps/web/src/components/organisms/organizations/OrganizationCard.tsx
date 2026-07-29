"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Star, ShoppingBag, ChevronRight } from "lucide-react";
import { toCategoryMN } from "@/lib/constants";
import { InvestorRingWrapper } from "@/components/atoms/InvestorRingWrapper";
import type { OrganizationStore } from "@/features/organizations/types";

interface OrganizationCardProps {
  company: OrganizationStore;
}

export function OrganizationCard({ company }: OrganizationCardProps) {
  return (
    <Link
      href={`/organizations/${company.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/60"
    >
      <div className="relative h-32 w-full bg-slate-100">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/35 via-transparent to-transparent" />

        <div className="absolute right-3 top-3 z-20">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${
              company.isOpen
                ? "bg-[#0bb783]"
                : "bg-slate-800/80 backdrop-blur-md"
            }`}
          >
            {company.isOpen ? "Нээлттэй" : "Хаалттай"}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col bg-white px-4 pb-4 pt-3">
        <div className="-mt-9 mb-3">
          <InvestorRingWrapper
            investmentAmount={
              company.isInvestor ? company.investmentAmount : null
            }
            rounded="full"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full bg-white p-1 shadow-md ring-1 ring-slate-100">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-100">
                <Image
                  src={company.logo}
                  alt={company.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            </div>
          </InvestorRingWrapper>
        </div>

        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-base font-black text-slate-950 transition-colors group-hover:text-orange-600">
            {company.name}
          </h3>
          <div className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-orange-50 px-2 py-1">
            <Star size={12} className="fill-orange-400 text-orange-400" />
            <span className="text-xs font-bold text-orange-700">
              {Number(company.rating || 0).toFixed(1)}/10
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <span className="truncate capitalize">
            {toCategoryMN(company.category)}
          </span>
          <span>· {company.reviewCount} үнэлгээ</span>
          <span>· {company.soldCount} зарагдсан</span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600">
            <Clock size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {company.localAreaLabel ?? company.deliveryTime ?? "N/A"}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600">
            <ShoppingBag size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {company.products?.length ?? 0} бараа
            </span>
          </div>
        </div>

        <div className="mt-auto h-px w-full bg-slate-100" />

        <div className="flex items-center justify-between pt-4 text-sm font-bold text-orange-600 transition-colors group-hover:text-orange-700">
          <span>Дэлгүүр рүү орох</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 transition-colors group-hover:bg-orange-100">
            <ChevronRight
              size={16}
              strokeWidth={3}
              className="text-orange-500 transition-colors group-hover:text-orange-700"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
