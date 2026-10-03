import assert from "node:assert/strict";
import test from "node:test";
import {
  salesStoresQuery,
  salesStoreSummaryFilters,
} from "./admin-sales-stores.service";

const now = new Date("2026-09-30T08:00:00Z");
test("store statistics exclude deleted organizations and unlinked visit locations", () => {
  const { where } = salesStoresQuery({ days: "all" }, now);
  assert.deepEqual(where.vendorOrganization, { is: { deletedAt: null } });
  assert.deepEqual(where.organization, { deletedAt: null });
  assert.equal(where.createdAt, undefined);
  assert.equal(where.isActive, undefined);
});
test("registration date window and inactive filter remain independent", () => {
  const { where } = salesStoresQuery({ days: "7", status: "inactive" }, now);
  assert.deepEqual(where.createdAt, { gte: new Date("2026-09-23T08:00:00Z") });
  assert.equal(where.isActive, false);
  assert.equal(salesStoresQuery({ status: "active" }).where.isActive, true);
});
test("malformed pagination and dates cannot create unbounded queries", () => {
  for (const page of ["-2", "0", "1.5", "Infinity", "oops", {}]) {
    const result = salesStoresQuery({ page, days: "-100" }, now);
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 12);
    assert.deepEqual(result.where.createdAt, {
      gte: new Date("2026-08-31T08:00:00Z"),
    });
  }
  assert.equal(salesStoresQuery({ page: "2" }).page, 2);
});
test("search supports assigned representatives without treating them as creators", () => {
  const { where } = salesStoresQuery({ q: "  Бат  " });
  assert.deepEqual(where.OR, [
    { name: { contains: "Бат", mode: "insensitive" } },
    { address: { contains: "Бат", mode: "insensitive" } },
    { contactPhone: { contains: "Бат" } },
    {
      assignments: {
        some: {
          member: {
            user: {
              profile: {
                is: { fullName: { contains: "Бат", mode: "insensitive" } },
              },
            },
          },
        },
      },
    },
  ]);
  assert.equal(
    salesStoresQuery({ q: { contains: "injected" } }).where.OR,
    undefined,
  );
});

test("overview total and active counts are all-time while new registrations use the selected period", async () => {
  const filters = salesStoreSummaryFilters({
    days: "7",
    q: "ignored",
    status: "inactive",
  });
  assert.equal(filters.all.createdAt, undefined);
  assert.equal(filters.all.isActive, undefined);
  assert.equal(filters.active.createdAt, undefined);
  assert.equal(filters.active.isActive, true);
  assert.ok(filters.registered.createdAt);
  assert.equal(filters.registered.OR, undefined);
  assert.equal(filters.registered.isActive, undefined);
  assert.equal(
    salesStoreSummaryFilters({ days: "all" }).registered.createdAt,
    undefined,
  );
});
