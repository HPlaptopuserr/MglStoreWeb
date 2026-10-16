"use client";
import { ProductHistoryTrigger } from "@mgl/ui";
import { useMemo } from "react";
import { receiptMoney } from "./transfer-receipt-model";
import type { SendItem, TransferStock } from "./transfer-types";
export function TransferSendTable({
  inventory,
  items,
  onChange,
}: {
  inventory: TransferStock[];
  items: SendItem[];
  onChange: (items: SendItem[]) => void;
}) {
  const products = useMemo(
    () => new Map(inventory.map((row) => [row.product.id, row.product])),
    [inventory],
  );
  const rows = items.map((item) => {
    const product = products.get(item.productId);
    const price =
      product?.price == null || product.price === ""
        ? null
        : Number(product.price);
    const unitPrice =
      price !== null && Number.isFinite(price) && price >= 0 ? price : null;
    return {
      item,
      product,
      unitPrice,
      amount:
        unitPrice !== null && Number.isFinite(item.quantity)
          ? unitPrice * item.quantity
          : null,
    };
  });
  const totalAmount = rows.every((row) => row.amount !== null)
    ? rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
    : null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div
        role="region"
        aria-label="Илгээх барааны дэлгэрэнгүй"
        tabIndex={0}
        className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
      >
        <table className="w-full min-w-[780px] text-left text-sm">
          <caption className="sr-only">
            Илгээгчийн үнэ, нөөц болон шилжүүлгийн дүн
          </caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "№",
                "Бараа / SKU / баркод",
                "Үлдэгдэл",
                "Нэгж үнэ",
                "Илгээх тоо",
                "Нийт дүн",
                "",
              ].map((label, index) => (
                <th
                  key={index}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3"
                >
                  {label || <span className="sr-only">Үйлдэл</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ item, product, unitPrice, amount }, index) => (
              <tr
                key={item.productId}
                className="transition-colors hover:bg-slate-50/70"
              >
                <td className="px-4 py-4 text-slate-400">{index + 1}</td>
                <td className="min-w-48 px-4 py-4">
                  <p className="font-medium text-slate-900">{item.name}</p><ProductHistoryTrigger productId={item.productId} name={item.name} />
                  <p className="mt-1 text-xs text-slate-500">
                    SKU: {product?.sku || "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Баркод: {product?.barcode || "—"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 tabular-nums text-slate-600">
                  {item.available} ш
                </td>
                <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                  {receiptMoney(unitPrice)} ₮
                  {unitPrice === null && (
                    <p className="text-xs text-amber-700">Үнэ ирсэнгүй</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <input
                    aria-label={`${item.name}: илгээх тоо`}
                    type="number"
                    min={1}
                    max={item.available}
                    step={1}
                    value={item.quantity || ""}
                    onChange={(event) =>
                      onChange(
                        items.map((row) =>
                          row.productId === item.productId
                            ? { ...row, quantity: Number(event.target.value) }
                            : row,
                        ),
                      )
                    }
                    aria-invalid={
                      item.quantity > item.available || item.quantity < 1
                    }
                    className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-right tabular-nums outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  {item.quantity > item.available && (
                    <p className="mt-1 text-xs text-red-600">
                      Нөөц хүрэлцэхгүй
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">
                  {receiptMoney(amount)} ₮
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        items.filter((row) => row.productId !== item.productId),
                      )
                    }
                    aria-label={`${item.name} хасах`}
                    className="rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    Хасах
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        <p className="text-sm text-slate-500">
          {items.length} нэр төрөл ·{" "}
          <strong className="text-slate-700">
            {items.reduce((sum, item) => sum + item.quantity, 0)} ш
          </strong>
        </p>
        <p className="text-sm text-slate-500">
          Нийт шилжүүлэх дүн{" "}
          <strong className="ml-3 text-lg tabular-nums text-slate-900">
            {receiptMoney(totalAmount)} ₮
          </strong>
        </p>
      </div>
      <p className="px-5 py-2.5 text-xs text-slate-400">
        Нэгж үнэ нь эх агуулахын зарах үнэ. Энэ үнэ очих агуулахын падаанд суурь
        үнэ болж хадгалагдана.
      </p>
    </div>
  );
}
