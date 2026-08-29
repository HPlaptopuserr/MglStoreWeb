import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePreorderPriceMnt,
  InvalidPreorderPriceError,
  normalizePreorderCurrency,
  resolvePreorderPrice,
  toPreorderPriceMetadata,
} from "./khan-bank-exchange-rate.service";

test("foreign preorder price applies the 10 percent markup", () => {
  assert.equal(calculatePreorderPriceMnt(500, 1, 10), 550);
  assert.equal(calculatePreorderPriceMnt(500, 534.96, 10), 294_228);
});

test("MNT preorder price does not add a foreign exchange markup", () => {
  assert.equal(calculatePreorderPriceMnt(50_000, 1, 0), 50_000);
});

test("only supported preorder currencies are accepted", () => {
  assert.equal(normalizePreorderCurrency(" cny "), "CNY");
  assert.equal(normalizePreorderCurrency("EUR"), null);
});

test("invalid conversion values are rejected", () => {
  assert.throws(() => calculatePreorderPriceMnt(-1, 1, 10));
  assert.throws(() => calculatePreorderPriceMnt(100, 0, 10));
});

test("MNT preorder input resolves without a remote exchange-rate request", async () => {
  const conversion = await resolvePreorderPrice("50000", "mnt");

  assert.equal(conversion.priceMnt, 50_000);
  assert.deepEqual(toPreorderPriceMetadata(conversion), {
    preorderPriceCurrency: "MNT",
    preorderPriceAmount: 50_000,
    preorderExchangeRate: 1,
    preorderMarkupPercent: 0,
    preorderRateSource: "KHAN_BANK_SELL_RATE",
    preorderRateFetchedAt: conversion.fetchedAt,
  });
});

test("preorder input validation uses a domain-specific error", async () => {
  await assert.rejects(
    () => resolvePreorderPrice("not-a-number", "USD"),
    InvalidPreorderPriceError,
  );
  await assert.rejects(
    () => resolvePreorderPrice(100, "EUR"),
    InvalidPreorderPriceError,
  );
});
