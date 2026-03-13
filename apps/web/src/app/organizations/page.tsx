"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Building2,
  Star,
  Clock,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
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
}

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
  products: any[];
}

// Mongolian translations for business categories
const CATEGORY_MN: Record<string, string> = {
  // Seed & common categories
  Electronics: "Цахилгаан бараа",
  electronics: "Цахилгаан бараа",
  Food: "Хүнс",
  food: "Хүнс",
  Clothing: "Хувцас",
  clothing: "Хувцас",
  // Business types from registrations
  Retail: "Жижиглэн худалдаа",
  retail: "Жижиглэн худалдаа",
  Pharmacy: "Эмийн сан",
  pharmacy: "Эмийн сан",
  "Building-Materials": "Барилгын материал",
  "building-materials": "Барилгын материал",
  "Building Materials": "Барилгын материал",
  Service: "Үйлчилгээ",
  service: "Үйлчилгээ",
  Grocery: "Хүнсний дэлгүүр",
  grocery: "Хүнсний дэлгүүр",
  Fashion: "Загвар өмсгөл",
  fashion: "Загвар өмсгөл",
  Beauty: "Гоо сайхан",
  beauty: "Гоо сайхан",
  Health: "Эрүүл мэнд",
  health: "Эрүүл мэнд",
  Sports: "Спорт",
  sports: "Спорт",
  Automotive: "Авто машин",
  automotive: "Авто машин",
  Education: "Боловсрол",
  education: "Боловсрол",
  Restaurant: "Ресторан",
  restaurant: "Ресторан",
  Cafe: "Кафе",
  cafe: "Кафе",
  Hotel: "Зочид буудал",
  hotel: "Зочид буудал",
  Travel: "Аялал жуулчлал",
  travel: "Аялал жуулчлал",
  IT: "Мэдээллийн технологи",
  it: "Мэдээллийн технологи",
  Бизнес: "Бизнес",
};

const toCategoryMN = (cat: string): string =>
  CATEGORY_MN[cat] || CATEGORY_MN[cat.toLowerCase()] || cat;

export default function OrganizationsPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

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

  const categories = [
    "all",
    ...Array.from(new Set(stores.map((s) => s.category))),
  ];

  const filteredStores = stores.filter((store) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      store.name.toLowerCase().includes(query) ||
      store.category.toLowerCase().includes(query);
    const matchesFilter =
      activeFilter === "all" || store.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Section */}
      <div className="relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,173,2,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,173,2,0.08),_transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-16 sm:pb-20">
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-6">
            <h1 className="text-xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
              Албан ёсны <span className="text-[#FFAD02]">Түншүүд</span>
            </h1>

            <p className="text-xs sm:text-lg text-white/50 max-w-lg mx-auto leading-relaxed">
              Баталгаажсан байгууллагуудын жагсаалт
            </p>

            {/* Stats - desktop only */}
            <div className="hidden sm:flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-black text-white">
                  {stores.length}
                </div>
                <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  Түнш
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-black text-[#FFAD02]">
                  {stores.filter((s) => s.isOpen).length}
                </div>
                <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  Идэвхтэй
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-black text-white">
                  {categories.length - 1}
                </div>
                <div className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                  Ангилал
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="w-full max-w-xl pt-1 sm:pt-4">
              <div className="relative group">
                <Search
                  className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FFAD02] transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Байгууллага хайх..."
                  className="w-full pl-11 sm:pl-13 pr-4 py-3 sm:py-4 bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder:text-white/30 outline-none focus:border-[#FFAD02]/50 focus:bg-white/10 focus:ring-2 focus:ring-[#FFAD02]/20 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 2 && (
        <div className="border-b border-gray-100 bg-white sticky top-20 sm:top-32 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 sm:py-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`shrink-0 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                    activeFilter === cat
                      ? "bg-black text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  {cat === "all" ? "Бүгд" : toCategoryMN(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10">
        {/* Results count */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-black">
              {filteredStores.length}
            </span>{" "}
            байгууллага олдлоо
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-28 sm:h-44 bg-gray-100 rounded-xl sm:rounded-2xl" />
                <div className="px-1 pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredStores.map((company) => (
              <Link
                key={company.id}
                href={`/organizations/${company.slug}`}
                className="group flex flex-col bg-white border border-gray-100 rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Banner */}
                <div className="relative h-32 sm:h-44 w-full bg-gray-100 overflow-hidden">
                  <Image
                    src={company.banner}
                    alt={company.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md sm:rounded-lg backdrop-blur-md text-white ${
                        company.isOpen ? "bg-emerald-500/80" : "bg-gray-800/80"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${company.isOpen ? "bg-white animate-pulse" : "bg-gray-400"}`}
                      />
                      {company.isOpen ? "Нээлттэй" : "Хаалттай"}
                    </span>
                  </div>

                  {/* Logo overlay on banner */}
                  <div className="absolute -bottom-5 left-3 sm:-bottom-6 sm:left-4">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl border-2 sm:border-[3px] border-white bg-white shadow-lg overflow-hidden">
                      <div className="relative w-full h-full">
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

                {/* Content */}
                <div className="flex flex-col flex-1 px-3 sm:px-4 pt-7 sm:pt-9 pb-3 sm:pb-4">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 line-clamp-1 group-hover:text-black transition-colors">
                      {company.name}
                    </h3>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <Star
                        size={10}
                        className="fill-[#FFAD02] text-[#FFAD02] sm:w-3 sm:h-3"
                      />
                      <span className="text-[10px] sm:text-xs font-bold text-gray-700">
                        {company.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-gray-400 mb-3 sm:mb-4">
                    {toCategoryMN(company.category)}
                  </p>

                  <div className="hidden sm:flex items-center gap-2 mt-auto">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-[11px] font-medium text-gray-500">
                      <Clock size={11} />
                      {company.deliveryTime}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-[11px] font-medium text-gray-500">
                      <ShoppingBag size={11} />
                      {company.products?.length ?? 0} бараа
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-[#FFAD02] group-hover:text-orange-600 transition-colors">
                    Дэлгүүр орох
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-[#FFAD02] group-hover:translate-x-1 transition-transform sm:w-3.5 sm:h-3.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Илэрц олдсонгүй
            </h3>
            <p className="text-sm text-gray-400">
              &ldquo;{searchQuery}&rdquo; хайлтад тохирох байгууллага олдсонгүй.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
