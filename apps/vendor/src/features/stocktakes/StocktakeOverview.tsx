"use client";
import { useState } from "react";
import type { StocktakeKind, StocktakeOverview as Overview } from "@mgl/types";
import { stocktakeStatusLabels } from "./stocktake-model";
export const buttonClass =
  "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass =
  "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";
export const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
export function StocktakeOverview({
  data,
  busy,
  onCreate,
  onOpen,
}: {
  data: Overview;
  busy: boolean;
  onCreate: (
    title: string,
    warehouseId: string | null,
    kind: StocktakeKind,
  ) => void;
  onOpen: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [kind, setKind] = useState<StocktakeKind>("PARTIAL");
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(title, warehouseId || null, kind);
        }}
        className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold">Шинэ тооллого</h2>
        <label className="block space-y-2 text-sm font-medium">
          Нэр
          <input
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Жишээ: 10-р сарын ундааны тооллого"
            className={fieldClass}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Тоолох сан
          <select
            className={fieldClass}
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">Агуулахад холбоогүй дэлгүүрийн бараа</option>
            {data.warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Төрөл
          <select
            className={fieldClass}
            value={kind}
            onChange={(event) => setKind(event.target.value as StocktakeKind)}
          >
            <option value="PARTIAL">Хэсэгчилсэн — тоолсон бараагаар</option>
            <option value="FULL">Бүтэн — сонгосон сангийн бүх бараа</option>
          </select>
        </label>
        <p className="text-sm leading-6 text-slate-500">
          {kind === "FULL"
            ? "Бүх бараанд бодит тоог оруулна. Байхгүй бараанд 0 гэж бүртгэнэ."
            : "Сонгож тоолсон барааг тулгана. Тоолоогүй барааны үлдэгдэл өөрчлөгдөхгүй."}
        </p>
        <button
          className={`${buttonClass} w-full`}
          disabled={busy || !title.trim()}
        >
          Тооллого эхлүүлэх
        </button>
      </form>
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-label="Тооллогын түүх"
      >
        <h2 className="mb-4 text-lg font-bold">
          Сүүлийн тооллогууд{" "}
          <span className="text-sm font-normal text-slate-500">
            (идэвхтэй + сүүлийн 100 дууссан)
          </span>
        </h2>
        {!data.sessions.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">
            Тооллого үүсээгүй байна. Эхний тооллогоо эхлүүлээрэй.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.sessions.map((session) => (
              <li key={session.id}>
                <button
                  disabled={busy}
                  onClick={() => onOpen(session.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-blue-500"
                >
                  <span>
                    <span className="block font-semibold">{session.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {session.warehouse?.name || "Агуулахад холбоогүй бараа"} ·{" "}
                      {new Date(session.createdAt).toLocaleDateString("mn-MN")}{" "}
                      · {session.kind === "FULL" ? "Бүтэн" : "Хэсэгчилсэн"}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${session.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {stocktakeStatusLabels[session.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
