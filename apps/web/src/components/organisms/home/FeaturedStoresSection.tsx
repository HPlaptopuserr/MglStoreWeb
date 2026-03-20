"use client";

import React, { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FeaturedStoreCard } from "./FeaturedStoreCard";
import { API } from "@/lib/api";

interface ApiPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: string;
  businessCategory?: string;
  type?: string;
  isInvestor?: boolean;
  investmentAmount?: number | null;
}

export const FeaturedStoresSection = () => {
  const railRef = useRef<HTMLDivElement>(null);

  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch(`${API}/partners`);
        if (!res.ok) throw new Error("Failed to fetch stores");
        const data = await res.json();

        const activeStores = data
          .filter((p: ApiPartner) => p.status === "ACTIVE")
          .map((p: ApiPartner) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            logo: p.logoUrl || "https://picsum.photos/100/100?random=" + p.id,
            banner:
              p.bannerUrl || "https://picsum.photos/1200/400?random=" + p.id,
            isOpen: true,
            category: p.businessCategory || p.type || "Бизнес",
            rating: 5.0,
            deliveryTime: "N/A",
            products: [],
            isInvestor: p.isInvestor || false,
            investmentAmount: p.investmentAmount || 0,
          }));

        setStores(activeStores);
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!railRef.current) return;

    railRef.current.scrollBy({
      left: direction === "left" ? -900 : 900,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-6">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Хамтрагч дэлгүүрүүд
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("right")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-16 flex items-center justify-center">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Дэлгүүрийн өгөгдөл олдсонгүй
            </div>
          ) : (
            <div
              ref={railRef}
              className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide snap-x snap-mandatory md:gap-4"
            >
              {stores.map((company) => (
                <FeaturedStoreCard key={company.id} company={company} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
