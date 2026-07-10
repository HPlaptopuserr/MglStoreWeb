"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";
import { isLocalAreaSlug } from "@mgl/ui";
import { getInvestors, getPartnersPage } from "@/features/organizations/api";
import { mapPartnerToStore } from "@/features/organizations/mappers";
import { getUserFacingHttpError } from "@/shared/api/http-client";

import { OrganizationsHero } from "@/components/organisms/organizations/OrganizationsHero";
import { InvestorsSection } from "@/components/organisms/organizations/InvestorsSection";
import { OrganizationCategoryFilter } from "@/components/organisms/organizations/OrganizationCategoryFilter";
import { OrganizationLocationFilter } from "@/components/organisms/organizations/OrganizationLocationFilter";
import { OrganizationsSectionHeader } from "@/components/organisms/organizations/OrganizationsSectionHeader";
import { OrganizationsGrid } from "@/components/organisms/organizations/OrganizationsGrid";
import { OrganizationsLoadingGrid } from "@/components/organisms/organizations/OrganizationsLoadingGrid";
import { OrganizationsEmptyState } from "@/components/organisms/organizations/OrganizationsEmptyState";
import { OrganizationsErrorState } from "@/components/organisms/organizations/OrganizationsErrorState";
import type { Investor, OrganizationStore } from "@/features/organizations/types";

const PAGE_SIZE = 24;
const LOCAL_MEMBERS_LOCATION = "local";


function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase();
}

export default function OrganizationsPage() {
  const [stores, setStores] = useState<OrganizationStore[]>([]);
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { categories: businessCategories } = useBusinessCategories();

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSequenceRef = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const location = params.get("location");
    const category = params.get("category");
    const search = params.get("search") ?? params.get("q");

    if (
      location &&
      (location === LOCAL_MEMBERS_LOCATION || isLocalAreaSlug(location))
    ) {
      setActiveLocation(location);
    }
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

  const buildQuery = useCallback(
    (p: number) => {
      const params = new URLSearchParams({
        status: "ACTIVE",
        limit: String(PAGE_SIZE),
        page: String(p),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (activeFilter !== "all") params.set("category", activeFilter);
      if (activeLocation !== "all") params.set("location", activeLocation);
      return params.toString();
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
    setErrorMessage(null);
    setStores([]);

    const fetchPartners = async () => {
      try {
        const [partnersRes, investorsRes] = await Promise.all([
          getPartnersPage(buildQuery(1)),
          investors.length === 0 ? getInvestors() : Promise.resolve(null),
        ]);

        if (fetchSequenceRef.current !== requestId) return;
        setStores(partnersRes.data.map(mapPartnerToStore));
        setTotal(partnersRes.pagination.total);
        setTotalPages(partnersRes.pagination.totalPages);
        setPage(1);

        if (investorsRes) {
          if (fetchSequenceRef.current !== requestId) return;
          setInvestors(investorsRes);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (fetchSequenceRef.current === requestId) {
          setErrorMessage(getUserFacingHttpError(error));
        }
      } finally {
        if (fetchSequenceRef.current === requestId) {
          setIsLoading(false);
        }
      }
    };

    fetchPartners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, buildQuery, retryKey]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const result = await getPartnersPage(buildQuery(nextPage));
      setStores((current) => [...current, ...result.data.map(mapPartnerToStore)]);
      setPage(nextPage);
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
  const isLocalMode =
    activeLocation === LOCAL_MEMBERS_LOCATION || isLocalAreaSlug(activeLocation);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <OrganizationsHero
        storesCount={total}
        activeCount={total}
        categoriesCount={categories.length - 1}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLocalMode={isLocalMode}
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

      <div className="mx-auto max-w-7xl px-3 pt-6 sm:px-6 sm:pt-8">
        <OrganizationsSectionHeader resultCount={total} isLocalMode={isLocalMode} />

        {isLoading ? (
          <OrganizationsLoadingGrid />
        ) : errorMessage ? (
          <OrganizationsErrorState
            message={errorMessage}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
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
          <OrganizationsEmptyState searchQuery={searchQuery} isLocalMode={isLocalMode} />
        )}
      </div>
    </div>
  );
}
