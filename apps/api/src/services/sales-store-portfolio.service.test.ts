import assert from "node:assert/strict";
import test from "node:test";
import {
  isMongoliaStoreCoordinate,
  mergeSalesStoreLocationSources,
  type AdminBranchSource,
  type SalesLocationSource,
} from "./sales-store-portfolio.service";

const vendor = (id: string) => ({
  id,
  name: `Vendor ${id}`,
  taxId: null,
  email: null,
  phone: "99112233",
  address: null,
  businessCategory: "market-food-grocery",
});

const salesLocation = (id: string, vendorId: string): SalesLocationSource => ({
  id,
  name: `Sales ${vendorId}`,
  address: "Sales address",
  latitude: 47.91,
  longitude: 106.91,
  radiusMeters: 150,
  contactName: "Owner",
  contactPhone: "99001122",
  assignments: [{ memberId: "member-1" }],
  vendorOrganization: vendor(vendorId),
});

const branch = (
  id: string,
  vendorId: string,
  lat: number | null,
  lng: number | null,
): AdminBranchSource => ({
  id,
  organizationId: vendorId,
  name: `Branch ${id}`,
  address: "Branch address",
  lat,
  lng,
  organization: vendor(vendorId),
});

test("admin branches replace the organization-level sales location", () => {
  const stores = mergeSalesStoreLocationSources(
    [salesLocation("sales-a", "vendor-a")],
    [
      branch("a-1", "vendor-a", 47.9, 106.9),
      branch("a-2", "vendor-a", 47.92, 106.92),
    ],
    "member-1",
  );

  assert.equal(stores.length, 2);
  assert.deepEqual(stores.map(({ id }) => id).sort(), [
    "branch:a-1",
    "branch:a-2",
  ]);
  assert.ok(stores.every((store) => store.locationSource === "ADMIN_BRANCH"));
  assert.ok(stores.every((store) => store.assignedToMe));
});

test("sales location remains as fallback when admin branch has no pin", () => {
  const stores = mergeSalesStoreLocationSources(
    [salesLocation("sales-b", "vendor-b")],
    [branch("b-1", "vendor-b", null, null)],
    "member-2",
  );

  assert.equal(stores.length, 1);
  assert.equal(stores[0]?.id, "sales-b");
  assert.equal(stores[0]?.locationSource, "SALES_VISIT");
  assert.equal(stores[0]?.assignedToMe, false);
});

test("vendor registered by another representative remains visible in the manager portfolio", () => {
  const representativeVendor = {
    ...salesLocation("sales-created", "vendor-created-by-rep"),
    assignments: [{ memberId: "representative-member" }],
  };

  const stores = mergeSalesStoreLocationSources(
    [representativeVendor],
    [],
    "owner-member",
  );

  assert.equal(stores.length, 1);
  assert.equal(stores[0]?.id, "sales-created");
  assert.equal(stores[0]?.vendorOrganization.id, "vendor-created-by-rep");
  assert.equal(stores[0]?.locationSource, "SALES_VISIT");
  assert.deepEqual(stores[0]?.assignedMemberIds, ["representative-member"]);
  assert.equal(stores[0]?.assignedToMe, false);
});

test("branch and fallback stores from different vendors are both returned", () => {
  const stores = mergeSalesStoreLocationSources(
    [
      salesLocation("sales-a", "vendor-a"),
      salesLocation("sales-b", "vendor-b"),
    ],
    [branch("a-1", "vendor-a", 47.9, 106.9)],
    "member-1",
  );

  assert.deepEqual(
    new Set(stores.map(({ vendorOrganization }) => vendorOrganization.id)),
    new Set(["vendor-a", "vendor-b"]),
  );
});

test("coordinates outside Mongolia cannot zoom the store map to the world", () => {
  const foreignLocation = {
    ...salesLocation("sales-foreign", "vendor-foreign"),
    latitude: 37.7749,
    longitude: -122.4194,
  };
  const stores = mergeSalesStoreLocationSources(
    [foreignLocation],
    [branch("foreign", "vendor-foreign", 37.7749, -122.4194)],
    "member-1",
  );

  assert.equal(stores.length, 0);
  assert.equal(isMongoliaStoreCoordinate(47.9184, 106.9177), true);
  assert.equal(isMongoliaStoreCoordinate(37.7749, -122.4194), false);
});
