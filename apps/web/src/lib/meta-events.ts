"use client";

import { API } from "@/lib/api";

type MetaEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export type MetaCommerceData = {
  content_ids: string[];
  content_name?: string;
  content_type: "product";
  currency: "MNT";
  value: number;
  num_items?: number;
};

type MetaEventPayload = {
  eventName: MetaEventName;
  eventId: string;
  sourceUrl: string;
  customData: MetaCommerceData;
  fbp?: string;
  fbc?: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function readCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : undefined;
}

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function trackMetaCommerceEvent(
  eventName: MetaEventName,
  customData: MetaCommerceData,
) {
  if (typeof window === "undefined") return;

  const eventId = createEventId();
  window.fbq?.("track", eventName, customData, { eventID: eventId });

  const payload: MetaEventPayload = {
    eventName,
    eventId,
    sourceUrl: window.location.href,
    customData,
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
  };

  fetch(`${API}/marketing/meta/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Marketing telemetry must never interrupt the shopping flow.
  });
}
