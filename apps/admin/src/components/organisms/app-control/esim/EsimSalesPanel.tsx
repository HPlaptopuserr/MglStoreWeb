"use client";
import {
  Globe2,
  Save,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { useEsimSales } from "./useEsimSales";
import { EsimPriceTable } from "./EsimPriceTable";
export function EsimSalesPanel() {
  const data = useEsimSales();
  const count = Object.values(data.prices).filter((v) => v.trim()).length;
  return (
    <section
      className="border-b border-slate-100 p-4 sm:p-6"
      aria-labelledby="esim-sales-title"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-blue-600 p-3 text-white">
            <Globe2 size={24} />
          </span>
          <div>
            <h2
              id="esim-sales-title"
              className="text-lg font-bold text-slate-900"
            >
              MGL eSIM
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Маркетинг, багцын үнэ ба борлуулалтын удирдлага
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.settings.mode === "coming-soon" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {data.settings.mode === "coming-soon" ? "Тун удахгүй" : "Үнэ нийтлэх"}
        </span>
      </div>
      {data.error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{data.error}</p>
          <button
            type="button"
            onClick={() => void data.load()}
            disabled={data.saving}
            className="inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCw size={14} />
            Дахин ачаалах
          </button>
        </div>
      )}
      {data.loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
        >
          <Loader2 size={20} className="animate-spin" />
          Тохиргоо ачаалж байна…
        </div>
      ) : (
        data.loaded && (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  {
                    value: "coming-soon",
                    title: "Тун удахгүй",
                    detail:
                      "Багцууд харагдана. Үнэ болон худалдан авалт хаалттай. Маркетинг хийхэд бэлэн.",
                  },
                  {
                    value: "live",
                    title: "Үнэ нийтлэх",
                    detail:
                      "Үнэ оруулсан багцууд апп дээр нийтлэгдэнэ. Төлбөр бэлэн болсон үед л худалдан авалт нээгдэнэ.",
                  },
                ] as const
              ).map((mode) => (
                <label
                  key={mode.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors hover:border-blue-300 ${data.settings.mode === mode.value ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-slate-200"}`}
                >
                  <input
                    type="radio"
                    name="esim-mode"
                    value={mode.value}
                    checked={data.settings.mode === mode.value}
                    disabled={data.saving}
                    onChange={() => data.editSettings({ mode: mode.value })}
                    className="mt-1 accent-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">
                      {mode.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {mode.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
              <span className="text-[10px] font-bold tracking-[.16em] text-blue-200">
                АПП ДЭЭР ХАРАГДАХ ТАЙЛБАР
              </span>
              <p className="mt-3 text-lg font-bold">
                {data.settings.announcement || "Аяллын eSIM"}
              </p>
              <p className="mt-2 text-xs text-blue-100">
                {data.settings.mode === "coming-soon"
                  ? "Үнэ зарлагдах хүртэл төлбөр авахгүй."
                  : `${count} багцын үнэ бэлтгэгдсэн.`}
              </p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Хэрэглэгчид харуулах тайлбар
              <input
                value={data.settings.announcement}
                maxLength={240}
                disabled={data.saving}
                onChange={(e) =>
                  data.editSettings({ announcement: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <EsimPriceTable
              prices={data.prices}
              disabled={data.saving}
              onChange={data.editPrice}
            />
            <label className="block text-sm font-semibold text-slate-700">
              Худалдан авах болон буцаалтын нөхцөл
              <textarea
                rows={4}
                maxLength={5000}
                value={data.settings.terms}
                disabled={data.saving}
                placeholder="Борлуулалт нээхийн өмнө баталсан нөхцөлөө оруулна уу."
                onChange={(e) => data.editSettings({ terms: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
                <ArrowUpRight size={16} />
                {count} багцад үнэ оруулсан · Хадгалсны дараа серверээс шинэ үнэ
                авна. Аппыг дахин deploy хийхгүй.
              </p>
              <button
                type="button"
                disabled={data.saving}
                onClick={() => void data.save()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                {data.saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Хадгалах
              </button>
            </div>
            {data.saved && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm font-medium text-emerald-700"
              >
                <CheckCircle2 size={18} />
                Тохиргоо хадгалагдлаа.
              </p>
            )}
          </div>
        )
      )}
    </section>
  );
}
