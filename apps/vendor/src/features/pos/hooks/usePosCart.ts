import { useEffect, useMemo, useReducer } from "react";
import { calculateCartTotal } from "../utils/calculate-cart-total";
import { initialPosState, posReducer } from "../store/pos.store";
import type { CartLine, PosProduct } from "../types/pos.types";

const POS_CART_STORAGE_PREFIX = "mglstore.vendor.pos.cart.v1";

function resolveCartStorageKey(storageScope?: string) {
  if (storageScope) return `${POS_CART_STORAGE_PREFIX}:${storageScope}`;
  if (typeof window === "undefined") return POS_CART_STORAGE_PREFIX;

  try {
    const rawUser = window.localStorage.getItem("vendor_user");
    const parsed = rawUser ? JSON.parse(rawUser) : null;
    if (parsed?.organizationId) {
      return `${POS_CART_STORAGE_PREFIX}:${parsed.organizationId}`;
    }
  } catch {
    // Fall back to the generic key when the local user payload is unavailable.
  }

  return POS_CART_STORAGE_PREFIX;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;

  const line = value as CartLine;
  return (
    typeof line.productId === "string" &&
    typeof line.name === "string" &&
    Number.isFinite(line.qty) &&
    Number.isFinite(line.stockQty) &&
    Number.isFinite(line.unitPrice) &&
    Number.isFinite(line.taxRate) &&
    Number.isFinite(line.discountAmount)
  );
}

function loadStoredPosState() {
  if (typeof window === "undefined") return initialPosState;

  try {
    const rawCart = window.localStorage.getItem(resolveCartStorageKey());
    if (!rawCart) return initialPosState;

    const parsed = JSON.parse(rawCart);
    if (!Array.isArray(parsed)) return initialPosState;

    const cart = parsed
      .filter(isCartLine)
      .map((line) => ({
        ...line,
        qty: Math.min(Math.max(1, Math.floor(line.qty)), Math.max(1, Math.floor(line.stockQty))),
        stockQty: Math.max(0, Math.floor(line.stockQty)),
        unitPrice: Math.max(0, line.unitPrice),
        taxRate: Math.max(0, line.taxRate),
        discountAmount: Math.max(0, line.discountAmount),
      }))
      .filter((line) => line.stockQty > 0 && line.qty > 0);

    return { ...initialPosState, cart };
  } catch {
    return initialPosState;
  }
}

export function usePosCart() {
  const [state, dispatch] = useReducer(posReducer, undefined, loadStoredPosState);
  const storageKey = useMemo(() => resolveCartStorageKey(), []);

  const totals = useMemo(() => calculateCartTotal(state.cart), [state.cart]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (state.cart.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(state.cart));
  }, [state.cart, storageKey]);

  const addProduct = (product: PosProduct) => {
    const currentLine = state.cart.find(
      (line) => line.productId === product.id,
    );
    const currentQty = currentLine?.qty ?? 0;

    if (product.stockQty <= 0) {
      dispatch({
        type: "set-error",
        payload: `"${product.name}" барааны нөөц дууссан`,
      });
      return { ok: false as const, reason: "out-of-stock" as const };
    }

    if (currentQty >= product.stockQty) {
      dispatch({
        type: "set-error",
        payload: `"${product.name}" барааны нөөц хүрэлцэхгүй`,
      });
      return { ok: false as const, reason: "stock-limit" as const };
    }

    dispatch({
      type: "add-line",
      payload: {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl ?? null,
        qty: 1,
        stockQty: product.stockQty,
        unitPrice: product.price,
        taxRate: product.taxRate ?? 0,
        discountAmount: 0,
      },
    });

    return { ok: true as const };
  };

  return {
    state,
    totals,
    dispatch,
    addProduct,
  };
}
