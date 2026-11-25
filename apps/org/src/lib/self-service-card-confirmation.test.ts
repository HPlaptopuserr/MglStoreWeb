import assert from "node:assert/strict";
import test from "node:test";
import { getSelfServiceCardConfirmation } from "./self-service-card-confirmation";
import { getRestaurantCardAttemptStatus } from "./restaurant-pos-api";

test("only authoritative approval or decline offers finalization or a new payment", () => {
  const approved = getSelfServiceCardConfirmation("APPROVED");
  assert.equal(approved.unresolved, false);
  assert.equal(approved.title, "Төлбөр баталгаажсан");
  assert.match(approved.action, /Баримтыг дуусгах/);
  const declined = getSelfServiceCardConfirmation("DECLINED");
  assert.equal(declined.unresolved, false);
  assert.equal(declined.action, "Амжилтгүй · Дахин төлөх");
});

test("pending, failed, missing and raw Successful never appear as paid or bank-declined", () => {
  for (const status of ["PENDING", "FAILED", undefined, "Successful", "000"]) {
    const result = getSelfServiceCardConfirmation(status);
    assert.equal(result.unresolved, true);
    assert.equal(result.title, "Төлбөрийн баталгаажуулалт амжилтгүй");
    assert.equal(result.action, "Дахин шалгах");
    assert.match(result.message, /Мөнгө суутгагдсан эсэх тодорхойгүй/);
  }
});

test("recheck reads the original attempt with cancellation and never posts a charge", async (t) => {
  const controller = new AbortController();
  const requests: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init?: RequestInit) => {
      requests.push(String(url));
      assert.match(
        String(url),
        /\/pos\/payments\/card\/status\/original%2Fattempt$/,
      );
      assert.equal(init?.method, undefined);
      assert.equal(init?.body, undefined);
      assert.equal(init?.signal, controller.signal);
      assert.equal(init?.cache, "no-store");
      return Response.json({
        attemptId: "original/attempt",
        status: "PENDING",
        message: "Successful",
      });
    },
  );
  const attempt = await getRestaurantCardAttemptStatus(
    "original/attempt",
    controller.signal,
  );
  assert.equal(requests.length, 1);
  assert.equal(getSelfServiceCardConfirmation(attempt.status).unresolved, true);
});

test("verified decline exposes the durable bank refusal reason", () => {
  const reason = "Картын терминалын мөчлөгийн гүйлгээний тооны хязгаарт хүрсэн. Банктай холбогдоно уу.";
  const result = getSelfServiceCardConfirmation("DECLINED", reason);
  assert.equal(result.message, reason);
  assert.equal(result.unresolved, false);
  assert.equal(result.action, "Амжилтгүй · Дахин төлөх");
  assert.equal(getSelfServiceCardConfirmation("DECLINED", null).message, "");
});

test("provider messages cannot replace unknown-payment protection or approved display", () => {
  for (const status of ["PENDING", "FAILED"]) {
    const result = getSelfServiceCardConfirmation(status, "Successful");
    assert.match(result.message, /Мөнгө суутгагдсан эсэх тодорхойгүй/);
    assert.equal(result.unresolved, true);
  }
  assert.equal(getSelfServiceCardConfirmation("APPROVED", "old refusal").message, "");
});
