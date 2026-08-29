"use client";

import type { DeliverySession } from "@/components/organisms/checkout/DeliveryDispatchRadar";

const LEGACY_STORAGE_KEY = "mgl_active_checkout_dispatch";
const STORAGE_KEY_PREFIX = `${LEGACY_STORAGE_KEY}:user:`;
export const ACTIVE_CHECKOUT_DISPATCH_EVENT = "mgl_active_checkout_dispatch_change";

const getStorageKey = (userId: string) =>
  `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;

function removeLegacyDispatch() {
  // The old value has no owner information and must never be assigned to the
  // next account that signs in on the same browser.
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function getActiveCheckoutDispatch(
  userId: string | null | undefined,
): DeliverySession | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    removeLegacyDispatch();
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliverySession;
    return parsed?.orderId ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveCheckoutDispatch(
  userId: string | null | undefined,
  session: DeliverySession | null,
) {
  if (typeof window === "undefined" || !userId) return;
  removeLegacyDispatch();
  const storageKey = getStorageKey(userId);
  if (session) {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } else {
    localStorage.removeItem(storageKey);
  }
  window.dispatchEvent(new Event(ACTIVE_CHECKOUT_DISPATCH_EVENT));
}
