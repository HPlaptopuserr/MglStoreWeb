"use client";
import { useState } from "react";
import { Eye, Loader2, UserPlus, X } from "lucide-react";
import {
  type WarehouseViewerTransport,
  useWarehouseViewers,
} from "./useWarehouseViewers";

export function WarehouseViewerManager({
  warehouseId,
  apiBase,
  request,
}: { warehouseId: string } & WarehouseViewerTransport) {
  const state = useWarehouseViewers(warehouseId, { apiBase, request });
  const [phone, setPhone] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Eye className="size-5" />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">
            Хөрөнгө оруулагчид · Viewer
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Өөрийн MGL Store хаягаар Warehouse-д нэвтэрч зөвхөн энэ дэлгүүрийн
            бараа, борлуулалт, өртөг, ашгийн тайланг харна.
          </p>
        </div>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (await state.add(phone)) setPhone("");
        }}
        className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-semibold text-slate-600">
          Бүртгэлтэй утасны дугаар
          <input
            type="tel"
            autoComplete="off"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Жишээ: 99112233"
            required
            maxLength={20}
            className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="submit"
          disabled={state.busy || state.loading || !phone.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {state.busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Харах эрх нэмэх
        </button>
      </form>
      {state.error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
          <button
            onClick={() => void state.reload()}
            className="ml-3 underline"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {state.message && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      {state.loading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Хэрэглэгчдийг ачаалж байна…
        </p>
      ) : !state.members.length ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Харах эрхтэй хөрөнгө оруулагч нэмээгүй байна.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {state.members.map((member) => (
            <li
              key={member.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {member.fullName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {member.phoneNumber}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {member.email}
                  </p>
                  <span className="mt-3 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                    VIEWER · Зөвхөн харах
                  </span>
                </div>
                <button
                  aria-label={`${member.fullName}-ийн харах эрхийг цуцлах`}
                  onClick={() => setRemovingId(member.userId)}
                  disabled={state.busy}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>
              {removingId === member.userId && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <p>Энэ дэлгүүрийн харах эрхийг цуцлах уу?</p>
                  <div className="mt-3 flex gap-3">
                    <button
                      disabled={state.busy}
                      onClick={async () => {
                        if (await state.remove(member.userId))
                          setRemovingId(null);
                      }}
                      className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      {state.busy ? "Цуцалж байна…" : "Эрх цуцлах"}
                    </button>
                    <button
                      disabled={state.busy}
                      onClick={() => setRemovingId(null)}
                      className="px-3 py-2"
                    >
                      Болих
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Энэ эрх нь бараа, захиалга, төлбөр болон дэлгүүрийн тохиргоог өөрчлөх
        боломж олгохгүй.
      </p>
    </section>
  );
}
