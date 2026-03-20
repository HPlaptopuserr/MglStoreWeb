"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  cartTotal,
  cartCount,
  CART_EVENT,
  type CartItem,
} from "@/lib/cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const sync = useCallback(() => setItems(getCart()), []);

  useEffect(() => {
    sync();
    window.addEventListener(CART_EVENT, sync);
    return () => window.removeEventListener(CART_EVENT, sync);
  }, [sync]);

  return {
    items,
    total: cartTotal(items),
    count: cartCount(items),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
