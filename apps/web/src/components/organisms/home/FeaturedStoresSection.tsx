"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Loader2, Store } from "lucide-react";
import Link from "next/link";
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
  publicInfoScore?: number;
}

export const FeaturedStoresSection = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch(`${API}/partners?status=ACTIVE&limit=50`);
        if (!res.ok) {
          console.warn("Failed to fetch stores, status:", res.status);
          setStores([]);
          return;
        }
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : raw?.data || [];

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
            publicInfoScore: p.publicInfoScore || 0,
          }));

        activeStores.sort((a: any, b: any) => {
          const infoDiff = (b.publicInfoScore || 0) - (a.publicInfoScore || 0);
          if (infoDiff !== 0) return infoDiff;
          if (a.isInvestor && !b.isInvestor) return -1;
          if (!a.isInvestor && b.isInvestor) return 1;
          if (a.isInvestor && b.isInvestor) return (b.investmentAmount || 0) - (a.investmentAmount || 0);
          return 0;
        });

        setStores(activeStores);
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, []);

  const featuredStores = stores.slice(0, 8);

  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
              <Store size={13} />
              Онцлох дэлгүүрүүд
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Хамтрагч байгууллагууд
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Баталгаажсан байгууллагуудын дэлгүүр, үйлчилгээ болон барааг нэг
              дороос үзээрэй.
            </p>
          </div>
          <Link
            href="/organizations"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
          >
            Бүгдийг харах
            <ArrowRight size={15} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[330px] animate-pulse rounded-xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            Дэлгүүрийн өгөгдөл олдсонгүй
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredStores.map((company) => (
              <FeaturedStoreCard
                key={company.id}
                company={company}
                className="min-w-0"
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-orange-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Дэлгүүрүүд ачаалж байна...
          </div>
        )}

        {!isLoading && stores.length > featuredStores.length && (
          <div className="mt-6 flex justify-center">
            <Link
              href="/organizations"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
            >
              Нийт {stores.length} байгууллагыг харах
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
        </div>
    </section>
  );
};
