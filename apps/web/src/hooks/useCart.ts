"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import {
  resolveMarketplacePricingAudience,
  resolveMemberPricing,
} from "@/lib/member-pricing";
import {
  getCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  cartTotal,
  cartCount,
  getServerCart,
  repairCartProductPrices,
  subscribeCart,
  type CartItem,
} from "@/lib/cart";

const pendingPriceRepairIds = new Set<string>();

export function useCart() {
  const { user } = useAuth();
  const storedItems = useSyncExternalStore(
    subscribeCart,
    getCart,
    getServerCart,
  );

  const pricingAudience = resolveMarketplacePricingAudience(user);

  useEffect(() => {
    const repairItems = storedItems.filter((item) => {
      const basePrice = Number(
        item.basePrice ?? item.originalPrice ?? item.price,
      );
      return basePrice <= 0 && !pendingPriceRepairIds.has(item.id);
    });
    if (repairItems.length === 0) return;

    repairItems.forEach((item) => pendingPriceRepairIds.add(item.id));

    Promise.all(
      repairItems.map(async (item) => {
        try {
          const response = await fetch(
            `${API}/products/${encodeURIComponent(item.id)}`,
          );
          if (!response.ok) return null;
          const product = (await response.json()) as {
            id?: string;
            price?: number | string | null;
            supplyType?: CartItem["supplyType"];
          };
          const basePrice = Number(product.price);
          if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
          return {
            id: product.id || item.id,
            basePrice,
            supplyType: product.supplyType,
          };
        } catch {
          return null;
        } finally {
          pendingPriceRepairIds.delete(item.id);
        }
      }),
    ).then((products) => {
      repairCartProductPrices(products.filter((product) => product !== null));
    });
  }, [storedItems]);

  const items: CartItem[] = storedItems.map((item) => {
    if (item.supplyType !== "CHINA_PREORDER") return item;

    const basePrice = item.basePrice ?? item.originalPrice ?? item.price;
    const pricing = resolveMemberPricing(
      basePrice,
      null,
      pricingAudience,
      item.supplyType,
    );

    return {
      ...item,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      memberDiscountPercent: pricing.active ? pricing.percent : null,
      discountLabel: pricing.label,
    };
  });

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
