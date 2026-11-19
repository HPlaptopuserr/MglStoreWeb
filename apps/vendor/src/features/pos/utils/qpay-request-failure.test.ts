import assert from "node:assert/strict";
import test from "node:test";
import { qpayRequestFailure } from "./qpay-request-failure";

test("a local storage failure preserves its explanation and does not imply a dispatched invoice", () => {
  const message = "Өмнөх төлбөрийн хадгалсан мэдээллийг уншиж чадсангүй.";
  assert.deepEqual(qpayRequestFailure(new Error(message), false), { definitive: true, message });
});

test("lost invoice responses preserve an unknown outcome after dispatch", () => {
  for (const status of [0, 408, 409, 429, 500, 502, 503]) {
    const result = qpayRequestFailure(Object.assign(new Error("fetch failed"), { status }), true);
    assert.equal(result.definitive, false);
    assert.match(result.message, /Ижил нэхэмжлэлийн/);
  }
});

test("only a server-proven rejection ends an invoice request after dispatch", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    const message = `rejected ${status}`;
    assert.deepEqual(qpayRequestFailure(Object.assign(new Error(message), { status }), true), {
      definitive: true, message,
    });
  }
  assert.equal(qpayRequestFailure({ status: 409, code: "PAYMENT_NOT_STARTED" }, true).definitive, true);
});
