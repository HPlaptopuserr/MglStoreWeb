import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { prisma } from "@mgl/database";
import { getClubWebsiteAccess } from "./mgl-club-website-access";

const companyId = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-11-17T12:00:00.000Z");
const paidAt = new Date("2026-10-17T12:00:00.000Z");
const expiresAt = "2027-04-17T12:00:00.000Z";
const paidInvoice = {
  id: "paid-invoice",
  saleReference: `MGL_CLUB_GOLD:${companyId}`,
  status: "PAID",
  amount: 1_200_000,
  paidAt,
  webhookPayload: { kind: "MGL_CLUB_GOLD", accessExpiresAt: expiresAt },
};
const restores: Array<() => void> = [];
function invoices(rows: unknown[], checkQuery = false) {
  const previous: unknown = Reflect.get(prisma.qPayInvoice, "findMany");
  Reflect.set(
    prisma.qPayInvoice,
    "findMany",
    async (args: { where: unknown; orderBy: unknown }) => {
      if (checkQuery) {
        assert.deepEqual(args.where, {
          saleReference: `MGL_CLUB_GOLD:${companyId}`,
          status: "PAID",
          amount: 1_200_000,
          paidAt: { not: null },
        });
        assert.deepEqual(args.orderBy, { paidAt: "desc" });
      }
      return rows;
    },
  );
  restores.push(() => Reflect.set(prisma.qPayInvoice, "findMany", previous));
}
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

test("website access requires a verified, correctly scoped active paid Gold invoice", async () => {
  invoices([paidInvoice], true);
  const result = await getClubWebsiteAccess(companyId, prisma, now);
  assert.equal(result.eligible, true);
  assert.equal(result.status, "active");
  assert.equal(result.expiresAt, expiresAt);
  assert.equal(typeof result.message, "string");
});

test("a curated logo or client entitlement flag cannot substitute for a paid invoice", async () => {
  invoices([]);
  const result = await getClubWebsiteAccess(companyId, prisma, now);
  assert.equal(result.eligible, false);
  assert.equal(result.status, "unpaid");
  assert.equal(result.expiresAt, null);
});

test("wrong-company, wrong-purpose, unsettled, underpaid and future-dated invoices never grant access", async () => {
  for (const invalid of [
    { ...paidInvoice, saleReference: "MGL_CLUB_GOLD:another-company" },
    { ...paidInvoice, saleReference: `ESIM:${companyId}` },
    { ...paidInvoice, amount: 1 },
    { ...paidInvoice, status: "PENDING" },
    { ...paidInvoice, status: "CANCELLED" },
    { ...paidInvoice, paidAt: null },
    { ...paidInvoice, paidAt: new Date("invalid") },
    { ...paidInvoice, paidAt: new Date("2026-11-18T00:00:00Z") },
    {
      ...paidInvoice,
      webhookPayload: { kind: "ESIM", accessExpiresAt: expiresAt },
    },
    { ...paidInvoice, webhookPayload: null },
    { ...paidInvoice, webhookPayload: [] },
    {
      ...paidInvoice,
      webhookPayload: { kind: "MGL_CLUB_GOLD", accessExpiresAt: "not-a-date" },
    },
    {
      ...paidInvoice,
      webhookPayload: {
        kind: "MGL_CLUB_GOLD",
        accessExpiresAt: "2027-04-18T12:00:00.000Z",
      },
    },
  ]) {
    invoices([invalid]);
    assert.equal(
      (await getClubWebsiteAccess(companyId, prisma, now)).eligible,
      false,
      JSON.stringify(invalid),
    );
  }
});

test("an expired or boundary-expiring invoice remains distinguishable from an unpaid company", async () => {
  for (const expiration of ["2026-11-16T12:00:00.000Z", now.toISOString()]) {
    invoices([
      {
        ...paidInvoice,
        webhookPayload: { kind: "MGL_CLUB_GOLD", accessExpiresAt: expiration },
      },
    ]);
    const result = await getClubWebsiteAccess(companyId, prisma, now);
    assert.equal(result.eligible, false);
    assert.equal(result.status, "expired");
    assert.equal(result.expiresAt, expiration);
  }
});

test("an older still-active verified invoice is not hidden by an expired candidate", async () => {
  invoices([
    {
      ...paidInvoice,
      id: "expired",
      webhookPayload: {
        kind: "MGL_CLUB_GOLD",
        accessExpiresAt: "2026-11-01T00:00:00.000Z",
      },
    },
    paidInvoice,
  ]);
  const result = await getClubWebsiteAccess(companyId, prisma, now);
  assert.equal(result.eligible, true);
  assert.equal(result.expiresAt, expiresAt);
});
