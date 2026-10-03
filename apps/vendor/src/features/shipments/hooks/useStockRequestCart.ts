"use client";
import type {
  StockRequestCartItem,
  WarehouseInventoryItem,
} from "@/features/shipments/types/stock-request.types";
import type { RecommendedWarehouseItem } from "@/features/shipments/types/warehouse-recommendation.types";
import { useState } from "react";

export function useStockRequestCart() {
  const [cart, setCart] = useState<StockRequestCartItem[]>([]);

  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [deliveryPhone, setDeliveryPhone] = useState("");

  const [note, setNote] = useState("");

  const addToCart = (item: WarehouseInventoryItem) => {
    const existing = cart.find((c) => c.productId === item.product.id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setCart(
          cart.map((c) =>
            c.productId === item.product.id
              ? { ...c, quantity: c.quantity + 1 }
              : c,
          ),
        );
      }
    } else {
      setCart([
        ...cart,
        {
          productId: item.product.id,
          quantity: 1,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          available: item.quantity,
          image: item.product.images[0]?.url || null,
        },
      ]);
    }
  };

  const addRecommendationToCart = (
    item: RecommendedWarehouseItem,
    quantity: number,
  ) => {
    setCart((current) => {
      const product = item.candidate.product;
      const availableStock = item.candidate.features.availableStock;
      const existing = current.find(
        (cartItem) => cartItem.productId === product.id,
      );
      const safeQuantity = Math.min(
        availableStock,
        Math.max(1, existing ? existing.quantity + quantity : quantity),
      );
      const nextItem: StockRequestCartItem = {
        productId: product.id,
        quantity: safeQuantity,
        name: product.name,
        sku: product.sku,
        price: product.price,
        available: availableStock,
        image: product.images[0]?.url || null,
      };
      return existing
        ? current.map((cartItem) =>
            cartItem.productId === product.id ? nextItem : cartItem,
          )
        : [...current, nextItem];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((c) => c.productId !== productId));
    } else {
      setCart(
        cart.map((c) => (c.productId === productId ? { ...c, quantity } : c)),
      );
    }
  };

  const clearCart = () => {
    setCart([]);
    setDeliveryAddress("");
    setDeliveryPhone("");
    setNote("");
  };

  const getCartItemQuantity = (productId: string) => {
    return cart.find((c) => c.productId === productId)?.quantity || 0;
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalCartAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  return {
    cart,
    setCart,
    deliveryAddress,
    setDeliveryAddress,
    deliveryPhone,
    setDeliveryPhone,
    note,
    setNote,
    addToCart,
    addRecommendationToCart,
    updateCartQuantity,
    clearCart,
    getCartItemQuantity,
    totalCartItems,
    totalCartAmount,
  };
}
