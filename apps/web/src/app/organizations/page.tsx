"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

import { OrganizationsHero } from "@/components/organisms/organizations/OrganizationsHero";
import { InvestorsSection } from "@/components/organisms/organizations/InvestorsSection";
import { OrganizationCategoryFilter } from "@/components/organisms/organizations/OrganizationCategoryFilter";
import { OrganizationsSectionHeader } from "@/components/organisms/organizations/OrganizationsSectionHeader";
import { OrganizationsGrid } from "@/components/organisms/organizations/OrganizationsGrid";
import { OrganizationsLoadingGrid } from "@/components/organisms/organizations/OrganizationsLoadingGrid";
import { OrganizationsEmptyState } from "@/components/organisms/organizations/OrganizationsEmptyState";

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
  investorTier?: "TOP" | "STRATEGIC" | "INVESTOR" | null;
  investorLevel?: string | null;
  investmentAmount?: number | null;
}

export interface Investor {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  tier: "TOP" | "STRATEGIC" | "INVESTOR";
  tierLabel: string;
  featured: boolean;
  investmentLevel: string | null;
  description: string | null;
}

export interface StoreItem {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  category: string;
  rating: number;
  deliveryTime: string;
  products: string[];
  isInvestor?: boolean;
  investmentAmount?: number;
}

export default function OrganizationsPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partnersRes, investorsRes] = await Promise.all([
          fetch(`${API}/partners`),
          fetch(`${API}/investors`),
        ]);

        if (partnersRes.ok) {
          const data = await partnersRes.json();

          const activeStores = data
            .filter((p: ApiPartner) => p.status === "ACTIVE")
            .map((p: ApiPartner) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              logo: p.logoUrl || `https://picsum.photos/100/100?random=${p.id}`,
              banner:
                p.bannerUrl || `https://picsum.photos/1200/400?random=${p.id}`,
              isOpen: true,
              category: p.businessCategory || p.type || "Бизнес",
              rating: 5.0,
              deliveryTime: "N/A",
              products: [],
              isInvestor: p.isInvestor || false,
              investmentAmount: p.investmentAmount || 0,
            }));

          setStores(activeStores);
        }

        if (investorsRes.ok) {
          const invData = await investorsRes.json();
          if (Array.isArray(invData)) {
            setInvestors(invData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = [
    "all",
    ...Array.from(new Set(stores.map((store) => store.category))),
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
      <OrganizationsHero
        storesCount={stores.length}
        activeCount={stores.filter((store) => store.isOpen).length}
        categoriesCount={categories.length - 1}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {investors.length > 0 && <InvestorsSection investors={investors} />}

      {categories.length > 2 && (
        <OrganizationCategoryFilter
          categories={categories}
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <OrganizationsSectionHeader resultCount={filteredStores.length} />

        {isLoading ? (
          <OrganizationsLoadingGrid />
        ) : filteredStores.length > 0 ? (
          <OrganizationsGrid stores={filteredStores} />
        ) : (
          <OrganizationsEmptyState searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}