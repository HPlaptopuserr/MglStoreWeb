"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { WarehouseDispatchDocument } from "@mgl/types";

const money = (value: string | null) =>
  value === null ? "—" : `${Number(value).toLocaleString("mn-MN")} ₮`;

export function IncomingDispatchReview({
  document,
  submitting,
  onAccept,
}: {
  document: WarehouseDispatchDocument;
  submitting: boolean;
  onAccept: () => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const accepted = document.receiptStatus === "ACCEPTED";
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
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
              disabled={!reviewed || submitting}
              onClick={onAccept}
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
