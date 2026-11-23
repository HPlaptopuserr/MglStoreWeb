"use client";

import { useSyncExternalStore } from "react";
import type { CustomerDisplayPayload } from "../types/customer-display.types";
import {
  CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
  isCustomerDisplayThemeId,
} from "../components/PosCustomerDisplay";

import {
  CUSTOMER_DISPLAY_PAYLOAD_KEY as PAYLOAD_KEY,
  CUSTOMER_DISPLAY_REQUEST,
  createCustomerDisplayChannel,
  readCustomerDisplayPayload,
  readDisplayStorage,
} from "../utils/customer-display-sync";
const EMPTY_PAYLOAD: CustomerDisplayPayload = {
  lines: [],
  totals: { subTotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0 },
  displayTheme: "white",
  qpayModal: null,
  loyaltyRedeemSession: null,
  customerSuccess: null,
  ts: 0,
};
let livePayload: CustomerDisplayPayload | null = null;
let liveVersion = 0;
let cachedKey: string | null = null;
let cachedPayload = EMPTY_PAYLOAD;

function getSnapshot(): CustomerDisplayPayload {
  const raw = livePayload
    ? null
    : readDisplayStorage(PAYLOAD_KEY, () => localStorage);
  const savedTheme = readDisplayStorage(
    CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
    () => localStorage,
  );
  const key = JSON.stringify([livePayload ? liveVersion : raw, savedTheme]);
  if (key === cachedKey) return cachedPayload;
  cachedKey = key;
  const theme = isCustomerDisplayThemeId(savedTheme) ? savedTheme : "white";
  try {
    const parsed =
      livePayload ?? (raw ? readCustomerDisplayPayload(JSON.parse(raw)) : null);
    if (!parsed || !Array.isArray(parsed.lines) || !parsed.totals) {
      cachedPayload = { ...EMPTY_PAYLOAD, displayTheme: theme };
    } else {
      cachedPayload = {
        ...parsed,
        displayTheme: isCustomerDisplayThemeId(parsed.displayTheme)
          ? parsed.displayTheme
          : theme,
      };
    }
  } catch {
    cachedPayload = { ...EMPTY_PAYLOAD, displayTheme: theme };
  }
  return cachedPayload;
}

function subscribe(onChange: () => void) {
  const channel = createCustomerDisplayChannel();
  if (channel) {
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const payload = readCustomerDisplayPayload(event.data);
      if (!payload) return;
      livePayload = payload;
      liveVersion += 1;
      onChange();
    };
    // A newly opened display can initialize even when localStorage is full.
    try {
      channel.postMessage(CUSTOMER_DISPLAY_REQUEST);
    } catch {
      /* Storage events remain available. */
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === PAYLOAD_KEY ||
      event.key === CUSTOMER_DISPLAY_THEME_STORAGE_KEY
    ) {
      // Quota recovery removes the stale cache. Do not replace a newer live
      // broadcast with an empty screen if that storage event arrives later.
      if (event.key === PAYLOAD_KEY && event.newValue === null && livePayload)
        return;
      if (event.key === PAYLOAD_KEY || event.key === null) livePayload = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}

export function useCustomerDisplayPayload() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_PAYLOAD);
}
