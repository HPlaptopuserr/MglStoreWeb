import type { CartLine, PosProduct } from "../types/pos.types";

export type PosState = {
  branchId: string;
  shiftId: string;
  products: PosProduct[];
  cart: CartLine[];
  lastError: string | null;
};

export const initialPosState: PosState = {
  branchId: "",
  shiftId: "",
  products: [],
  cart: [],
  lastError: null,
};

export type PosAction =
  | { type: "set-branch"; payload: string }
  | { type: "set-shift"; payload: string }
  | { type: "set-products"; payload: PosProduct[] }
  | { type: "add-line"; payload: CartLine }
  | { type: "remove-line"; payload: string }
  | { type: "set-qty"; payload: { productId: string; qty: number } }
  | {
      type: "set-price";
      payload: {
        productId: string;
        priceType: CartLine["priceType"];
        unitPrice: number;
      };
    }
  | { type: "clear-cart" }
  | { type: "set-error"; payload: string | null };

export function posReducer(state: PosState, action: PosAction): PosState {
  switch (action.type) {
    case "set-branch":
      return { ...state, branchId: action.payload };
    case "set-shift":
      return { ...state, shiftId: action.payload };
    case "set-products":
      return { ...state, products: action.payload };
    case "add-line": {
      if (action.payload.stockQty <= 0) {
        return { ...state, lastError: "Нөөц дууссан бараа байна" };
      }

      const existing = state.cart.find((line) => line.productId === action.payload.productId);
      if (existing) {
        const maxQty = Math.max(0, existing.stockQty);
        const nextQty = Math.min(existing.qty + action.payload.qty, maxQty);

        if (nextQty <= existing.qty) {
          return { ...state, lastError: `"${existing.name}" барааны нөөц хүрэлцэхгүй` };
        }

        return {
          ...state,
          lastError: null,
          cart: state.cart.map((line) =>
            line.productId === action.payload.productId
              ? { ...line, qty: nextQty }
              : line,
          ),
        };
      }
      return { ...state, lastError: null, cart: [...state.cart, action.payload] };
    }
    case "remove-line":
      return {
        ...state,
        cart: state.cart.filter((line) => line.productId !== action.payload),
      };
    case "set-qty":
      return {
        ...state,
        lastError: null,
        cart: state.cart
          .map((line) => {
            if (line.productId !== action.payload.productId) return line;

            const maxQty = Math.max(0, line.stockQty);
            if (maxQty === 0) {
              return { ...line, qty: 0 };
            }

            return {
              ...line,
              qty: Math.min(Math.max(1, action.payload.qty), maxQty),
            };
          })
          .filter((line) => line.qty > 0),
      };
    case "set-price":
      return {
        ...state,
        lastError: null,
        cart: state.cart.map((line) =>
          line.productId === action.payload.productId
            ? {
                ...line,
                priceType: action.payload.priceType,
                unitPrice: action.payload.unitPrice,
              }
            : line,
        ),
      };
    case "clear-cart":
      return { ...state, cart: [] };
    case "set-error":
      return { ...state, lastError: action.payload };
    default:
      return state;
  }
}
