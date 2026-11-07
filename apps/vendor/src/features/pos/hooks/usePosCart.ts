import { useEffect, useMemo, useReducer, useState } from "react";
import { calculateCartTotal } from "../utils/calculate-cart-total";
import { initialPosState, posReducer } from "../store/pos.store";
import type { PosProduct } from "../types/pos.types";
import { isCartLine } from "../utils/cart-line-validation";
import {
  normalizePosMeasureUnit,
  POS_WEIGHT_STEP_KG,
  roundPosQuantity,
} from "@mgl/types";

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

function loadStoredPosState(storageScope?: string) {
  if (typeof window === "undefined") return initialPosState;

  try {
    const rawCart = window.localStorage.getItem(
      resolveCartStorageKey(storageScope),
    );
    if (!rawCart) return initialPosState;

    const parsed = JSON.parse(rawCart);
    if (!Array.isArray(parsed)) return initialPosState;

    const cart = parsed
      .filter(isCartLine)
      .map((line) => {
        const measureUnit = normalizePosMeasureUnit(line.measureUnit);
        const minimumQty = measureUnit === "kg" ? POS_WEIGHT_STEP_KG : 1;
        const stockQty = Math.max(
          0,
          roundPosQuantity(line.stockQty, measureUnit),
        );
        return {
          ...line,
          measureUnit,
          priceType: line.priceType || "UNIT",
          baseUnitPrice: line.baseUnitPrice ?? line.unitPrice,
          qty: Math.min(
            Math.max(minimumQty, roundPosQuantity(line.qty, measureUnit)),
            stockQty,
          ),
          stockQty,
          unitPrice: Math.max(0, line.unitPrice),
          taxRate: Math.max(0, line.taxRate),
          discountAmount: Math.max(0, line.discountAmount),
        };
      })
      .filter((line) => line.stockQty > 0 && line.qty > 0);

    return { ...initialPosState, cart };
  } catch {
    return initialPosState;
  }
}

export function usePosCart(storageScope?: string) {
  const [state, dispatch] = useReducer(posReducer, initialPosState);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const storageKey = storageScope ? resolveCartStorageKey(storageScope) : null;

  useEffect(() => {
    if (!storageKey || !storageScope) return;
    try {
      let stored = loadStoredPosState(storageScope);
      // Migrate the old organization basket once; new baskets are register scoped.
      if (!window.localStorage.getItem(storageKey)) {
        const legacyKey = resolveCartStorageKey();
        stored = loadStoredPosState();
        if (stored.cart.length) {
          window.localStorage.setItem(storageKey, JSON.stringify(stored.cart));
          window.localStorage.removeItem(legacyKey);
        }
      }
      dispatch({ type: "restore-cart", payload: stored.cart });
      setLoadedScope(storageKey);
    } catch {
      dispatch({
        type: "set-error",
        payload:
          "Сагсыг хадгалах сан руу хандаж чадсангүй. Төлбөр эхлүүлэхийн өмнө browser-ийн хадгалалтаа шалгана уу.",
      });
    }
  }, [storageKey, storageScope]);

  const totals = useMemo(() => calculateCartTotal(state.cart), [state.cart]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !storageKey ||
      loadedScope !== storageKey
    )
      return;
    try {
      if (state.cart.length === 0) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(state.cart));
    } catch {
      dispatch({
        type: "set-error",
        payload:
          "Сагсыг хадгалж чадсангүй. Browser-ийн хадгалалтаа шалгана уу.",
      });
    }
  }, [state.cart, storageKey, loadedScope]);

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

    const initialQty =
      product.measureUnit === "kg" ? Math.min(1, product.stockQty) : 1;
    dispatch({
      type: "add-line",
      payload: {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl ?? null,
        qty: roundPosQuantity(initialQty, product.measureUnit),
        stockQty: product.stockQty,
        unitPrice: product.price,
        priceType: "UNIT",
        baseUnitPrice: product.price,
        wholesalePrice: product.wholesalePrice ?? null,
        orderPrice: product.orderPrice ?? null,
        taxType: product.taxType || "VAT_ABLE",
        taxRate: product.taxRate ?? 0,
        cityTaxRate: product.cityTaxRate ?? 0,
        classificationCode: product.classificationCode || "6212991",
        taxProductCode: product.taxProductCode || null,
        measureUnit: product.measureUnit || "pcs",
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
