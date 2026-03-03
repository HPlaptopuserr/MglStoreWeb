import React from "react";
import { companies } from "@/lib/mock-data";
import { HeroSection } from "@/components/organisms/home/HeroSection";
import { CategoryRail } from "@/components/organisms/home/CategoryRail";
import { StoreRow } from "@/components/organisms/home/StoreRow";
import { BrandTicker } from "@/components/organisms/home/BrandTicker";
import { ProductGrid } from "@/components/organisms/home/ProductGrid";
import { PartnerShipContact } from "@/components/organisms/partnership/PartnershipContact";

export default function HomePage() {
  return (
    <>
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pt-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch mb-12">
            <div className="flex-1 min-w-0">
              <HeroSection />
            </div>
          </div>

          <div>
            <CategoryRail />
            <section className="space-y-6 mt-12">
              <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  Дэлгүүрүүдийн мэдээлэл
                </h2>
              </div>
              <div className="grid gap-8">
                {companies.map((company) => (
                  <StoreRow key={company.id} company={company} />
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-8 mt-12 mb-20">
          <ProductGrid />
        </div>

        <div className="container mx-auto px-4 md:px-8 mt-12 mb-20">
          <PartnerShipContact />
        </div>

        <BrandTicker />
      </main>
    </>
  );
}
