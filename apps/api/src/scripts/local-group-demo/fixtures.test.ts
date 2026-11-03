import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalDemoDatabase, demoDay, instant } from "./fixtures";

test("demo seeding refuses production and non-local databases", () => {
  const local = "postgresql://dev@127.0.0.1:5432/mglstore";
  assert.doesNotThrow(() => assertLocalDemoDatabase(local, "development"));
  for (const raw of [
    undefined,
    "postgresql://dev@db.example.com:5432/mglstore",
    "postgresql://dev@127.0.0.1:5432/other",
    "postgresql://dev@127.0.0.1:55483/mglstore",
  ]) {
    assert.throws(() => assertLocalDemoDatabase(raw, "development"));
  }
  assert.throws(() => assertLocalDemoDatabase(local, "production"));
});
test("attendance demo dates follow Ulaanbaatar calendar boundaries", () => {
  const now = new Date("2026-11-01T20:00:00Z");
  assert.equal(demoDay(0, now), "2026-11-02");
  assert.equal(demoDay(-13, now), "2026-10-20");
  assert.equal(
    instant("2026-11-02", 9).toISOString(),
    "2026-11-02T01:00:00.000Z",
  );
});
