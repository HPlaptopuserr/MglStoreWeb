export const PREORDER_CURRENCIES = ["MNT", "USD", "CNY", "KRW", "JPY"] as const;

export type PreorderCurrency = (typeof PREORDER_CURRENCIES)[number];

export interface KhanBankExchangeRate {
  currency: PreorderCurrency;
  sellRate: number;
  name: string;
}

export interface PreorderPriceConversion {
  sourceAmount: number;
  sourceCurrency: PreorderCurrency;
  exchangeRate: number;
  markupPercent: number;
  priceMnt: number;
  source: "KHAN_BANK_SELL_RATE";
  fetchedAt: Date;
}

interface KhanBankRateResponse {
  currency?: unknown;
  sellRate?: unknown;
  name?: unknown;
}

interface RateCache {
  expiresAt: number;
  fetchedAt: Date;
  rates: KhanBankExchangeRate[];
}

const KHAN_BANK_RATES_URL = "https://api.khanbank.com/v1/rates";
const CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;
export const PREORDER_MARKUP_PERCENT = 10;
let cache: RateCache | null = null;

export class InvalidPreorderPriceError extends Error {
  constructor() {
    super("INVALID_PREORDER_PRICE");
    this.name = "InvalidPreorderPriceError";
  }
}

export function normalizePreorderCurrency(
  value: unknown,
): PreorderCurrency | null {
  const currency = String(value || "MNT")
    .trim()
    .toUpperCase();
  return PREORDER_CURRENCIES.includes(currency as PreorderCurrency)
    ? (currency as PreorderCurrency)
    : null;
}

export function calculatePreorderPriceMnt(
  sourceAmount: number,
  exchangeRate: number,
  markupPercent: number,
) {
  if (
    !Number.isFinite(sourceAmount) ||
    sourceAmount < 0 ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    !Number.isFinite(markupPercent) ||
    markupPercent < 0
  ) {
    throw new Error("INVALID_PREORDER_CONVERSION_INPUT");
  }
  return Math.round(sourceAmount * exchangeRate * (1 + markupPercent / 100));
}

export async function getKhanBankPreorderRates(): Promise<{
  rates: KhanBankExchangeRate[];
  fetchedAt: Date;
}> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { rates: cache.rates, fetchedAt: cache.fetchedAt };
  }

  const response = await fetch(KHAN_BANK_RATES_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`KHAN_BANK_RATES_HTTP_${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("KHAN_BANK_RATES_INVALID_RESPONSE");
  }
  const supported = new Set<string>(PREORDER_CURRENCIES);
  const rates = (payload as KhanBankRateResponse[])
    .map((item): KhanBankExchangeRate | null => {
      const currency = normalizePreorderCurrency(item.currency);
      const sellRate = Number(item.sellRate);
      if (
        !currency ||
        !supported.has(currency) ||
        !Number.isFinite(sellRate) ||
        sellRate <= 0
      ) {
        return null;
      }
      return { currency, sellRate, name: String(item.name || currency) };
    })
    .filter((item): item is KhanBankExchangeRate => item !== null);

  if (!rates.some((rate) => rate.currency === "MNT")) {
    rates.unshift({ currency: "MNT", sellRate: 1, name: "МОНГОЛ ТӨГРӨГ" });
  }
  if (rates.length !== PREORDER_CURRENCIES.length) {
    throw new Error("KHAN_BANK_RATES_INCOMPLETE");
  }

  const fetchedAt = new Date();
  cache = { rates, fetchedAt, expiresAt: now + CACHE_TTL_MS };
  return { rates, fetchedAt };
}

export async function convertPreorderPriceToMnt(
  sourceAmount: number,
  sourceCurrency: PreorderCurrency,
): Promise<PreorderPriceConversion> {
  if (!Number.isFinite(sourceAmount) || sourceAmount < 0) {
    throw new Error("INVALID_PREORDER_SOURCE_AMOUNT");
  }

  if (sourceCurrency === "MNT") {
    return {
      sourceAmount,
      sourceCurrency,
      exchangeRate: 1,
      markupPercent: 0,
      priceMnt: calculatePreorderPriceMnt(sourceAmount, 1, 0),
      source: "KHAN_BANK_SELL_RATE",
      fetchedAt: new Date(),
    };
  }

  const { rates, fetchedAt } = await getKhanBankPreorderRates();
  const rate = rates.find((item) => item.currency === sourceCurrency);
  if (!rate) throw new Error("PREORDER_EXCHANGE_RATE_NOT_FOUND");

  const exchangeRate = rate.sellRate;
  const markupPercent = PREORDER_MARKUP_PERCENT;
  const priceMnt = calculatePreorderPriceMnt(
    sourceAmount,
    exchangeRate,
    markupPercent,
  );

  return {
    sourceAmount,
    sourceCurrency,
    exchangeRate,
    markupPercent,
    priceMnt,
    source: "KHAN_BANK_SELL_RATE",
    fetchedAt,
  };
}

export async function resolvePreorderPrice(
  sourceAmount: unknown,
  sourceCurrency: unknown,
): Promise<PreorderPriceConversion> {
  const currency = normalizePreorderCurrency(sourceCurrency);
  const amount = Number(sourceAmount);

  if (!currency || !Number.isFinite(amount) || amount < 0) {
    throw new InvalidPreorderPriceError();
  }

  return convertPreorderPriceToMnt(amount, currency);
}

export function toPreorderPriceMetadata(conversion: PreorderPriceConversion) {
  return {
    preorderPriceCurrency: conversion.sourceCurrency,
    preorderPriceAmount: conversion.sourceAmount,
    preorderExchangeRate: conversion.exchangeRate,
    preorderMarkupPercent: conversion.markupPercent,
    preorderRateSource: conversion.source,
    preorderRateFetchedAt: conversion.fetchedAt,
  };
}
