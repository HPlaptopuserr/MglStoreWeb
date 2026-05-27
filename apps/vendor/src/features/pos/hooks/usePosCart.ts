import { useMemo, useReducer } from "react";
import { calculateCartTotal } from "../utils/calculate-cart-total";
import { initialPosState, posReducer } from "../store/pos.store";
import type { PosProduct } from "../types/pos.types";

export function usePosCart() {
  const [state, dispatch] = useReducer(posReducer, initialPosState);

  const totals = useMemo(() => calculateCartTotal(state.cart), [state.cart]);

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
