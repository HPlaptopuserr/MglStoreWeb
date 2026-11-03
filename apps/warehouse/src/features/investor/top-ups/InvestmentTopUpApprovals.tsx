"use client";

import { useState } from "react";
import { formatWarehouseInvestment } from "@mgl/types";
import { useInvestmentTopUps } from "./useInvestmentTopUps";

export function InvestmentTopUpApprovals({
  warehouseId,
}: {
  warehouseId: string;
}) {
  const state = useInvestmentTopUps(warehouseId);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const pending = state.items.filter((item) => item.status === "PENDING");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Дансаар шилжүүлсэн цэнэглэлт</h2>
        <button
          type="button"
          disabled={state.loading || state.busy}
          onClick={() => void state.reload()}
          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
        >
          Шинэчлэх
        </button>
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Хүлээн авах дансанд орсон дүн, гүйлгээний утгыг тулгаж баталгаажуулна
        уу.
      </p>
      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      {state.loading ? (
        <p role="status" className="py-6 text-center text-sm text-slate-500">
          Цэнэглэлтийг ачаалж байна…
        </p>
      ) : state.error ? null : !pending.length ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Баталгаажуулах цэнэглэлт алга.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-semibold">
                {item.investorName} · {formatWarehouseInvestment(item.amount)}
              </p>
              <p className="mt-2 break-all text-xs text-slate-500">
                {item.accountHolder} · {item.accountNumber}
              </p>
              <p className="mt-2 select-all break-all font-mono text-xs text-blue-700">
                {item.reference}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(item.createdAt).toLocaleString("mn-MN", {
                  timeZone: "Asia/Ulaanbaatar",
                })}
              </p>
              {confirmId === item.id ? (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                  <p>
                    Дансанд {formatWarehouseInvestment(item.amount)} орсныг
                    шалгасан уу?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={state.busy}
                      onClick={async () => {
                        const result = await state.confirm(item.id);
                        if (result) setConfirmId(null);
                      }}
                      className="min-h-10 rounded-lg bg-emerald-600 px-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {state.busy ? "Баталгаажуулж байна…" : "Тийм, орсон"}
                    </button>
                    <button
                      type="button"
                      disabled={state.busy}
                      onClick={() => setConfirmId(null)}
                      className="min-h-10 rounded-lg px-3 hover:bg-amber-100"
                    >
                      Болих
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={state.busy}
                  onClick={() => setConfirmId(item.id)}
                  className="mt-3 min-h-10 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  Орлого баталгаажуулах
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
