"use client";
import { useMemo, useState } from "react";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { useEsimCountryOffers } from "./useEsimSales";
const countries = [
  ["CN", "🇨🇳 БНХАУ"],
  ["KR", "🇰🇷 Солонгос"],
  ["JP", "🇯🇵 Япон"],
  ["VN", "🇻🇳 Вьетнам"],
  ["TH", "🇹🇭 Тайланд"],
  ["US", "🇺🇸 АНУ"],
  ["DE", "🇩🇪 Герман"],
  ["FR", "🇫🇷 Франц"],
  ["TR", "🇹🇷 Турк"],
] as const;
interface Props {
  prices: Record<string, string>;
  disabled: boolean;
  onChange: (id: string, value: string) => void;
}
export function EsimPriceTable({ prices, disabled, onChange }: Props) {
  const [country, setCountry] = useState("CN");
  const [query, setQuery] = useState("");
  const data = useEsimCountryOffers(country);
  const offers = useMemo(
    () =>
      data.offers.filter((o) =>
        `${o.title} ${o.days}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.offers, query],
  );
  return (
    <section className="space-y-4" aria-label="Багцын үнэ">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Багц бүрийн үнэ</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Хоосон үлдээсэн багц “Үнэ нийтлэх” үед худалдааны жагсаалтад
            орохгүй. Улсаа солиход оруулсан үнэ хадгалагдана.
          </p>
        </div>
        <label className="shrink-0 text-xs font-semibold text-slate-600">
          Улс
          <select
            value={country}
            disabled={disabled}
            onChange={(e) => {
              setCountry(e.target.value);
              setQuery("");
            }}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {countries.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Search size={16} className="text-slate-400" />
        <input
          aria-label="Багц хайх"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Багц, дата, хоногоор хайх…"
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
      </label>
      {data.error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {data.error}
          <button
            type="button"
            onClick={data.retry}
            className="ml-3 inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCw size={14} />
            Дахин оролдох
          </button>
        </div>
      ) : data.loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
        >
          <Loader2 size={18} className="animate-spin" />
          Бодит багцуудыг ачаалж байна…
        </div>
      ) : (
        <div className="max-h-[480px] overflow-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Багц / хугацаа
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Дата
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Борлуулах үнэ ₮
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className="transition-colors hover:bg-blue-50/40"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-slate-800"
                  >
                    <span className="block max-w-[240px]">{o.title}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-400">
                      {o.days} хоног
                    </span>
                  </th>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {o.dataMb >= 1024
                      ? `${Number((o.dataMb / 1024).toFixed(2))} GB`
                      : `${o.dataMb} MB`}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={disabled}
                      aria-label={`${o.title} үнэ төгрөгөөр`}
                      value={prices[o.id] ?? ""}
                      onChange={(e) => onChange(o.id, e.target.value)}
                      placeholder="Үнэ оруулах"
                      className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right tabular-nums focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {offers.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              Хайлтад тохирох багц алга.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
