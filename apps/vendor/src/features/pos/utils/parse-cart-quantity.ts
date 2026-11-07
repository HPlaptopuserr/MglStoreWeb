import type { CartLine } from "../types/pos.types";

/** A blank or partial edit must never replace the last valid sale quantity. */
export function parseCartQuantity(
  input: string,
  unit: CartLine["measureUnit"],
): number | null {
  const value = input.trim().replace(",", ".");
  const pattern =
    unit === "kg" ? /^(?:\d+(?:\.\d{0,3})?|\.\d{1,3})$/ : /^\d+$/;
  if (!pattern.test(value)) return null;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity >= (unit === "kg" ? 0.001 : 1)
    ? quantity
    : null;
}
