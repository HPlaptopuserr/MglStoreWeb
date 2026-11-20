import assert from "node:assert/strict";
import test from "node:test";
import { ebarimtLoyaltyPaymentBlocker } from "./ebarimt-loyalty-policy";

test("unsupported fiscal point redemption blocks new payments, without blocking ordinary or nonfiscal payments", () => {
  assert.match(
    ebarimtLoyaltyPaymentBlocker({ enabled: true, redeemedPoints: 100 }) || "",
    /Төлбөр эхлээгүй/,
  );
  assert.equal(
    ebarimtLoyaltyPaymentBlocker({ enabled: true, redeemedPoints: 0 }),
    null,
  );
  assert.equal(
    ebarimtLoyaltyPaymentBlocker({ enabled: false, redeemedPoints: 100 }),
    null,
  );
});
