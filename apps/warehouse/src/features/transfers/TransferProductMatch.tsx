"use client";
import { useState } from "react";
import { useTransferResource } from "./useTransferResource";
import type {
  AcceptanceLine,
  TransferLine,
  TransferProduct,
} from "./transfer-types";
export function TransferProductMatch({
  row,
  value,
  warehouseId,
  onChange,
}: {
  row: TransferLine;
  value: AcceptanceLine;
  warehouseId: string;
  onChange: (value: AcceptanceLine) => void;
}) {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useTransferResource<TransferProduct[]>(
    query.trim()
      ? `/warehouses/${encodeURIComponent(warehouseId)}/products?search=${encodeURIComponent(query.trim())}&limit=20`
      : null,
    250,
  );
  const results = data ?? [];
  const [chosen, setChosen] = useState<TransferProduct | undefined>(() =>
    row.matches?.find((product) => product.id === value.targetProductId),
  );
  const options = [
    ...new Map(
      [...(row.matches ?? []), ...results, ...(chosen ? [chosen] : [])].map(
        (product) => [product.id, product],
      ),
    ).values(),
  ];
  return (
    <div className="min-w-64 space-y-3 rounded-lg bg-slate-50 p-3">
      <label className="block text-sm">
        Очих агуулахын бүртгэлээс хайх
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Нэр, SKU, баркод"
          className="mt-1 w-full rounded-lg border border-slate-200 p-2"
        />
      </label>
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Хайж байна…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {query.trim() && !loading && !results.length && !error && (
        <p className="text-sm text-slate-500">Хайлтаар бараа олдсонгүй.</p>
      )}
      <label className="block text-sm">
        Барааг тулгаж холбох
        <select
          value={value.targetProductId}
          onChange={(event) => {
            const target = options.find(
              (product) => product.id === event.target.value,
            );
            setChosen(target);
            onChange({
              ...value,
              targetProductId: event.target.value,
              confirmed: false,
            });
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2"
        >
          <option value="">Сонгоно уу</option>
          {!row.matches?.length && (
            <option value="NEW">Энэ агуулахад шинэ бараа бүртгэх</option>
          )}
          {options.map((product) => (
            <option
              key={product.id}
              value={product.id}
              disabled={product.isActive === false}
            >
              {product.name} · {product.sku ?? product.barcode ?? "Кодгүй"}
              {product.isActive === false ? " (идэвхгүй)" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
