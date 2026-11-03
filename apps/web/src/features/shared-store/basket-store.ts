import type { BasketLine } from "./types";
const KEY = "mgl_shared_store_basket_v1";
const EVENT = "mgl_shared_store_basket_change";
const EMPTY: BasketLine[] = [];
let cachedRaw: string | null = null;
let cached: BasketLine[] = EMPTY;
export function getServerBasket() {
  return EMPTY;
}
export function getBasket(): BasketLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string;
  try {
    raw = localStorage.getItem(KEY) || "[]";
  } catch {
    return cached;
  }
  if (cachedRaw === raw) return cached;
  cachedRaw = raw;
  try {
    const saved: unknown = JSON.parse(raw);
    cached = Array.isArray(saved)
      ? saved
          .filter((line: unknown): line is BasketLine => {
            if (!line || typeof line !== "object") return false;
            const value = line as Partial<BasketLine>;
            return Boolean(
              value.product?.id &&
              value.product.warehouse?.id &&
              Number.isFinite(Number(value.product.price)) &&
              Number.isSafeInteger(value.quantity) &&
              Number(value.quantity) > 0,
            );
          })
          .slice(0, 60)
      : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}
export function writeBasket(lines: BasketLine[]) {
  cached = lines;
  cachedRaw = JSON.stringify(lines);
  try {
    localStorage.setItem(KEY, cachedRaw);
  } catch {
    /* The in-memory basket remains usable. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function subscribeBasket(onChange: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", storage);
  };
}
