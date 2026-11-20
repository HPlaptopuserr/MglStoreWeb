"use client";
import type {
  StockRequestCartItem,
  WarehouseInventoryItem,
  StockRequestUser,
} from "@/features/shipments/types/stock-request.types";
import type { RecommendedWarehouseItem } from "@/features/shipments/types/warehouse-recommendation.types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  emptyStockRequestDraft,
  readStockRequestDraft,
  saveStockRequestDraft,
  stockRequestDraftKey,
  type StockRequestDraft,
} from "../utils/stock-request-draft";

export function useStockRequestCart(
  user: StockRequestUser | null,
  warehouseId: string | null,
) {
  const key = stockRequestDraftKey(user, warehouseId);
  const [saved, setSaved] = useState({
    key: "",
    draft: emptyStockRequestDraft(),
  });
  const current = useRef(saved);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let draft = emptyStockRequestDraft();
    try {
      if (key) draft = readStockRequestDraft(localStorage, key);
      setStorageError("");
    } catch {
      setStorageError(
        "Хадгалсан сагсыг сэргээж чадсангүй. Төхөөрөмжийн хадгалах сангийн тохиргоог шалгана уу.",
      );
    }
    const next = { key, draft };
    current.current = next;
    setSaved(next);
  }, [key]);

  const updateDraft = useCallback(
    (update: (draft: StockRequestDraft) => StockRequestDraft) => {
      const activeKey = current.current.key;
      if (!activeKey) return;
      const draft = update(current.current.draft);
      const next = { key: activeKey, draft };
      current.current = next;
      setSaved(next);
      // Persist in the same interaction, before a route change or tab close.
      try {
        saveStockRequestDraft(localStorage, activeKey, draft);
        setStorageError("");
      } catch {
        setStorageError(
          "Сагс хадгалагдсангүй. Энэ цонхоо хаалгүй төхөөрөмжийн хадгалах санг шалгана уу.",
        );
      }
    },
    [],
  );
  const draft = saved.key === key ? saved.draft : emptyStockRequestDraft();
  const { cart, deliveryAddress, deliveryPhone, note } = draft;
  const setCart = useCallback(
    (value: SetStateAction<StockRequestCartItem[]>) => {
      updateDraft((draft) => ({
        ...draft,
        cart: typeof value === "function" ? value(draft.cart) : value,
      }));
    },
    [updateDraft],
  );
  const setField = (
    field: "deliveryAddress" | "deliveryPhone" | "note",
    value: SetStateAction<string>,
  ) =>
    updateDraft((draft) => ({
      ...draft,
      [field]: typeof value === "function" ? value(draft[field]) : value,
    }));
  const setDeliveryAddress = (value: SetStateAction<string>) =>
    setField("deliveryAddress", value);
  const setDeliveryPhone = (value: SetStateAction<string>) =>
    setField("deliveryPhone", value);
  const setNote = (value: SetStateAction<string>) => setField("note", value);

  const addToCart = (item: WarehouseInventoryItem) => {
    if (item.quantity < 1) return;
    setCart((current) => {
      const existing = current.find(
        (line) => line.productId === item.product.id,
      );
      if (existing)
        return current.map((line) =>
          line.productId === item.product.id
            ? {
                ...line,
                quantity: Math.min(line.quantity + 1, item.quantity),
                available: item.quantity,
                price: item.product.price,
              }
            : line,
        );
      return [
        ...current,
        {
          productId: item.product.id,
          quantity: 1,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          available: item.quantity,
          image: item.product.images[0]?.url || null,
        },
      ];
    });
  };

  const addRecommendationToCart = (
    item: RecommendedWarehouseItem,
    quantity: number,
  ) => {
    if (item.candidate.features.availableStock < 1) return;
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
    if (!Number.isSafeInteger(quantity)) return;
    setCart((current) =>
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) =>
            line.productId === productId ? { ...line, quantity } : line,
          ),
    );
  };

  const clearCart = useCallback(() => {
    if (!key) return;
    const draft = emptyStockRequestDraft();
    if (current.current.key === key) {
      const next = { key, draft };
      current.current = next;
      setSaved(next);
    }
    try {
      saveStockRequestDraft(localStorage, key, draft);
      setStorageError("");
    } catch {
      setStorageError(
        "Илгээсэн захиалгын сагсыг цэвэрлэж чадсангүй. Дахин захиалга илгээхээс өмнө сагсаа шалгана уу.",
      );
    }
  }, [key]);

  const getCartItemQuantity = (productId: string) => {
    return cart.find((c) => c.productId === productId)?.quantity || 0;
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalCartAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  return {
    storageError,
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
