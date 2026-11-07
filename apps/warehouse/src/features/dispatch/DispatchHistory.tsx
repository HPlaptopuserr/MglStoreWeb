"use client";
import { useState } from "react";
import { FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { dispatchPaymentLabel } from "./dispatch-payment";
import { useDispatchHistory } from "./useDispatchHistory";
import { dispatchDate, dispatchMoney } from "./dispatch-format";

export function DispatchHistory({
  warehouseId,
  refreshKey,
  onSelect,
}: {
  warehouseId: string;
  refreshKey: number;
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const state = useDispatchHistory(warehouseId, page, search, refreshKey);
  return (
    <section
      aria-labelledby="dispatch-history-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="dispatch-history-title"
            className="flex items-center gap-2 text-lg font-bold text-slate-950"
          >
            <FileText className="size-5 text-blue-600" />
            Паданы түүх
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Энэ агуулахаас гаргасан барааны паданууд. Паданаа нээж дэлгэрэнгүйг
            харах, хэвлэх боломжтой.
          </p>
        </div>
        <button
          type="button"
          disabled={state.loading}
          onClick={() => void state.reload()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${state.loading ? "animate-spin" : ""}`}
          />
          Шинэчлэх
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft.trim());
          setPage(1);
        }}
        className="mt-5 flex gap-2"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">
            Паданы дугаар, дэлгүүр, нэр, утсаар хайх
          </span>
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Паданы дугаар, дэлгүүр, нэр, утсаар хайх…"
            maxLength={120}
            className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          Хайх
        </button>
      </form>
      {state.error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
          <button
            type="button"
            onClick={() => void state.reload()}
            className="ml-3 font-semibold underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : state.loading ? (
        <p
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
        >
          <Loader2 className="size-5 animate-spin" />
          Падануудыг ачаалж байна…
        </p>
      ) : !state.data?.items.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <FileText className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {search
              ? "Хайлтад тохирох падан олдсонгүй."
              : "Одоогоор падан үүсээгүй байна."}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-slate-100">
            {state.data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="group flex min-h-24 w-full flex-wrap items-center justify-between gap-4 rounded-xl p-3 text-left transition hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-bold text-blue-700">
                      {item.dispatchNumber}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {item.storeName ||
                        item.recipientName ||
                        "Хүлээн авагчийн мэдээлэлгүй"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.recipientName || "—"} · {item.recipientPhone || "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {dispatchDate(item.createdAt)} · {item.items.length} төрөл
                      · {item.totalQuantity.toLocaleString()} ш
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {dispatchMoney(item.totalAmount)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {dispatchPaymentLabel(
                        item.paymentStatus,
                        item.paymentMethod,
                      )}
                    </p>
                    <span className="mt-2 inline-block text-xs font-semibold text-blue-600 group-hover:underline">
                      Падан харах →
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              {state.data.total} падан · {state.data.page} /{" "}
              {state.data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="min-h-10 rounded-lg border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-40"
              >
                Өмнөх
              </button>
              <button
                type="button"
                disabled={page >= state.data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-10 rounded-lg border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-40"
              >
                Дараах
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
