// Simple localStorage-backed cart store with custom events for cross-component sync

import { trackProductInteraction } from "./product-interest";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  basePrice?: number | null;
  originalPrice?: number | null;
  memberDiscountPercent?: number | null;
  discountLabel?: string | null;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  image?: string;
  quantity: number;
}

const STORAGE_KEY = "mgl_cart";
const CART_EVENT = "mgl_cart_change";
const EMPTY_CART: CartItem[] = [];
let cachedRawCart: string | null = null;
let cachedCart: CartItem[] = EMPTY_CART;

function readCart(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  const rawCart = localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (rawCart === cachedRawCart) return cachedCart;

  try {
    const parsed = JSON.parse(rawCart);
    cachedCart = Array.isArray(parsed) ? parsed : EMPTY_CART;
  } catch {
    cachedCart = EMPTY_CART;
  }
  cachedRawCart = rawCart;
  return cachedCart;
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function getServerCart(): CartItem[] {
  return EMPTY_CART;
}

export function subscribeCart(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(CART_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CART_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function repairCartProductPrices(
  products: Array<{
    id: string;
    basePrice: number;
    supplyType?: CartItem["supplyType"];
  }>,
) {
  if (products.length === 0) return;
  const repairs = new Map(products.map((product) => [product.id, product]));
  let changed = false;
  const items = readCart().map((item) => {
    const repair = repairs.get(item.id);
    if (!repair || repair.basePrice <= 0) return item;
    changed = true;
    return {
      ...item,
      price: repair.basePrice,
      basePrice: repair.basePrice,
      originalPrice: null,
      memberDiscountPercent: null,
      discountLabel: null,
      supplyType: repair.supplyType ?? item.supplyType,
    };
  });
  if (changed) writeCart(items);
}

export function addToCart(
  item: Omit<CartItem, "quantity"> & { quantity?: number },
) {
  const items = readCart();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx].quantity += item.quantity ?? 1;
    items[idx] = { ...items[idx], ...item, quantity: items[idx].quantity };
  } else {
    items.push({ ...item, quantity: item.quantity ?? 1 });
  }
  writeCart(items);
  trackProductInteraction({
    type: "ADD_TO_CART",
    productId: item.id,
    source: "cart",
  });
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter((i) => i.id !== id));
}

export function updateQuantity(id: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  const items = readCart();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].quantity = quantity;
    writeCart(items);
  }
}

export function clearCart() {
  writeCart([]);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export { CART_EVENT };
