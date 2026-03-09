"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Star } from "lucide-react";
import type { CompanyCard } from "@mgl/types";

interface FeaturedStoreCardProps {
  company: CompanyCard;
}

export const FeaturedStoreCard = ({ company }: FeaturedStoreCardProps) => {
  return (
    <Link
      href={`/organizations/${company.slug}`}
      className="group relative min-w-70 sm:min-w-[320px] md:min-w-90 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl snap-start"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-linear-to-t from-slate-900/75 via-slate-900/15 to-transparent" />

        <div className="absolute right-3 top-3">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${
              company.isOpen
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-100"
            }`}
          >
            {company.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
              <Image
                src={company.logo}
                alt={company.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-white">
                {company.name}
              </h3>
              <p className="truncate text-sm text-white/85">
                {company.category ?? "Marketplace store"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{company.rating ?? 0}</span>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <Clock size={12} className="text-amber-500" />
              <span>{company.deliveryTime ?? "N/A"}</span>
            </div>

            <div className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
              {company.products?.length ?? 0} бүтээгдэхүүн
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
