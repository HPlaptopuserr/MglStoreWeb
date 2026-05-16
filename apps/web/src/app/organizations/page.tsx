"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API } from "@/lib/api";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";
import { getLocalAreaFromText, isLocalAreaSlug } from "@mgl/ui";

import { OrganizationsHero } from "@/components/organisms/organizations/OrganizationsHero";
import { InvestorsSection } from "@/components/organisms/organizations/InvestorsSection";
import { OrganizationCategoryFilter } from "@/components/organisms/organizations/OrganizationCategoryFilter";
import { OrganizationLocationFilter } from "@/components/organisms/organizations/OrganizationLocationFilter";
import { OrganizationsSectionHeader } from "@/components/organisms/organizations/OrganizationsSectionHeader";
import { OrganizationsGrid } from "@/components/organisms/organizations/OrganizationsGrid";
import { OrganizationsLoadingGrid } from "@/components/organisms/organizations/OrganizationsLoadingGrid";
import { OrganizationsEmptyState } from "@/components/organisms/organizations/OrganizationsEmptyState";

const PAGE_SIZE = 24;

interface ApiPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: string;
  businessCategory?: string;
  address?: string | null;
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
  address?: string | null;
  localAreaSlug?: string;
  localAreaLabel?: string;
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

function mapPartner(p: ApiPartner): StoreItem {
  const parsedSlugs = parseCategorySlugs(p.businessCategory);
  const fallbackType = p.type ? normalizeCategoryKey(p.type) : "business";
  const categorySlugs = parsedSlugs.length > 0 ? parsedSlugs : [fallbackType];
  const localArea = getLocalAreaFromText(p.address);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    logo: p.logoUrl || `https://picsum.photos/100/100?random=${p.id}`,
    banner: p.bannerUrl || `https://picsum.photos/1200/400?random=${p.id}`,
    isOpen: true,
    category: categorySlugs[0],
    categorySlugs,
    rating: 5.0,
    deliveryTime: "N/A",
    products: [],
    address: p.address,
    localAreaSlug: localArea?.slug,
    localAreaLabel: localArea?.label,
    isInvestor: p.isInvestor || false,
    investmentAmount: p.investmentAmount || 0,
  };
}

export default function OrganizationsPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeLocation, setActiveLocation] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersReady, setFiltersReady] = useState(false);
  const { categories: businessCategories } = useBusinessCategories();

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSequenceRef = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const location = params.get("location");
    const category = params.get("category");
    const search = params.get("search") ?? params.get("q");

    if (location && isLocalAreaSlug(location)) setActiveLocation(location);
    if (category) setActiveFilter(category);
    if (search) {
      setSearchQuery(search);
      setDebouncedSearch(search);
    }
    setFiltersReady(true);
  }, []);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeLocation]);

  const buildUrl = useCallback(
    (p: number) => {
      const params = new URLSearchParams({
        status: "ACTIVE",
        limit: String(PAGE_SIZE),
        page: String(p),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (activeFilter !== "all") params.set("category", activeFilter);
      if (activeLocation !== "all") params.set("location", activeLocation);
      return `${API}/partners?${params.toString()}`;
    },
    [debouncedSearch, activeFilter, activeLocation],
  );

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("category", activeFilter);
    if (activeLocation !== "all") params.set("location", activeLocation);
    if (debouncedSearch) params.set("search", debouncedSearch);

    const nextUrl = params.toString() ? `/organizations?${params.toString()}` : "/organizations";
    window.history.replaceState(null, "", nextUrl);
  }, [filtersReady, activeFilter, activeLocation, debouncedSearch]);

  // Initial / filter change fetch
  useEffect(() => {
    if (!filtersReady) return;
    const requestId = fetchSequenceRef.current + 1;
    fetchSequenceRef.current = requestId;
    setIsLoading(true);
    setStores([]);

    const fetchPartners = async () => {
      try {
        const [partnersRes, investorsRes] = await Promise.all([
          fetch(buildUrl(1)),
          investors.length === 0 ? fetch(`${API}/investors`) : Promise.resolve(null),
        ]);

        if (partnersRes.ok) {
          const raw = await partnersRes.json();
          if (fetchSequenceRef.current !== requestId) return;
          const data: ApiPartner[] = Array.isArray(raw) ? raw : raw?.data || [];
          const pagination = raw?.pagination;
          setStores(data.map(mapPartner));
          setTotal(pagination?.total ?? data.length);
          setTotalPages(pagination?.totalPages ?? 1);
          setPage(1);
        }

        if (investorsRes?.ok) {
          const invData = await investorsRes.json();
          if (fetchSequenceRef.current !== requestId) return;
          if (Array.isArray(invData)) setInvestors(invData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (fetchSequenceRef.current === requestId) {
          setIsLoading(false);
        }
      }
    };

    fetchPartners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, buildUrl]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextPage));
      if (res.ok) {
        const raw = await res.json();
        const data: ApiPartner[] = Array.isArray(raw) ? raw : raw?.data || [];
        setStores((prev) => [...prev, ...data.map(mapPartner)]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const categories = useMemo(() => {
    const fromDb = businessCategories
      .map((c) => normalizeCategoryKey(c.slug))
      .filter(Boolean);
    return ["all", ...fromDb];
  }, [businessCategories]);

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <OrganizationsHero
        storesCount={total}
        activeCount={total}
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
      <OrganizationLocationFilter
        activeLocation={activeLocation}
        onChange={setActiveLocation}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <OrganizationsSectionHeader resultCount={total} />

        {isLoading ? (
          <OrganizationsLoadingGrid />
        ) : stores.length > 0 ? (
          <>
            <OrganizationsGrid stores={stores} />

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-[#FFAD02] hover:text-[#FFAD02] hover:shadow-md hover:shadow-[#FFAD02]/10 disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFAD02] border-t-transparent" />
                      Ачааллаж байна...
                    </>
                  ) : (
                    <>
                      Дахин {Math.min(PAGE_SIZE, total - stores.length)} байгууллага үзэх
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {total - stores.length} үлдсэн
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <OrganizationsEmptyState searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}
