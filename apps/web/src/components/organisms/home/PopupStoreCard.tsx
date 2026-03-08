"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Star } from "lucide-react";
import type { CompanyCard } from "@mgl/types";

interface PopupStoreCardProps {
  company: CompanyCard;
}

export const PopupStoreCard = ({ company }: PopupStoreCardProps) => {
  const previewProducts = company.products?.slice(0, 3) ?? [];

  return (
    <Link
      href={`/organizations/${company.slug}`}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        <Image
          src={company.banner}
          alt={company.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />

        <div className="absolute left-4 top-4">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
              company.isOpen
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-200"
            }`}
          >
            {company.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
            <Image
              src={company.logo}
              alt={company.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">
              {company.name}
            </h3>
            <p className="truncate text-sm text-white/80">
              {company.category ?? "Онцлох дэлгүүр"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-slate-700">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>{company.rating ?? 0}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            <Clock size={12} className="text-amber-500" />
            <span>{company.deliveryTime ?? "N/A"}</span>
          </div>

          <div className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            {company.products?.length ?? 0} бүтээгдэхүүн
          </div>
        </div>

        {previewProducts.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {previewProducts.map((product) => (
              <div
                key={product.id}
                className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">
            Дэлгүүр үзэх
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  );
};
