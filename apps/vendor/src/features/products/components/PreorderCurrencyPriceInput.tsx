"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { API, authFetch } from "@/lib/api";
import type { PreorderCurrency } from "../types";

interface Rate {
  currency: PreorderCurrency;
  sellRate: number;
  name: string;
}

interface RatesResponse {
  rates: Rate[];
  fetchedAt: string;
  markupPercent: number;
}

const RATE_LOAD_ERROR = "ХААН Банкны ханш татаж чадсангүй";

interface Props {
  amount: string;
  currency: PreorderCurrency;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: PreorderCurrency) => void;
}

const CURRENCY_LABELS: Record<PreorderCurrency, string> = {
  MNT: "MNT · Монгол төгрөг",
  USD: "USD · Америк доллар",
  CNY: "CNY · Хятад юань",
  KRW: "KRW · Солонгос вон",
  JPY: "JPY · Япон иен",
};

const CURRENCIES = Object.keys(CURRENCY_LABELS) as PreorderCurrency[];

export function PreorderCurrencyPriceInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
}: Props) {
  const [data, setData] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRates = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch(`${API}/vendor/preorder-exchange-rates`);
      const payload = (await response.json()) as Partial<RatesResponse> & {
        message?: string;
      };
      if (!response.ok || !Array.isArray(payload.rates)) {
        throw new Error(RATE_LOAD_ERROR);
      }
      setData(payload as RatesResponse);
    } catch (caught) {
      console.error("[preorder exchange rates]", caught);
      setError(RATE_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  const conversion = useMemo(() => {
    const sourceAmount = Number(amount);
    if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) return null;
    if (currency === "MNT") {
      return { rate: 1, markup: 0, total: Math.round(sourceAmount) };
    }
    const rate = data?.rates.find(
      (item) => item.currency === currency,
    )?.sellRate;
    if (!rate) return null;
    const markup = data?.markupPercent ?? 10;
    return {
      rate,
      markup,
      total: Math.round(sourceAmount * rate * (1 + markup / 100)),
    };
  }, [amount, currency, data]);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          Захиалгын үнэ <span className="text-red-500">*</span>
        </label>
        <div className="flex min-h-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
          <select
            value={currency}
            onChange={(event) =>
              onCurrencyChange(event.target.value as PreorderCurrency)
            }
            aria-label="Үнэ оруулах валют"
            className="w-[150px] shrink-0 border-r border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none sm:w-[190px]"
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {CURRENCY_LABELS[item]}
              </option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
              {currency}
            </span>
            <input
              required
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              aria-label={`Захиалгын үнэ ${currency}`}
              className="h-12 w-full bg-transparent py-2 pl-16 pr-4 text-sm font-bold text-slate-900 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        {loading && currency !== "MNT" ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Loader2 className="h-4 w-4 animate-spin" /> ХААН Банкны ханш татаж
            байна...
          </div>
        ) : error && currency !== "MNT" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => void loadRates()}
              className="rounded-lg p-2 text-red-700 hover:bg-red-100"
              aria-label="Ханш дахин татах"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        ) : conversion ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Худалдан авагчид харагдах үнэ
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-950">
                {conversion.total.toLocaleString("mn-MN")}₮
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-emerald-700">
                {currency === "MNT" ? "Шууд дүн" : "ХААН Банкны зарах ханш"} · 1{" "}
                {currency} = {conversion.rate.toLocaleString("mn-MN")}₮
                {conversion.markup ? ` · +${conversion.markup}%` : ""}
              </p>
              {data?.fetchedAt && currency !== "MNT" && (
                <p className="mt-1 text-[11px] font-medium text-emerald-600">
                  Шинэчилсэн: {new Date(data.fetchedAt).toLocaleString("mn-MN")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            Үнэ оруулсны дараа төгрөгийн дүн харагдана.
          </p>
        )}
      </div>
    </div>
  );
}
