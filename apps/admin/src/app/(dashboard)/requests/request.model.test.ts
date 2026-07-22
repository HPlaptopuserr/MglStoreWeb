import assert from "node:assert/strict";
import test from "node:test";
import {
  getJobPositionLabel,
  getRequestTotalText,
  getStatusLabel,
} from "./request.model";

test("request totals reflect the active section", () => {
  const base = {
    tab: "partners" as const,
    partnerCount: 4,
    jobCount: 2,
    stockCount: 3,
    serviceCount: 5,
    cardTerminals: [],
  };
  assert.equal(
    getRequestTotalText({ ...base, section: "stock" }),
    "Нийт бараа таталтын хүсэлт: 3",
  );
  assert.equal(
    getRequestTotalText({ ...base, section: "service" }),
    "Нийт үйлчилгээний хүсэлт: 5",
  );
  assert.equal(
    getRequestTotalText({ ...base, section: "partner-career" }),
    "Нийт Түнш хүсэлт: 4",
  );
});

test("card-terminal totals include pending count", () => {
  const cardTerminals = [
    { status: "PENDING" },
    { status: "APPROVED" },
    { status: "PENDING" },
  ] as Parameters<typeof getRequestTotalText>[0]["cardTerminals"];
  const text = getRequestTotalText({
    section: "card-terminal",
    tab: "partners",
    partnerCount: 0,
    jobCount: 0,
    stockCount: 0,
    serviceCount: 0,
    cardTerminals,
  });
  assert.equal(text, "Card Terminal хүсэлт: 3 · 2 хүлээгдэж буй");
});

test("status and job labels have stable fallbacks", () => {
  assert.equal(getStatusLabel("APPROVED"), "Зөвшөөрсөн");
  assert.equal(getStatusLabel("CUSTOM"), "CUSTOM");
  assert.equal(
    getJobPositionLabel({ slug: "unknown-position", name: "Шинэ ажил" }),
    "Шинэ ажил",
  );
});
