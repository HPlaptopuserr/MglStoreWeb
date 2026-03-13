"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Building2, MapPin, Briefcase } from "lucide-react";
import { FeaturedStoreCard } from "@/components/organisms/home/FeaturedStoreCard";
import { API } from "@/lib/api";

type Partner = {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  type: string;
  status: string;
  isVerified: boolean;
  email: string | null;
  phone: string | null;
  logoUrl?: string | null;
  address: string | null;
  createdAt: string;
};
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

export default function OrganizationsPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);
  const [stores, setStores] = useState<any[]>([]);

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
  const filteredStores = stores.filter((store) => {
    const query = searchQuery.toLowerCase();
    return (
      store.name.toLowerCase().includes(query) ||
      store.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-white border-b border-slate-200 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Албан ёсны <span className="text-[#FFAD02]">Түншүүд</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Манай платформд нэгдсэн, баталгаажсан албан ёсны байгууллага,
            салбаруудын нэгдсэн жагсаалт.
          </p>

          <div className="max-w-xl mx-auto relative mt-8">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Хайх (Компанийн нэр, Төрөл)..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:border-[#FFAD02] focus:ring-4 focus:ring-[#FFAD02]/10 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-[#FFAD02] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStores.map((company) => (
              <FeaturedStoreCard
                key={company.id}
                company={company}
                className="w-full"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Илэрц олдсонгүй
            </h3>
            <p className="text-slate-500">
              "{searchQuery}" хайлтад тохирох байгууллага олдсонгүй.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
