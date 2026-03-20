// Simple localStorage-backed cart store with custom events for cross-component sync

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

const STORAGE_KEY = "mgl_cart";
const CART_EVENT = "mgl_cart_change";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const items = readCart();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx].quantity += item.quantity ?? 1;
  } else {
    items.push({ ...item, quantity: item.quantity ?? 1 });
  }
  writeCart(items);
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter((i) => i.id !== id));
}

export function updateQuantity(id: string, quantity: number) {
  if (quantity <= 0) { removeFromCart(id); return; }
  const items = readCart();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) { items[idx].quantity = quantity; writeCart(items); }
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
