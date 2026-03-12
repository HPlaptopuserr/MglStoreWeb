"use client";

import React, { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FeaturedStoreCard } from "./FeaturedStoreCard";

interface ApiPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: string;
  businessCategory?: string;
  type?: string;
}

export const FeaturedStoresSection = () => {
  const railRef = useRef<HTMLDivElement>(null);

  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/partners");
        if (!res.ok) throw new Error("Failed to fetch stores");
        const data = await res.json();

        const activeStores = data
          .filter((p: ApiPartner) => p.status === "ACTIVE")
          .map((p: ApiPartner) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            logo: p.logoUrl || "https://picsum.photos/100/100?random=" + p.id,
            banner: p.bannerUrl || "https://picsum.photos/1200/400?random=" + p.id,
            isOpen: true,
            category: p.businessCategory || p.type || "Бизнес",
            rating: 5.0,
            deliveryTime: "N/A",
            products: [],
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
    <section className="mt-12">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Хамтрагч дэлгүүрүүд
        </h2>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ChevronRight size={18} />
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
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-hide snap-x snap-mandatory pt-2 px-2 -mx-2"
        >
          {stores.map((company) => (
            <FeaturedStoreCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </section>
  );
};
