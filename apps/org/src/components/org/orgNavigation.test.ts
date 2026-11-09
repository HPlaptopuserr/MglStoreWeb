import assert from "node:assert/strict";
import test from "node:test";
import {
  isCashierDashboardPath,
  isCashierOnlyMember,
  isKitchenDashboardPath,
} from "@mgl/types";
import { getOrgNavItems } from "./orgNavigation";
import { getDashboardModules } from "../dashboard/dashboardConfig";
import type { OrgFeatureState } from "@/lib/org-types";

const features: OrgFeatureState = {
  supplyProducts: false,
  preorderProducts: false,
  servicePosts: false,
  selfService: false,
  selfServiceMode: "RESTAURANT",
};
const cashier = {
  id: "cashier",
  role: "USER",
  orgRole: "STAFF",
  capabilities: ["POS_CASHIER"],
};
test("cashiers see exactly the three work areas across restaurant and cafe modes", () => {
  for (const config of [
    features,
    { ...features, selfService: true, selfServiceMode: "CAFE" as const },
  ]) {
    const links = getOrgNavItems(config, cashier);
    assert.deepEqual(
      links.map((link) => link.href),
      ["/dashboard/restaurant-pos", "/dashboard/supply", "/dashboard/preorder"],
    );
    assert.equal(
      links.every((link) => link.enabled !== false),
      true,
    );
  }
});
test("cashier direct links to management and nested routes remain blocked", () => {
  for (const path of [
    "/dashboard",
    "/dashboard/members",
    "/dashboard/products",
    "/dashboard/settings",
    "/dashboard/kitchen-display",
    "/dashboard/supply/edit",
    "/dashboard/restaurant-pos-other",
  ])
    assert.equal(isCashierDashboardPath(path), false, path);
  for (const link of getOrgNavItems(features, cashier))
    assert.equal(isCashierDashboardPath(link.href), true);
});
test("managers retain access and chef restrictions take precedence", () => {
  for (const orgRole of ["OWNER", "ADMIN"]) {
    const manager = { ...cashier, orgRole };
    assert.equal(isCashierOnlyMember(manager), false);
    assert.ok(
      getOrgNavItems(features, manager).some(
        (link) => link.href === "/dashboard/members",
      ),
    );
  }
  assert.equal(isCashierOnlyMember({ ...cashier, role: "SUPER_ADMIN" }), false);
  assert.deepEqual(
    getOrgNavItems(features, {
      ...cashier,
      capabilities: ["KITCHEN_CHEF", "POS_CASHIER"],
    }).map((link) => link.href),
    ["/dashboard/kitchen-display", "/dashboard/supply", "/dashboard/preorder"],
  );
});

test("kitchen workers see kitchen and receiving in both restaurant and cafe modes", () => {
  const chef = { ...cashier, capabilities: ["KITCHEN_CHEF"] };
  for (const config of [
    features,
    { ...features, selfService: true, selfServiceMode: "CAFE" as const },
  ]) {
    const links = getOrgNavItems(config, chef);
    assert.deepEqual(
      links.map((link) => link.href),
      [
        "/dashboard/kitchen-display",
        "/dashboard/supply",
        "/dashboard/preorder",
      ],
    );
    for (const link of links) {
      assert.equal(link.enabled !== false, true);
      assert.equal(isKitchenDashboardPath(link.href), true);
    }
  }
  for (const path of [
    "/dashboard",
    "/dashboard/restaurant-pos",
    "/dashboard/members",
    "/dashboard/products",
    "/dashboard/settings",
    "/dashboard/supply/edit",
  ])
    assert.equal(isKitchenDashboardPath(path), false, path);
});

test("staffed restaurant service can be enabled without removing cafe and kiosk tools", () => {
  const cafe = {
    ...features,
    selfService: true,
    selfServiceMode: "CAFE" as const,
  };
  const owner = { ...cashier, orgRole: "OWNER" };
  const modules = getOrgNavItems({ ...cafe, restaurantPos: true }, owner);
  assert.equal(
    modules.find((item) => item.href === "/dashboard/restaurant-pos")?.label,
    "Ресторан касс",
  );
  for (const href of [
    "/dashboard/self-service",
    "/dashboard/daily-stock",
    "/dashboard/regular-customers",
  ])
    assert.ok(
      modules.some((item) => item.href === href),
      href,
    );
  assert.equal(
    getDashboardModules({ ...cafe, restaurantPos: true }, owner).find(
      (item) => item.href === "/dashboard/restaurant-pos",
    )?.title,
    "Ресторан касс",
  );
  assert.equal(
    getOrgNavItems(cafe, owner).some(
      (item) => item.href === "/dashboard/restaurant-pos",
    ),
    false,
  );
});
