"use client";

import Link from "next/link";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { LOCAL_AREA_OPTIONS } from "@mgl/ui";

export function LocationRail() {
  const featured = LOCAL_AREA_OPTIONS.slice(0, 8);
  const rest = LOCAL_AREA_OPTIONS.slice(8);

  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-200/70">
              <MapPin size={13} />
              Орон нутаг
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Байршлаар байгууллага харах
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Улаанбаатар, Эрдэнэт, Булган, Дархан болон аймгуудаар шүүнэ.
            </p>
          </div>
          <Link
            href="/organizations"
            className="hidden items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-amber-600 sm:flex"
          >
            Бүгдийг харах
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {featured.map((area) => (
            <Link
              key={area.slug}
              href={`/organizations?location=${area.slug}`}
              className="group flex min-h-24 flex-col justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:bg-white hover:shadow-lg hover:shadow-amber-100/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm transition-colors group-hover:bg-amber-500 group-hover:text-white">
                <Building2 size={17} />
              </div>
              <span className="mt-3 text-sm font-extrabold text-gray-900">{area.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {rest.map((area) => (
            <Link
              key={area.slug}
              href={`/organizations?location=${area.slug}`}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-500 transition-colors hover:border-amber-300 hover:text-gray-900"
            >
              {area.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
