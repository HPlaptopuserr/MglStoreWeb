"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import {
  isFeatureEnabled,
  PREORDER_PRODUCTS_FEATURE_KEY,
  SERVICE_POSTS_FEATURE_KEY,
  SUPPLY_PRODUCTS_FEATURE_KEY,
} from "@/lib/org-features";
import { OrgFeatureState } from "@/lib/org-types";

export const DEFAULT_ORG_FEATURES: OrgFeatureState = {
  supplyProducts: false,
  preorderProducts: false,
  servicePosts: true,
};

export function useOrgFeatures(organizationId?: string | null) {
  const [features, setFeatures] =
    useState<OrgFeatureState>(DEFAULT_ORG_FEATURES);

  useEffect(() => {
    if (!organizationId) return;

    const loadFeatures = async () => {
      const response = await fetch(`${API}/site-settings`, {
        cache: "no-store",
      });
      const settings = response.ok
        ? ((await response.json()) as Record<string, unknown>)
        : {};

      setFeatures({
        supplyProducts: isFeatureEnabled(
          settings,
          SUPPLY_PRODUCTS_FEATURE_KEY,
          organizationId,
        ),
        preorderProducts: isFeatureEnabled(
          settings,
          PREORDER_PRODUCTS_FEATURE_KEY,
          organizationId,
        ),
        servicePosts: isFeatureEnabled(
          settings,
          SERVICE_POSTS_FEATURE_KEY,
          organizationId,
          true,
        ),
      });
    };

    loadFeatures().catch(() => setFeatures(DEFAULT_ORG_FEATURES));
  }, [organizationId]);

  return features;
}
