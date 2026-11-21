"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { WarehouseDispatchDocument } from "@mgl/types";
import {
  calculateDispatchSalePrices,
  MAX_DISPATCH_SALE_PRICE,
} from "./dispatch-sale-prices";

const money = (value: string | null) =>
  value === null ? "—" : `${Number(value).toLocaleString("mn-MN")} ₮`;

export function IncomingDispatchReview({
  document,
  submitting,
  onAccept,
  onSavePrices,
}: {
  document: WarehouseDispatchDocument;
  submitting: boolean;
  onAccept: (prices: Array<{ itemId: string; salePrice: string }>) => void;
  onSavePrices?: (prices: Array<{ itemId: string; salePrice: string }>) => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [markup, setMarkup] = useState("");
  const calculatedPrices = calculateDispatchSalePrices(document.items, markup);
  const accepted = document.receiptStatus === "ACCEPTED";
  const [salePrices, setSalePrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      document.items.map((item) => [item.id, item.salePrice ?? ""]),
    ),
  );
  const prices = document.items.map((item) => ({
    itemId: item.id,
    salePrice: (salePrices[item.id] ?? "").trim(),
  }));
  const validPrices = prices.every(
    ({ salePrice }) =>
      /^\d{1,16}(?:\.\d{1,2})?$/.test(salePrice) &&
      Number(salePrice) > 0 &&
      Number(salePrice) <= MAX_DISPATCH_SALE_PRICE,
  );
  const pricesChanged = document.items.some(
    (item) => Number(salePrices[item.id]) !== Number(item.salePrice),
  );
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div>
          <h3 className="font-bold text-slate-950">
            Падаан №{document.dispatchNumber}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {document.warehouse.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(document.createdAt).toLocaleString("mn-MN")} ·{" "}
            {document.createdByName}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${accepted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
        >
          {accepted ? "Хүлээн авсан" : "Тулгаж зөвшөөрөх"}
        </span>
      </div>
      <div className="grid gap-2 p-4 text-sm text-slate-600 sm:grid-cols-2 sm:px-5">
        <p>
          Дэлгүүр:{" "}
          <strong className="text-slate-900">
            {document.storeName || "—"}
          </strong>
        </p>
        <p>
          Хүлээн авагч: {document.recipientName || "—"}{" "}
          {document.recipientPhone}
        </p>
        {document.address && (
          <p className="sm:col-span-2">Хаяг: {document.address}</p>
        )}
        {document.note && (
          <p className="sm:col-span-2">Тэмдэглэл: {document.note}</p>
        )}
      </div>
      {!accepted && (
        <fieldset
          disabled={submitting}
          className="mx-4 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3 sm:mx-5"
        >
          <div className="min-w-48 flex-1">
            <label
              htmlFor={`markup-${document.id}`}
              className="block text-sm font-semibold text-slate-800"
            >
              Нэгдсэн нэмэгдэл · 1–100%
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Агуулахын нэгж үнэ дээр нэмэгдэл тооцно. Дараа нь мөр бүрийн зарах
              үнийг гараар засаж болно.
            </p>
          </div>
          <div>
            <label htmlFor={`markup-${document.id}`} className="sr-only">
              Зарах үнийн нэмэгдэл (%)
            </label>
            <input
              id={`markup-${document.id}`}
              aria-label="Зарах үнийн нэмэгдэл (%)"
              type="text"
              inputMode="numeric"
              placeholder="1–100%"
              value={markup}
              onChange={(event) => setMarkup(event.target.value)}
              className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-3 text-right tabular-nums focus:outline-2 focus:outline-cyan-700"
            />
          </div>
          <button
            type="button"
            disabled={!calculatedPrices || submitting}
            onClick={() => {
              if (calculatedPrices) {
                setSalePrices(calculatedPrices);
                setReviewed(false);
              }
            }}
            className="min-h-10 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:opacity-50"
          >
            Бүх бараанд тооцох
          </button>
          {markup && !calculatedPrices && (
            <p role="status" className="w-full text-xs text-amber-800">
              1–100 хүртэл бүхэл хувь оруулна уу. Нэгж үнэ байхгүй бараанд зарах
              үнийг гараар оруулна.
            </p>
          )}
        </fieldset>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">
            {document.dispatchNumber} падааны бараа
          </caption>
          <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-5">
                Бараа / SKU / Баркод
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Тоо
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Нэгж үнэ
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Зарах үнэ
              </th>
              <th scope="col" className="px-4 py-3 text-right sm:px-5">
                Дүн
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {document.items.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="px-4 py-3 font-medium sm:px-5">
                  <span className="block text-slate-900">{item.name}</span>
                  <span className="text-xs font-normal text-slate-500">
                    SKU: {item.sku || "—"}
                  </span>
                  <span className="block break-all text-xs font-normal tabular-nums text-slate-600">
                    Баркод: {item.barcode || "Бүртгэлгүй"}
                  </span>
                </th>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {item.quantity.toLocaleString("mn-MN")} {item.unit || "ш"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {money(item.unitPrice)}
                </td>
                <td className="px-3 py-3 text-right">
                  <input
                    aria-label={`${item.name} зарах үнэ`}
                    type="text"
                    inputMode="decimal"
                    placeholder="Үнэ оруулах"
                    disabled={submitting}
                    value={salePrices[item.id] ?? ""}
                    onChange={(event) => {
                      setReviewed(false);
                      setSalePrices((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }));
                    }}
                    className="h-10 w-32 rounded-lg border border-slate-300 px-2 text-right tabular-nums focus:outline-2 focus:outline-cyan-700 disabled:opacity-50"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                  {money(item.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-slate-500">
            {document.items.length} төрөл ·{" "}
            {document.paymentStatus === "PAID"
              ? "Төлбөр төлсөн"
              : document.paymentStatus === "CREDIT"
                ? "Зээлээр"
                : "Төлбөр тэмдэглээгүй"}
          </span>
          <strong className="text-base text-slate-950">
            Нийт: {money(document.totalAmount)}
          </strong>
        </div>
        <p className="text-xs text-slate-600">
          Нэгж үнэ нь агуулахаас авсан өртөг. Зарах үнэ нь дэлгүүрийн борлуулах
          үнэ бөгөөд бүтээгдэхүүнд хадгалагдана.
        </p>
        {accepted && onSavePrices && (
          <button
            type="button"
            disabled={submitting || !validPrices || !pricesChanged}
            onClick={() => onSavePrices(prices)}
            className="min-h-11 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Хадгалж байна…" : "Зарах үнэ хадгалах"}
          </button>
        )}
        {!validPrices && (
          <p className="text-sm text-amber-800">
            Бараа бүрийн зарах үнийг тэгээс их, 1,000,000,000₮-өөс хэтрэхгүй
            дүнгээр оруулна уу.
          </p>
        )}
        {accepted ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>
              Бараа бүтээгдэхүүн болон үлдэгдэлд бүртгэгдсэн.{" "}
              <Link href="/products" className="font-semibold underline">
                Миний бүтээгдэхүүн харах
              </Link>
            </p>
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={submitting}
                onChange={(event) => setReviewed(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-cyan-700"
              />
              Барааны нэр, тоо хэмжээ, үнийг падаантай тулгаж, бүрэн хүлээн
              авснаа баталж байна.
            </label>
            <p className="text-xs leading-5 text-slate-500">
              Зөвшөөрөхөд эдгээр бараа таны бүтээгдэхүүн болон үлдэгдэлд
              нэмэгдэнэ. Зөрүүтэй бол зөвшөөрөхөөс өмнө агуулахтай холбогдоно
              уу.
            </p>
            <button
              type="button"
              disabled={!reviewed || submitting || !validPrices}
              onClick={() => onAccept(prices)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting && (
                <Loader2
                  size={16}
                  className="animate-spin motion-reduce:animate-none"
                />
              )}
              {submitting
                ? "Бүртгэж байна…"
                : "Зөвшөөрч, бүтээгдэхүүнд бүртгэх"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
