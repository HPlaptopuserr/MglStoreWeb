import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DeferredCardCheckouts } from "./DeferredCardCheckouts";

test("unknown payments cannot be restored and late paid orders cannot interrupt a busy checkout", () => {
  for (const status of ["PENDING", "FAILED", "APPROVED", "DECLINED"]) {
    for (const disabled of [false, true]) {
      const html = renderToStaticMarkup(<DeferredCardCheckouts disabled={disabled} onRestore={() => {}}
        checkouts={[{ attemptId: "old-invoice", amount: 19000, status, terminalId: "terminal",
          createdAt: "2026-11-10T00:00:00+08:00", transactionId: null, kind: "RETAIL", clientSaleId: "original-sale", snapshot: "{}" }]} />);
      const button = html.match(/<button[^>]*>/)?.[0];
      assert.ok(button);
      assert.equal(/\sdisabled(?:=|\s|>)/.test(button), disabled || ["PENDING", "FAILED"].includes(status));
      assert.ok(!html.includes("Түгжээ тайлах"));
    }
  }
});
