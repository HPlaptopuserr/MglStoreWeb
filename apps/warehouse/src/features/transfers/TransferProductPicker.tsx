"use client";
import { useMemo, useState } from "react";
import { TransferSendTable } from "./TransferSendTable";
import { receiptMoney } from "./transfer-receipt-model";
import type { SendItem, TransferStock } from "./transfer-types";
export function TransferProductPicker({
  inventory,
  items,
  onChange,
}: {
  inventory: TransferStock[];
  items: SendItem[];
  onChange: (items: SendItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return inventory
      .filter(
        (row) =>
          row.quantity > 0 &&
          !items.some((item) => item.productId === row.product.id) &&
          [
            row.product.name,
            row.product.sku,
            row.product.barcode,
            ...(row.product.barcodeAliases ?? []),
          ].some((value) => value?.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [inventory, items, query]);
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Шилжүүлэх бараа</h2>
      <label className="block">
        <span className="sr-only">Бараа хайх</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Барааны нэр, SKU, баркодоор хайх…"
          className="w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-blue-500"
        />
      </label>
      {query.trim() && (
        <div
          className="max-h-64 overflow-auto rounded-lg border border-slate-200"
          aria-live="polite"
        >
          {matches.length ? (
            matches.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  onChange([
                    ...items,
                    {
                      productId: row.product.id,
                      name: row.product.name,
                      quantity: 1,
                      available: row.quantity,
                    },
                  ]);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-blue-50"
              >
                <span>
                  {row.product.name}
                  <small className="block text-slate-500">
                    {row.product.sku} · {row.product.barcode}
                  </small>
                </span>
                <span className="text-right">
                  <span className="block font-medium tabular-nums">
                    {receiptMoney(row.product.price)} ₮
                  </span>
                  <small className="text-slate-500">
                    Нөөц: {row.quantity} ш
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-sm text-slate-500">
              Үлдэгдэлтэй бараа олдсонгүй.
            </p>
          )}
        </div>
      )}
      {!items.length && (
        <p className="rounded-lg border border-slate-200 border-dashed p-8 text-center text-slate-500">
          Шилжүүлэх бараагаа хайж сонгоно уу.
        </p>
      )}
      {items.length > 0 && (
        <TransferSendTable
          inventory={inventory}
          items={items}
          onChange={onChange}
        />
      )}
    </section>
  );
}
