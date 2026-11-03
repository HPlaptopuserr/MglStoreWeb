import assert from "node:assert/strict";
import test from "node:test";
import { partitionKitchenQueue } from "../src/domain/kitchen-queue";

const now = Date.parse("2026-10-28T03:59:00Z");
const ticket = (id: string, sentAt: string, status = "NEW") => ({
  id,
  sentAt,
  status,
});

test("yesterday's unfinished orders are separated using Ulaanbaatar midnight", () => {
  const rows = [
    ticket("yesterday", "2026-10-27T15:59:59Z"),
    ticket("midnight", "2026-10-27T16:00:00Z"),
    ticket("today", "2026-10-28T03:30:00Z", "PREPARING"),
    ticket("done", "2026-10-28T03:00:00Z", "READY"),
  ];
  const result = partitionKitchenQueue(rows, now);
  assert.deepEqual(
    result.today.map((row) => row.id),
    ["midnight", "today"],
  );
  assert.deepEqual(
    result.previous.map((row) => row.id),
    ["yesterday"],
  );
  assert.equal(rows[0]?.status, "NEW");
});

test("a new business day moves pending orders into the previous section", () => {
  const rows = [ticket("order", "2026-10-28T15:59:00Z")];
  assert.equal(
    partitionKitchenQueue(rows, Date.parse("2026-10-28T15:59:59Z")).today
      .length,
    1,
  );
  assert.equal(
    partitionKitchenQueue(rows, Date.parse("2026-10-28T16:00:00Z")).previous
      .length,
    1,
  );
});

test("no cap, deletion or automatic completion is applied to either section", () => {
  const rows = Array.from({ length: 150 }, (_, index) =>
    ticket(String(index), "2026-10-27T03:00:00Z"),
  );
  assert.equal(partitionKitchenQueue(rows, now).previous.length, 150);
  assert.equal(rows.length, 150);
  assert.ok(rows.every((row) => row.status === "NEW"));
});
