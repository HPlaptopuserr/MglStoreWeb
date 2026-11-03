"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { SharedProduct } from "./types";
import {
  getBasket,
  getServerBasket,
  subscribeBasket,
  writeBasket,
} from "./basket-store";
export function useSharedBasket() {
  const lines = useSyncExternalStore(
    subscribeBasket,
    getBasket,
    getServerBasket,
  );
  const [notice, setNotice] = useState("");
  function add(product: SharedProduct) {
    const current = getBasket();
    if (!product.orderable || product.stock < 1) return;
    if (
      current.length &&
      current[0].product.warehouse?.id !== product.warehouse?.id
    ) {
      setNotice("Одоогийн сагсаа захиалж дуусгаад өөр агуулахаас сонгоно уу.");
      return;
    }
    setNotice(`${product.name} сагсанд нэмэгдлээ.`);
    const existing = current.find((line) => line.product.id === product.id);
    writeBasket(
      existing
        ? current.map((line) =>
            line.product.id === product.id
              ? {
                  product,
                  quantity: Math.min(
                    line.quantity + 1,
                    Math.floor(product.stock),
                  ),
                }
              : line,
          )
        : [...current, { product, quantity: 1 }],
    );
  }
  function quantity(id: string, value: number) {
    writeBasket(
      getBasket().flatMap((line) =>
        line.product.id !== id
          ? [line]
          : value < 1
            ? []
            : [
                {
                  ...line,
                  quantity: Math.min(value, Math.floor(line.product.stock)),
                },
              ],
      ),
    );
  }
  return {
    lines,
    notice,
    add,
    quantity,
    clear: useCallback(() => writeBasket([]), []),
    removePurchased: useCallback(
      (items: ReadonlyArray<{ productId: string; quantity: number }>) => {
        const purchased = new Map(
          items.map((item) => [item.productId, item.quantity]),
        );
        writeBasket(
          getBasket().flatMap((line) => {
            const remaining =
              line.quantity - (purchased.get(line.product.id) ?? 0);
            return remaining > 0 ? [{ ...line, quantity: remaining }] : [];
          }),
        );
      },
      [],
    ),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce(
      (sum, line) => sum + Number(line.product.price) * line.quantity,
      0,
    ),
  };
}
