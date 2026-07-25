"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CreateWarehouseCategoryInput,
  WarehouseCategory,
} from "./category.types";
import { normalizeWarehouseCategories } from "./category.utils";
import {
  createWarehouseCategory,
  fetchWarehouseCategories,
} from "./category.api";

export function useWarehouseCategories() {
  const [categories, setCategories] = useState<WarehouseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCategories(await fetchWarehouseCategories());
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ангиллын мэдээлэл ачаалагдсангүй",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCategory = useCallback(
    async (input: CreateWarehouseCategoryInput): Promise<WarehouseCategory> => {
      const created = await createWarehouseCategory(input);
      setCategories((current) =>
        normalizeWarehouseCategories([...current, created]),
      );
      return created;
    },
    [],
  );

  return { categories, loading, error, refresh, createCategory };
}
