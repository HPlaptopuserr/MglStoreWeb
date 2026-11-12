import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRestaurantCardCancellation,
  isRestaurantCardUnresolved,
  restaurantCardInstructions,
} from "./restaurant-card-state";

test("chip instruction survives the API's wrapped pending message", () => {
  const instructions = restaurantCardInstructions({ status: "PENDING", message:
    "Терминалын хариу: Чипээр уншуулна уу. Өмнөх картын төлбөрийн эцсийн төлөв баталгаажаагүй байна." });
  assert.equal(instructions.title, "Картаа чипээр уншуулна уу");
  assert.match(instructions.message, /чиптэй үзүүрийг/);
  assert.match(instructions.message, /уншигчийн үүрэнд/);
});

test("cancel instruction remains visible when subsequent polls return the chip prompt", () => {
  const instructions = restaurantCardInstructions({ status: "PENDING", message: "Чипээр уншуулна уу" }, true);
  assert.equal(instructions.title, "Төхөөрөмж дээр цуцална уу");
  assert.match(instructions.message, /автоматаар буцна/);
  assert.doesNotMatch(instructions.message, /чипээр/);
  assert.doesNotMatch(restaurantCardInstructions({ status: "PENDING", message: "Successful" }).message, /Successful/);
});

test("unresolved Minu failures retain recovery without changing other providers", () => {
  assert.equal(isRestaurantCardUnresolved({ status: "FAILED" }, "MINU_AGENT"), true);
  assert.equal(isRestaurantCardUnresolved({ status: "PENDING" }, "MINU_AGENT"), true);
  assert.equal(isRestaurantCardUnresolved({ status: "DECLINED" }, "MINU_AGENT"), false);
  assert.equal(isRestaurantCardUnresolved({ status: "APPROVED" }, "MINU_AGENT"), false);
  assert.equal(isRestaurantCardUnresolved({ status: "FAILED" }, "ANDROID_PGW"), false);
});

test("POS cancellation checks the same invoice until a definitive outcome, without a new charge", async (t) => {
  const outcomes = ["PENDING", "PENDING", "DECLINED"];
  const requests: Array<{ url: string; method: string }> = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method || "GET" });
    return Response.json({ attemptId: "original-attempt", status: outcomes.shift(), message: "Чипээр уншуулна уу" });
  });
  const steps = [];
  for (let index = 0; index < 3; index++)
    steps.push((await checkRestaurantCardCancellation("original-attempt", "MINU_AGENT")).next);
  assert.deepEqual(steps, ["WAIT", "WAIT", "RETURN"]);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.ok(request.url.endsWith("/pos/payments/card/status/original-attempt"));
    assert.equal(request.method, "GET");
  }
});

test("late approval while cancelling completes the original payment instead of retrying", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ attemptId: "original-attempt", status: "APPROVED" }));
  const result = await checkRestaurantCardCancellation("original-attempt", "MINU_AGENT");
  assert.equal(result.next, "COMPLETE");
  assert.equal(result.attempt.attemptId, "original-attempt");
});

test("failed or malformed Minu status is not treated as a confirmed cancellation", async (t) => {
  for (const status of ["FAILED", "UNKNOWN", null]) {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ attemptId: "original", status }));
    assert.equal((await checkRestaurantCardCancellation("original", "MINU_AGENT")).next, "WAIT");
    mock.mock.restore();
  }
});

test("network errors cannot confirm cancellation", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("network unavailable"); });
  await assert.rejects(checkRestaurantCardCancellation("original", "MINU_AGENT"), /network unavailable/);
});
