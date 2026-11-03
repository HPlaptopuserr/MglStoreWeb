"use client";

import { useSyncExternalStore } from "react";
import type { CustomerDisplayPayload } from "../types/customer-display.types";
import {
  CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
  isCustomerDisplayThemeId,
} from "../components/PosCustomerDisplay";

const PAYLOAD_KEY = "mgl_pos_customer_payload";
const EMPTY_PAYLOAD: CustomerDisplayPayload = {
  lines: [],
  totals: { subTotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0 },
  displayTheme: "white",
  qpayModal: null,
  loyaltyRedeemSession: null,
  customerSuccess: null,
  ts: 0,
};
let cachedKey: string | null = null;
let cachedPayload = EMPTY_PAYLOAD;

function getSnapshot(): CustomerDisplayPayload {
  const raw = localStorage.getItem(PAYLOAD_KEY);
  const savedTheme = localStorage.getItem(CUSTOMER_DISPLAY_THEME_STORAGE_KEY);
  const key = JSON.stringify([raw, savedTheme]);
  if (key === cachedKey) return cachedPayload;
  cachedKey = key;
  const theme = isCustomerDisplayThemeId(savedTheme) ? savedTheme : "white";
  try {
    const parsed = raw ? (JSON.parse(raw) as CustomerDisplayPayload) : null;
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
  const channel = new BroadcastChannel("mgl-pos-customer-display");
  channel.onmessage = onChange;
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === PAYLOAD_KEY ||
      event.key === CUSTOMER_DISPLAY_THEME_STORAGE_KEY
    )
      onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel.close();
    window.removeEventListener("storage", onStorage);
  };
}

export function useCustomerDisplayPayload() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_PAYLOAD);
}
