import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StocktakeDetail, StocktakeKind } from "@mgl/types";
import { StocktakeSummary } from "./StocktakeSummary";

function renderSummary(kind: StocktakeKind) {
  const session: StocktakeDetail = {
    id: "stocktake-1",
    title: "Test stocktake",
    kind,
    status: "DRAFT",
    warehouseId: "warehouse-1",
    warehouse: { name: "Main warehouse" },
    version: 1,
    createdAt: "2026-10-08T00:00:00.000Z",
    approvedAt: null,
    createdById: "user-1",
    approvedById: null,
    lines: [],
  };

  return renderToStaticMarkup(
    <StocktakeSummary
      session={session}
      total={10}
      counted={2}
      differences={0}
      dirty={0}
      busy={false}
      canApprove
      onAction={() => undefined}
    />,
  );
}

test("a draft partial stocktake offers conversion to full", () => {
  assert.match(renderSummary("PARTIAL"), /Бүтэн тооллого болгох/);
});

test("a full stocktake does not offer conversion again", () => {
  assert.doesNotMatch(renderSummary("FULL"), /Бүтэн тооллого болгох/);
});
