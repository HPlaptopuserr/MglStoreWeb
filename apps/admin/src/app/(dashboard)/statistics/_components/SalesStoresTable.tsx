"use client";

import { useId, useState } from "react";
import { Maximize2 } from "lucide-react";
import type { AdminSalesStore } from "@/lib/admin-sales-stores-api";
import { SalesStoreDetailsDialog } from "./SalesStoreDetailsDialog";

const columns = [
  "№",
  "Дэлгүүрийн нэр",
  "Регистр",
  "Хариуцсан ХТ",
  "Холбоо барих хүн",
  "Утас",
  "Имэйл",
  "Хаяг",
  "Төрөл",
  "Төлөв",
  "Бүртгэсэн огноо",
  "Айлчлал",
];

export function SalesStoresTable({
  stores,
  offset,
}: {
  stores: AdminSalesStore[];
  offset: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailsId = useId();
  const selected = stores.find((store) => store.id === selectedId);
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-xs text-slate-500">
        Дэлгүүрийн нэр дээр дарж дэлгэрэнгүйг нээнэ. Бусад баганыг харахын тулд
        хүснэгтийг хажуу тийш гүйлгэнэ.
      </p>
      <div
        role="region"
        aria-label="Дэлгүүрүүдийн хүснэгт, хажуу тийш гүйлгэх боломжтой"
        tabIndex={0}
        className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600"
      >
        <table className="w-full min-w-[1550px] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">
            MGL Store-ууд — дэлгүүр бүрийн бүртгэл, холбоо барих мэдээлэл
          </caption>
          <thead>
            <tr>
              {columns.map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={`sticky top-0 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-xs font-bold whitespace-nowrap text-slate-600 ${index === 1 ? "left-0 z-30" : "z-20"}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store, index) => {
              const vendor = store.vendorOrganization;
              const category = vendor?.businessCategory;
              const cells = [
                vendor?.taxId,
                store.representatives.map((rep) => rep.name).join(", ") ||
                  "Хуваарилаагүй",
                store.contactName,
                store.contactPhone || vendor?.phone,
                vendor?.email,
                store.address,
                category === "market-food-grocery"
                  ? "Хүнсний дэлгүүр"
                  : category === "other"
                    ? "Бусад"
                    : category,
              ];
              const expanded = selectedId === store.id;
              return (
                <tr
                  key={store.id}
                  className={`group ${expanded ? "bg-lime-50" : "odd:bg-white even:bg-slate-50/70"}`}
                >
                  <td className="border-b border-r border-slate-200 px-3 py-3 tabular-nums text-slate-400">
                    {offset + index + 1}
                  </td>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 min-w-52 max-w-72 border-b border-r border-slate-200 p-0 ${expanded ? "bg-lime-50" : "bg-white group-hover:bg-lime-50"}`}
                  >
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-controls={expanded ? detailsId : undefined}
                      onClick={() => {
                        setSelectedId(store.id);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left font-semibold text-slate-900 transition hover:text-lime-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime-600"
                    >
                      <span className="break-words">{store.name}</span>
                      <Maximize2
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-slate-400"
                      />
                    </button>
                  </th>
                  {cells.map((value, cellIndex) => (
                    <td
                      key={columns[cellIndex + 2]}
                      className="min-w-32 max-w-80 whitespace-pre-wrap break-words border-b border-r border-slate-200 px-3 py-3 text-slate-700 group-hover:bg-lime-50/50"
                    >
                      {value || "—"}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${store.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {store.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-3 text-slate-600">
                    {new Date(store.createdAt).toLocaleDateString("mn-MN")}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3 text-right tabular-nums text-slate-700">
                    {store.visitCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && (
        <SalesStoreDetailsDialog
          key={selected.id}
          id={detailsId}
          store={selected}
          onDismiss={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
