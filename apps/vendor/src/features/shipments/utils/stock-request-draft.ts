import type {
  StockRequestCartItem,
  StockRequestUser,
} from "../types/stock-request.types";

export interface StockRequestDraft {
  cart: StockRequestCartItem[];
  deliveryAddress: string;
  deliveryPhone: string;
  note: string;
}

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const emptyStockRequestDraft = (): StockRequestDraft => ({
  cart: [],
  deliveryAddress: "",
  deliveryPhone: "",
  note: "",
});

export function stockRequestDraftKey(
  user: StockRequestUser | null,
  warehouseId: string | null,
): string {
  return user?.id && user.organizationId && warehouseId
    ? `vendor-stock-request-draft:v1:${JSON.stringify([user.id, user.organizationId, warehouseId])}`
    : "";
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cartItem(value: unknown): value is StockRequestCartItem {
  return (
    record(value) &&
    typeof value.productId === "string" &&
    Boolean(value.productId) &&
    typeof value.name === "string" &&
    (value.sku === null || typeof value.sku === "string") &&
    (value.image === null || typeof value.image === "string") &&
    typeof value.price === "string" &&
    value.price.trim() !== "" &&
    Number.isFinite(Number(value.price)) &&
    Number(value.price) >= 0 &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity > 0 &&
    typeof value.available === "number" &&
    Number.isSafeInteger(value.available) &&
    value.available >= 0
  );
}

export function readStockRequestDraft(
  storage: DraftStorage,
  key: string,
): StockRequestDraft {
  if (!key) return emptyStockRequestDraft();
  const raw = storage.getItem(key);
  if (raw === null) return emptyStockRequestDraft();
  const saved: unknown = JSON.parse(raw);
  if (!record(saved) || saved.version !== 1 || !record(saved.draft))
    throw new Error("Invalid stock request draft");
  const draft = saved.draft;
  if (
    !Array.isArray(draft.cart) ||
    draft.cart.length > 5000 ||
    !draft.cart.every(cartItem) ||
    new Set(draft.cart.map((item) => item.productId)).size !==
      draft.cart.length ||
    typeof draft.deliveryAddress !== "string" ||
    typeof draft.deliveryPhone !== "string" ||
    typeof draft.note !== "string"
  )
    throw new Error("Invalid stock request draft");
  return {
    cart: draft.cart,
    deliveryAddress: draft.deliveryAddress,
    deliveryPhone: draft.deliveryPhone,
    note: draft.note,
  };
}

export function saveStockRequestDraft(
  storage: DraftStorage,
  key: string,
  draft: StockRequestDraft,
): void {
  if (!key) return;
  if (
    !draft.cart.length &&
    !draft.deliveryAddress &&
    !draft.deliveryPhone &&
    !draft.note
  )
    storage.removeItem(key);
  else storage.setItem(key, JSON.stringify({ version: 1, draft }));
}
