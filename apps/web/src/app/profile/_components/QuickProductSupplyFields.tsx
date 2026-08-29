"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  PackageSearch,
  RefreshCw,
  Users,
} from "lucide-react";
import { API } from "@/lib/api";
import {
  PREORDER_CURRENCIES,
  type PreorderCurrency,
  type QuickProductSupplyValues,
} from "./quick-product.types";
import { QuickProductSupplyTypeSelector } from "./QuickProductSupplyTypeSelector";

interface Rate {
  currency: PreorderCurrency;
  sellRate: number;
}

interface RatesResponse {
  rates: Rate[];
  fetchedAt: string;
  markupPercent: number;
}

const CURRENCY_LABELS: Record<PreorderCurrency, string> = {
  MNT: "MNT · Монгол төгрөг",
  USD: "USD · Америк доллар",
  CNY: "CNY · Хятад юань",
  KRW: "KRW · Солонгос вон",
  JPY: "JPY · Япон иен",
};

export function QuickProductSupplyFields({
  authFetch,
  onChange,
  values,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onChange: <K extends keyof QuickProductSupplyValues>(
    field: K,
    value: QuickProductSupplyValues[K],
  ) => void;
  values: QuickProductSupplyValues;
}) {
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState("");
  const isPreorder = values.supplyType === "CHINA_PREORDER";

  const loadRates = async () => {
    setRateLoading(true);
    setRateError("");
    try {
      const response = await authFetch(`${API}/vendor/preorder-exchange-rates`);
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("rates" in payload) ||
        !Array.isArray(payload.rates)
      ) {
        throw new Error("RATE_LOAD_FAILED");
      }
      setRates(payload as RatesResponse);
    } catch (error) {
      console.error("[quick product exchange rates]", error);
      setRateError("ХААН Банкны ханш татаж чадсангүй");
    } finally {
      setRateLoading(false);
    }
  };

  useEffect(() => {
    if (isPreorder && values.preorderPriceCurrency !== "MNT" && !rates) {
      void loadRates();
    }
  }, [isPreorder, rates, values.preorderPriceCurrency]);

  const conversion = useMemo(() => {
    const amount = Number(values.preorderPriceAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (values.preorderPriceCurrency === "MNT") {
      return { rate: 1, markup: 0, total: Math.round(amount) };
    }
    const rate = rates?.rates.find(
      (item) => item.currency === values.preorderPriceCurrency,
    )?.sellRate;
    if (!rate) return null;
    const markup = rates.markupPercent;
    return {
      rate,
      markup,
      total: Math.round(amount * rate * (1 + markup / 100)),
    };
  }, [rates, values.preorderPriceAmount, values.preorderPriceCurrency]);

  return (
    <section className="mt-4 space-y-3" aria-labelledby="product-supply-title">
      <div>
        <p
          id="product-supply-title"
          className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"
        >
          Барааны төрөл
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Бэлэн нөөцтэй эсвэл урьдчилан захиалж ирэх төрлийг сонгоно уу.
        </p>
      </div>

      <QuickProductSupplyTypeSelector
        value={values.supplyType}
        onChange={(value) => onChange("supplyType", value)}
      />

      {isPreorder && (
        <div className="space-y-4 rounded-[22px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <PackageSearch size={20} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-950">
                Захиалгын нөхцөл
              </h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Оруулсан валютын дүнг ХААН Банкны зарах ханш дээр 10% нэмэн
                төгрөгөөр худалдан авагчид харуулна.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
            <label>
              <span className="mb-1.5 block text-xs font-black text-slate-700">
                Валют
              </span>
              <select
                value={values.preorderPriceCurrency}
                onChange={(event) =>
                  onChange(
                    "preorderPriceCurrency",
                    event.target.value as PreorderCurrency,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {PREORDER_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {CURRENCY_LABELS[currency]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black text-slate-700">
                Захиалгын нэгж үнэ <span className="text-rose-500">*</span>
              </span>
              <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                <span className="flex items-center border-r border-slate-200 px-3 text-xs font-black text-slate-500">
                  {values.preorderPriceCurrency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={values.preorderPriceAmount}
                  onChange={(event) =>
                    onChange("preorderPriceAmount", event.target.value)
                  }
                  placeholder="Жишээ: 500"
                  className="min-w-0 flex-1 px-4 text-sm font-bold text-slate-950 outline-none"
                />
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
            {rateLoading ? (
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Loader2 size={16} className="animate-spin" /> Ханш татаж
                байна...
              </p>
            ) : rateError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-rose-700">{rateError}</p>
                <button
                  type="button"
                  onClick={() => void loadRates()}
                  className="rounded-lg p-2 text-rose-700 hover:bg-rose-100"
                  aria-label="Ханш дахин татах"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            ) : conversion ? (
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                    Худалдан авагчид харагдах үнэ
                  </p>
                  <p className="mt-1 text-xl font-black text-emerald-950">
                    {conversion.total.toLocaleString("mn-MN")}₮
                  </p>
                </div>
                <p className="text-xs font-bold text-emerald-700">
                  1 {values.preorderPriceCurrency} ={" "}
                  {conversion.rate.toLocaleString("mn-MN")}₮
                  {conversion.markup > 0 ? ` · +${conversion.markup}%` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-emerald-800">
                Дүн оруулмагц төгрөгөөр бодогдсон үнэ энд харагдана.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
                <Users size={14} /> Захиалга дүүрэх хүний тоо
                <span className="text-rose-500">*</span>
              </span>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={values.preorderCapacity}
                onChange={(event) =>
                  onChange("preorderCapacity", event.target.value)
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                Жишээ: 50 гэвэл 50 хэрэглэгч захиалахад дүүрнэ.
              </span>
            </label>
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
                <CalendarClock size={14} /> Ирэх хугацаа (хоног)
              </span>
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={values.preorderLeadTimeDays}
                onChange={(event) =>
                  onChange("preorderLeadTimeDays", event.target.value)
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                Захиалга баталгаажсанаас хойших дундаж хугацаа.
              </span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-700">
              Захиалгын нэмэлт нөхцөл
            </span>
            <textarea
              value={values.preorderNote}
              onChange={(event) => onChange("preorderNote", event.target.value)}
              placeholder="Жишээ: Өнгө, хэмжээ болон хүргэлтийн нөхцөлийг захиалга хийхээс өмнө баталгаажуулна."
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
      )}
    </section>
  );
}
