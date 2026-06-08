"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

export type HrMenuPartner = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
};

export type HrMenuService = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  imageUrl?: string;
  href: string;
  fileUrl?: string;
  fileName?: string;
  hasForm?: boolean;
  formSlug?: string;
  formTitle?: string;
  details: string[];
  partners: HrMenuPartner[];
};

type HrServiceMenuCardProps = {
  service: HrMenuService;
  onOpen: (service: HrMenuService) => void;
  groupHref?: string;
};

export function HrServiceMenuCard({
  service,
  onOpen,
  groupHref,
}: HrServiceMenuCardProps) {
  const formHref =
    service.hasForm && service.formSlug ? `/forms/${service.formSlug}` : "";
  const content = (
    <>
      <div className="mb-4 overflow-hidden rounded-xl bg-slate-100">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.title}
            className="h-28 w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-28 items-center justify-center text-slate-500">
            <ClipboardCheck className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="mb-3 flex items-start justify-end gap-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          {service.hasForm && (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
              Маягт
            </span>
          )}
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
            {service.priceLabel}
          </span>
        </div>
      </div>
      <h4 className="line-clamp-2 text-base font-black leading-tight text-slate-950">
        {service.title}
      </h4>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
        {service.description}
      </p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-black text-emerald-700">
        {formHref ? "Маягт бөглөх" : "Дэлгэрэнгүй харах"}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </span>
    </>
  );

  if (formHref) {
    return (
      <Link
        href={formHref}
        className="group flex min-h-[250px] flex-col rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-100/70"
      >
        {content}
      </Link>
    );
  }

  if (groupHref) {
    return (
      <Link
        href={groupHref}
        className="group flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-lg hover:shadow-emerald-100/60"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(service)}
      className="group flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-lg hover:shadow-emerald-100/60"
    >
      {content}
    </button>
  );
}
