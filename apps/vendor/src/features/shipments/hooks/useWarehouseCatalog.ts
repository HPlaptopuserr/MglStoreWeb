"use client";
import type { StockRequestUser } from "@/features/shipments/types/stock-request.types";

import { WAREHOUSE_PRODUCTS_PAGE_SIZE } from "@/features/shipments/stock-request.constants";
import type {
  StockRequestCartItem,
  StockRequestView,
  SuggestedStockItem,
  SupplyWarehouse,
  WarehouseInventoryItem,
  WarehouseCatalogCategory,
  WarehouseCatalogSort,
} from "@/features/shipments/types/stock-request.types";
import { readWarehouseProductsPage } from "@/features/shipments/utils/warehouse-products-page";
import { API, authFetch } from "@/lib/api";
import { useInfiniteScroll } from "@mgl/ui";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseWarehouseCatalogOptions {
  user: StockRequestUser | null;
  selectedWarehouse: SupplyWarehouse | null;
  setSelectedWarehouse: React.Dispatch<
    React.SetStateAction<SupplyWarehouse | null>
  >;
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  setCart: React.Dispatch<React.SetStateAction<StockRequestCartItem[]>>;
  warehouses: SupplyWarehouse[];
  viewMode: StockRequestView;
}

export function useWarehouseCatalog({
  user,
  selectedWarehouse,
  setSelectedWarehouse,
  setViewMode,
  setCart,
  warehouses,
  viewMode,
}: UseWarehouseCatalogOptions) {
  const [warehouseProducts, setWarehouseProducts] = useState<
    WarehouseInventoryItem[]
  >([]);

  const [productsLoading, setProductsLoading] = useState(false);

  const [productsLoadingMore, setProductsLoadingMore] = useState(false);

  const [productsError, setProductsError] = useState<string | null>(null);

  const [productsPage, setProductsPage] = useState(1);

  const [productsTotal, setProductsTotal] = useState(0);

  const [productsHasMore, setProductsHasMore] = useState(false);

  const [productSearch, setProductSearch] = useState("");

  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<WarehouseCatalogCategory[]>([]);
  const [productSort, setProductSort] =
    useState<WarehouseCatalogSort>("topSelling");

  const productsRequestRef = useRef<AbortController | null>(null);
  const loadedFiltersRef = useRef<string | null>(null);

  const skipNextProductsFilterEffectRef = useRef(false);

  const loadWarehouseProducts = useCallback(
    async ({
      warehouse,
      page,
      search,
      category,
      append,
      productIds,
    }: {
      warehouse: SupplyWarehouse;
      page: number;
      search: string;
      category: string | null;
      append: boolean;
      productIds?: string[];
    }) => {
      if (!user?.organizationId) {
        setProductsError("Байгууллагын мэдээлэл олдсонгүй");
        return;
      }

      const filterKey = JSON.stringify([
        warehouse.id,
        search.trim(),
        category,
        productSort,
      ]);
      // A sort/filter change must start at page one before more rows can append.
      if (append && loadedFiltersRef.current !== filterKey) return null;
      if (!append) loadedFiltersRef.current = null;
      productsRequestRef.current?.abort();
      const controller = new AbortController();
      productsRequestRef.current = controller;
      if (append) setProductsLoadingMore(true);
      else setProductsLoading(true);
      setProductsError(null);

      try {
        const params = new URLSearchParams({
          organizationId: user.organizationId,
          sort: productSort,
          mode: "catalog",
          limit: String(WAREHOUSE_PRODUCTS_PAGE_SIZE),
          page: String(page),
        });
        const normalizedSearch = search.trim();
        if (normalizedSearch) params.set("search", normalizedSearch);
        if (category) params.set("categoryId", category);
        if (productIds?.length) params.set("productIds", productIds.join(","));

        const res = await authFetch(
          `${API}/stock-requests/warehouse/${warehouse.id}/products?${params.toString()}`,
          { signal: controller.signal },
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "Агуулахын бараа татахад алдаа гарлаа";
          throw new Error(message);
        }

        if (
          controller.signal.aborted ||
          productsRequestRef.current !== controller
        )
          return;
        const result = readWarehouseProductsPage(
          payload,
          page,
          WAREHOUSE_PRODUCTS_PAGE_SIZE,
        );
        setWarehouseProducts((current) => {
          if (!append) return result.items;
          const knownIds = new Set(current.map((item) => item.product.id));
          return [
            ...current,
            ...result.items.filter((item) => !knownIds.has(item.product.id)),
          ];
        });
        setProductsPage(page);
        setProductsTotal(result.total);
        setProductsHasMore(result.hasMore);
        loadedFiltersRef.current = filterKey;
        if (result.categories) setCategories(result.categories);
        return result;
      } catch (error) {
        if (
          controller.signal.aborted ||
          productsRequestRef.current !== controller
        )
          return;
        console.error("Failed to fetch warehouse products:", error);
        if (!append) setWarehouseProducts([]);
        setProductsError(
          error instanceof Error
            ? error.message
            : "Агуулахын бараа татахад алдаа гарлаа",
        );
        return null;
      } finally {
        if (productsRequestRef.current === controller) {
          setProductsLoading(false);
          setProductsLoadingMore(false);
        }
      }
    },
    [user?.organizationId, productSort],
  );

  const enterWarehouse = async (
    warehouse: SupplyWarehouse,
    autoItems?: SuggestedStockItem[],
  ) => {
    setSelectedWarehouse(warehouse);
    setCategories([]);
    skipNextProductsFilterEffectRef.current = true;
    setProductsLoading(true);
    setProductsError(null);
    setProductSearch("");
    setDebouncedProductSearch("");
    setSelectedCategory(null);
    setViewMode("browse");
    const result = await loadWarehouseProducts({
      warehouse,
      page: 1,
      search: "",
      category: null,
      append: false,
      productIds: autoItems?.map((item) => item.product.id),
    });

    if (autoItems?.length && result) {
      const suggestionByProductId = new Map(
        autoItems.map((item) => [item.product.id, item]),
      );
      const suggestedCart = result.items.flatMap(
        (item): StockRequestCartItem[] => {
          const suggestion = suggestionByProductId.get(item.product.id);
          if (!suggestion) return [];
          return [
            {
              productId: item.product.id,
              quantity: Math.max(
                5,
                suggestion.alertThreshold * 2 - suggestion.quantity,
              ),
              name: item.product.name,
              sku: item.product.sku,
              price: item.product.price,
              available: item.quantity,
              image: item.product.images[0]?.url || null,
            },
          ];
        },
      );
      if (suggestedCart.length) {
        setCart((current) => [
          ...current,
          ...suggestedCart.filter(
            (suggestion) =>
              !current.some((item) => item.productId === suggestion.productId),
          ),
        ]);
        setViewMode("cart");
      }
    }
  };

  const enterWarehouseById = (
    warehouseId: string,
    autoItems?: SuggestedStockItem[],
  ) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse) enterWarehouse(warehouse, autoItems);
  };

  const exitWarehouse = () => {
    productsRequestRef.current?.abort();
    setSelectedWarehouse(null);
    setWarehouseProducts([]);
    setCategories([]);
    setProductsError(null);
    setProductSearch("");
    setDebouncedProductSearch("");
    setSelectedCategory(null);
    setProductsPage(1);
    setProductsTotal(0);
    setProductsHasMore(false);
    setViewMode("warehouses");
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedProductSearch(productSearch),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    if (viewMode !== "browse" || !selectedWarehouse) return;
    if (skipNextProductsFilterEffectRef.current) {
      skipNextProductsFilterEffectRef.current = false;
      return;
    }
    void loadWarehouseProducts({
      warehouse: selectedWarehouse,
      page: 1,
      search: debouncedProductSearch,
      category: selectedCategory,
      append: false,
    });
  }, [
    debouncedProductSearch,
    loadWarehouseProducts,
    selectedCategory,
    selectedWarehouse,
    viewMode,
  ]);

  useEffect(() => () => productsRequestRef.current?.abort(), []);

  const retryProducts = () => {
    if (!selectedWarehouse) return;
    void loadWarehouseProducts({
      warehouse: selectedWarehouse,
      page: 1,
      search: debouncedProductSearch,
      category: selectedCategory,
      append: false,
    });
  };

  const loadMoreProducts = () => {
    if (
      !selectedWarehouse ||
      productsLoading ||
      productsLoadingMore ||
      productsError ||
      !productsHasMore
    )
      return;
    void loadWarehouseProducts({
      warehouse: selectedWarehouse,
      page: productsPage + 1,
      search: debouncedProductSearch,
      category: selectedCategory,
      append: true,
    });
  };

  const productsLoadMoreRef = useInfiniteScroll({
    enabled:
      viewMode === "browse" &&
      Boolean(selectedWarehouse) &&
      !productsLoading &&
      !productsLoadingMore &&
      !productsError &&
      productsHasMore,
    onLoadMore: loadMoreProducts,
  });
  return {
    selectedWarehouse,
    productSort,
    setProductSort,
    warehouseProducts,
    productsLoading,
    productsLoadingMore,
    productsError,
    productsTotal,
    productsHasMore,
    productSearch,
    setProductSearch,
    selectedCategory,
    setSelectedCategory,
    enterWarehouse,
    enterWarehouseById,
    exitWarehouse,
    categories,
    productsLoadMoreRef,
    retryProducts,
    loadMoreProducts,
  };
}
