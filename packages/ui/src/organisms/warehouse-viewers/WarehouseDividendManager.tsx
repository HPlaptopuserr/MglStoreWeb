"use client";

import { Banknote, Loader2 } from "lucide-react";
import { currentWarehouseMonth } from "@mgl/types";
import { MonthlyDividendEditor } from "./MonthlyDividendEditor";
import {
  useWarehouseViewers,
  type WarehouseViewerTransport,
} from "./useWarehouseViewers";

interface WarehouseDividendManagerProps extends WarehouseViewerTransport {
  warehouseId: string;
  onSaved: () => void;
}

export function WarehouseDividendManager({
  warehouseId,
  onSaved,
  ...transport
}: WarehouseDividendManagerProps) {
  const state = useWarehouseViewers(warehouseId, transport);
  const save = async (
    userId: string,
    amount: string,
    version: number,
    month: string,
  ) => {
    const result = await state.saveDividend(userId, amount, version, month);
    if (result) onSaved();
    return result;
  };
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
          <Banknote className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-emerald-950">
            {currentWarehouseMonth()} сарын ногдол ашиг
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Хэрэглэгч бүрийн дүнг доорх талбарт оруулаад хадгална уу.
          </p>
        </div>
      </div>
      {state.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
          <button
            type="button"
            onClick={() => void state.reload()}
            className="ml-3 font-semibold underline"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {state.message}
        </p>
      )}
      {state.loading ? (
        <p
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
        >
          <Loader2 className="size-5 animate-spin" />
          Хөрөнгө оруулагчдыг ачаалж байна…
        </p>
      ) : state.members.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {state.members.map((member) => (
            <li
              key={member.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="font-semibold text-slate-900">{member.fullName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {member.phoneNumber || member.email}
              </p>
              <MonthlyDividendEditor
                key={`${member.monthlyDividend?.month}:${member.monthlyDividend?.version}`}
                member={member}
                busy={state.busy}
                onSave={save}
                defaultOpen
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Ногдол ашиг бүртгэх хөрөнгө оруулагч алга.
          </p>
          <a
            href="/viewers"
            className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline"
          >
            Хэрэглэгч нэмэх →
          </a>
        </div>
      )}
    </section>
  );
}
