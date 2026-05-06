"use client";

import { useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";

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
  categorySlugs: string[];
  isInvestor?: boolean;
  investmentAmount?: number;
}

function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase();
}

function parseCategorySlugs(raw?: string) {
  if (!raw) return [] as string[];
  return raw
    .split(",")
    .map((v) => normalizeCategoryKey(v))
    .filter(Boolean);
}

export default function OrganizationsPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const { categories: businessCategories } = useBusinessCategories();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partnersRes, investorsRes] = await Promise.all([
          fetch(`${API}/partners?limit=1000`),
          fetch(`${API}/investors`),
        ]);

        if (partnersRes.ok) {
          const raw = await partnersRes.json();
          const data = Array.isArray(raw) ? raw : raw?.data || [];

          const activeStores = data
            .filter((p: ApiPartner) => p.status === "ACTIVE")
            .map((p: ApiPartner) => {
              const parsedSlugs = parseCategorySlugs(p.businessCategory);
              const fallbackType = p.type
                ? normalizeCategoryKey(p.type)
                : "business";
              const categorySlugs =
                parsedSlugs.length > 0 ? parsedSlugs : [fallbackType];
              const primarySlug = categorySlugs[0];

              return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                logo: p.logoUrl || `https://picsum.photos/100/100?random=${p.id}`,
                banner:
                  p.bannerUrl || `https://picsum.photos/1200/400?random=${p.id}`,
                isOpen: true,
                category: primarySlug,
                categorySlugs,
                rating: 5.0,
                deliveryTime: "N/A",
                products: [],
                isInvestor: p.isInvestor || false,
                investmentAmount: p.investmentAmount || 0,
              };
            });

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

  const categories = useMemo(() => {
    const fromDb = businessCategories
      .map((c) => normalizeCategoryKey(c.slug))
      .filter(Boolean);

    const fromStores = stores.flatMap((store) => store.categorySlugs);
    const merged = Array.from(new Set([...fromDb, ...fromStores]));

    return ["all", ...merged];
  }, [businessCategories, stores]);

  useEffect(() => {
    if (activeFilter === "all") return;
    if (!categories.includes(activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, categories]);

  const filteredStores = stores.filter((store) => {
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      store.name.toLowerCase().includes(query) ||
      store.category.toLowerCase().includes(query);

    const normalizedFilter = normalizeCategoryKey(activeFilter);
    const matchesFilter =
      activeFilter === "all" ||
      store.categorySlugs.some((slug) => slug === normalizedFilter);

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