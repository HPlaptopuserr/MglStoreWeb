import test from "node:test";
import assert from "node:assert/strict";
import type { StocktakeDetail } from "@mgl/types";
import {
  completeStocktake,
  matchesReviewFilter,
  stocktakeCompletionIssue,
} from "./stocktake-review";

const session: StocktakeDetail = {
  id: "s",
  title: "Count",
  kind: "FULL",
  status: "DRAFT",
  warehouseId: null,
  warehouse: null,
  version: 4,
  createdAt: "",
  approvedAt: null,
  createdById: "u",
  approvedById: null,
  lines: [
    {
      id: "l",
      productId: "p",
      name: "Item",
      barcode: null,
      barcodeAliases: [],
      unit: "pcs",
      expected: 10,
      counted: 8,
      note: "Checked",
      countedAt: null,
      countedById: null,
    },
  ],
};
test("changed rows and quantity differences are independent review groups", () => {
  const line = session.lines[0]!;
  assert.equal(matchesReviewFilter(line, "difference", new Set()), true);
  assert.equal(matchesReviewFilter(line, "changed", new Set()), false);
  const equal = { ...line, counted: 10 };
  assert.equal(matchesReviewFilter(equal, "changed", new Set(["l"])), true);
  assert.equal(matchesReviewFilter(equal, "difference", new Set(["l"])), false);
  assert.equal(
    matchesReviewFilter({ ...line, counted: null }, "uncounted", new Set()),
    true,
  );
});
test("finish validates uncounted rows, reasons and partial counts", () => {
  assert.equal(stocktakeCompletionIssue(session), null);
  assert.ok(
    stocktakeCompletionIssue({
      ...session,
      lines: [{ ...session.lines[0]!, note: " " }],
    }),
  );
  const lines = [
    ...session.lines,
    { ...session.lines[0]!, id: "missing", counted: null },
  ];
  assert.ok(stocktakeCompletionIssue({ ...session, lines }));
  assert.equal(
    stocktakeCompletionIssue({ ...session, kind: "PARTIAL", lines }),
    null,
  );
  assert.ok(stocktakeCompletionIssue({ ...session, lines: [] }));
});
test("finish submits once and approves the returned version", async () => {
  const calls: string[] = [];
  const updated: StocktakeDetail[] = [];
  const result = await completeStocktake(
    session,
    async (current, action) => {
      calls.push(`${action}:${current.version}`);
      return {
        ...current,
        version: current.version + 1,
        status: action === "submit" ? "REVIEW" : "APPROVED",
      };
    },
    (current) => updated.push(current),
  );
  assert.deepEqual(calls, ["submit:4", "approve:5"]);
  assert.deepEqual(
    updated.map((current) => current.status),
    ["REVIEW", "APPROVED"],
  );
  assert.equal(result.status, "APPROVED");
});
test("approval conflict leaves the submitted version available for correction", async () => {
  const updated: StocktakeDetail[] = [];
  await assert.rejects(
    completeStocktake(
      session,
      async (current, action) => {
        if (action === "approve") throw new Error("stock changed");
        return { ...current, version: current.version + 1, status: "REVIEW" };
      },
      (current) => updated.push(current),
    ),
    /stock changed/,
  );
  assert.equal(updated[0]?.status, "REVIEW");
  assert.equal(updated[0]?.version, 5);
});
test("review retries do not resubmit, terminal sessions cannot be modified", async () => {
  const calls: string[] = [];
  const mutate = async (
    current: StocktakeDetail,
    action: "submit" | "approve",
  ): Promise<StocktakeDetail> => {
    calls.push(action);
    return { ...current, status: "APPROVED" };
  };
  await completeStocktake({ ...session, status: "REVIEW" }, mutate, () => {});
  await completeStocktake({ ...session, status: "APPROVED" }, mutate, () => {});
  await assert.rejects(
    completeStocktake({ ...session, status: "CANCELLED" }, mutate, () => {}),
  );
  assert.deepEqual(calls, ["approve"]);
});
