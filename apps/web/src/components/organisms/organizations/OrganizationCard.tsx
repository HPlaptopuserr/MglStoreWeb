"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, ShoppingBag, Star } from "lucide-react";
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
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl"
    >
      <div className="relative h-36 w-full bg-gray-100 sm:h-44">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={company.banner}
            alt={company.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </div>

        <div className="absolute right-3 top-3 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm ${
              company.isOpen ? "bg-emerald-500" : "bg-gray-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                company.isOpen ? "bg-white" : "bg-gray-300"
              }`}
            />
            {company.isOpen ? "Нээлттэй" : "Хаалттай"}
          </span>
        </div>

        <div className="absolute -bottom-6 left-4 z-10">
          <div
            className="rounded-full"
            style={
              company.isInvestor && company.investmentAmount
                ? {
                    ...getInvestorRingStyle(company.investmentAmount),
                    borderRadius: "9999px",
                  }
                : undefined
            }
          >
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-8">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-[15px] font-bold text-gray-900 transition-colors group-hover:text-black">
              {company.name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {toCategoryMN(company.category)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1">
            <Star size={12} className="fill-[#FFAD02] text-[#FFAD02]" />
            <span className="text-xs font-bold text-gray-800">
              {company.rating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1.5">
            <Clock3 size={12} />
            {company.deliveryTime}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1.5">
            <ShoppingBag size={12} />
            {company.products?.length ?? 0} бараа
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm font-semibold text-[#FFAD02] transition-colors group-hover:text-orange-600">
            Дэлгүүр орох
          </span>
          <ArrowRight
            size={16}
            className="text-[#FFAD02] transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}