"use client";

import type { DeliverySession } from "@/components/organisms/checkout/DeliveryDispatchRadar";

const STORAGE_KEY = "mgl_active_checkout_dispatch";
export const ACTIVE_CHECKOUT_DISPATCH_EVENT = "mgl_active_checkout_dispatch_change";

export function getActiveCheckoutDispatch(): DeliverySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliverySession;
    return parsed?.orderId ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveCheckoutDispatch(session: DeliverySession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(ACTIVE_CHECKOUT_DISPATCH_EVENT));
}
