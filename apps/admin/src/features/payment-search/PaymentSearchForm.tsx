"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import type { PaymentSearchMode } from "@mgl/types";

interface Props {
  loading: boolean;
  onSearch: (params: URLSearchParams) => Promise<void>;
}
const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export function PaymentSearchForm({ loading, onSearch }: Props) {
  const [mode, setMode] = useState<PaymentSearchMode>("reference");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries())
      if (typeof value === "string" && value.trim())
        params.set(key, value.trim());
    params.set("mode", mode);
    void onSearch(params);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Хайлтын төрөл</span>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as PaymentSearchMode)}
          className={fieldClass}
        >
          <option value="reference">Захиалга / төлбөрийн лавлахаар хайх</option>
          <option value="settlement">Хаалтын дүн тулгах</option>
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>
          {mode === "reference"
            ? "Захиалгын дугаар эсвэл төлбөрийн лавлах"
            : "Банкны гүйлгээний утга"}
        </span>
        <textarea
          name="reference"
          rows={2}
          maxLength={1000}
          required={mode === "reference"}
          minLength={mode === "reference" ? 3 : undefined}
          placeholder={
            mode === "reference"
              ? "ORD-… эсвэл Minu нэхэмжлэхийн дугаар"
              : "ATMV51WQJ30 2026.08.31 QR ХААЛТ / Mongol JDB…"
          }
          className={`${fieldClass} resize-y`}
        />
      </label>
      {mode === "settlement" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">QR хаалтын огноо</span>
              <input type="date" name="date" className={fieldClass} />
              <span className="block text-xs font-normal text-slate-500">
                Хоосон бол гүйлгээний утгаас авна.
              </span>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Дансанд орсон дүн (₮)</span>
              <input
                type="number"
                name="netAmount"
                step="0.01"
                min="0.01"
                max="999999999999.99"
                required
                placeholder="774601.72"
                className={fieldClass}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Minu шимтгэл (%)</span>
              <input
                type="number"
                name="feePercent"
                defaultValue="1"
                step="0.01"
                min="0"
                max="99.99"
                required
                className={fieldClass}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Нэмэлт суутгал (₮)</span>
              <input
                type="number"
                name="transferFee"
                defaultValue="0"
                step="0.01"
                min="0"
                max="999999999999.99"
                required
                className={fieldClass}
              />
            </label>
          </div>
          <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            QR хаалт нь олон төлбөрийн нийлбэр байж болно. Энэ хайлт тухайн өдөр
            төлөгдсөн онлайн захиалга бүрийг тусад нь тулгана. Хаалтын кодоор
            эзнийг баталгаажуулахгүй. Зөвхөн мэдэгдэж буй нэмэлт суутгалыг
            оруулна уу.
          </p>
        </>
      )}
      <button
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        {loading ? (
          <Loader2
            size={17}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Search size={17} />
        )}
        {loading ? "Хайж байна…" : "Төлбөр хайх"}
      </button>
    </form>
  );
}
