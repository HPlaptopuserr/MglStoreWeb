import assert from "node:assert/strict";
import test from "node:test";
import { Capability } from "@mgl/database";
import {
  canRegisterSalesVendor,
  canRepresentativeAccessVendor,
  distanceMeters,
  exactPhoneCandidates,
  salesProductSearchFilter,
  salesStoreRegion,
  salesVendorDetails,
} from "./sales-representative.routes";

test("owners, managers, and representatives can register stores", () => {
  assert.equal(canRegisterSalesVendor("OWNER"), true);
  assert.equal(canRegisterSalesVendor("MANAGER"), true);
  assert.equal(
    canRegisterSalesVendor("STAFF", [Capability.SALES_REPRESENTATIVE]),
    true,
  );
  assert.equal(canRegisterSalesVendor("STAFF"), false);
});

test("store registration accepts a missing owner email", () => {
  const details = salesVendorDetails({
    name: "Test store",
    taxId: "1234567",
    ownerName: "Owner",
    ownerPhone: "99112233",
    address: "Ulaanbaatar",
    latitude: 47.9184,
    longitude: 106.9177,
    storeType: "GROCERY",
  });

  assert.ok(details);
  assert.equal(details.ownerEmail, null);
});

test("sales visit distance is zero for the same coordinate", () => {
  assert.equal(distanceMeters(47.9184, 106.9177, 47.9184, 106.9177), 0);
});

test("sales visit distance is symmetric and measured in meters", () => {
  const outbound = distanceMeters(47.9184, 106.9177, 47.9193, 106.9177);
  const inbound = distanceMeters(47.9193, 106.9177, 47.9184, 106.9177);
  assert.ok(outbound > 95 && outbound < 105);
  assert.ok(Math.abs(outbound - inbound) < 0.001);
});

test("unrestricted representatives can access unassigned vendors", () => {
  assert.equal(canRepresentativeAccessVendor(false, false), true);
  assert.equal(canRepresentativeAccessVendor(true, false), false);
  assert.equal(canRepresentativeAccessVendor(true, true), true);
});

test("vendor lookup supports common Mongolian phone formats exactly", () => {
  assert.deepEqual(exactPhoneCandidates("9911-2233"), [
    "9911-2233",
    "99112233",
    "+99112233",
    "97699112233",
    "+97699112233",
  ]);
});

test("store regions use explicit Mongolian address before coordinates", () => {
  assert.equal(
    salesStoreRegion(47.9184, 106.9177, "Дархан-Уул аймаг, Дархан сум"),
    "LOCAL",
  );
  assert.equal(
    salesStoreRegion(49.0, 105.0, "Улаанбаатар хот, Баянзүрх дүүрэг"),
    "ULAANBAATAR",
  );
});

test("store regions fall back to the Ulaanbaatar metro GPS boundary", () => {
  assert.equal(salesStoreRegion(47.9184, 106.9177, ""), "ULAANBAATAR");
  assert.equal(salesStoreRegion(49.4867, 105.9228, ""), "LOCAL");
});

test("sales product search covers product name, barcode, and SKU", () => {
  assert.deepEqual(salesProductSearchFilter(" 12345 ".trim()), {
    OR: [
      { name: { contains: "12345", mode: "insensitive" } },
      { barcode: { contains: "12345", mode: "insensitive" } },
      { sku: { contains: "12345", mode: "insensitive" } },
    ],
  });
  assert.deepEqual(salesProductSearchFilter(""), {});
});
