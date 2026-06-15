"use client";

import { API } from "@/lib/api";
import { getToken } from "@/lib/auth-context";

const VISITOR_ID_KEY = "mgl_product_visitor_id";

export type ProductInteractionType =
  | "VIEW"
  | "SEARCH"
  | "CATEGORY_VIEW"
  | "ADD_TO_CART"
  | "WISHLIST"
  | "SHARE"
  | "RECOMMENDATION_CLICK"
  | "PURCHASE";

type ProductInteractionPayload = {
  type: ProductInteractionType;
  productId?: string | null;
  businessCategoryId?: string | null;
  organizationId?: string | null;
  searchQuery?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `web:${crypto.randomUUID()}`;
  }
  return `web:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
}

export function getProductVisitorId() {
  if (typeof window === "undefined") return "";
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = createVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function appendProductVisitorId(params: URLSearchParams) {
  const visitorId = getProductVisitorId();
  if (visitorId) params.set("visitorId", visitorId);
  return params;
}

export function trackProductInteraction(payload: ProductInteractionPayload) {
  if (typeof window === "undefined") return;

  const visitorId = getProductVisitorId();
  if (!visitorId) return;

  const body = JSON.stringify({
    ...payload,
    visitorId,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(`${API}/products/events`, {
    method: "POST",
    headers,
    body,
    keepalive: true,
  }).catch(() => {
    // Recommendation tracking must never interrupt shopping.
  });
}
