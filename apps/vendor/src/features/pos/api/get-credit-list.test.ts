import assert from "node:assert/strict";
import test from "node:test";
import { getCreditList } from "./get-credit-list";

for (const collection of ["credits", "customers"] as const) {
  test(`${collection}: loads beyond 100 and preserves organization and branch filters`, async () => {
    const previous = globalThis.fetch;
    const records = Array.from({ length: 205 }, (_, index) => ({ id: String(index) }));
    const cursors: Array<string | null> = [];
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, collection === "credits" ? "/api/pos/credit-sales" : "/api/pos/credit-customers");
      assert.equal(url.searchParams.get("organizationId"), "org");
      assert.equal(url.searchParams.get("branchId"), "branch");
      assert.equal(url.searchParams.get("limit"), "100");
      const cursor = url.searchParams.get("cursor");
      cursors.push(cursor);
      const start = cursor === null ? 0 : Number(cursor) + 1;
      const items = records.slice(start, start + 100);
      return Response.json({
        [collection]: items,
        nextCursor: start + 100 < records.length ? items.at(-1)?.id : null,
      });
    };
    try {
      const result = await getCreditList<{ id: string }>(collection, new URLSearchParams({ organizationId: "org", branchId: "branch" }));
      assert.deepEqual(result, records);
      assert.deepEqual(cursors, [null, "99", "199"]);
    } finally {
      globalThis.fetch = previous;
    }
  });
}

test("a later page failure rejects instead of returning incomplete repayment totals", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? Response.json({ credits: [{ id: "latest" }], nextCursor: "latest" })
    : Response.json({ message: "Дахин оролдоно уу" }, { status: 500 });
  try {
    await assert.rejects(getCreditList("credits", new URLSearchParams()), /Дахин оролдоно уу/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previous;
  }
});

test("empty lists finish immediately and repeated cursors fail without looping", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ credits: [], nextCursor: null });
    assert.deepEqual(await getCreditList("credits", new URLSearchParams()), []);
    globalThis.fetch = async () => Response.json({ credits: [{ id: "same" }], nextCursor: "same" });
    await assert.rejects(getCreditList("credits", new URLSearchParams()), /бүрэн татаж чадсангүй/);
  } finally {
    globalThis.fetch = previous;
  }
});
