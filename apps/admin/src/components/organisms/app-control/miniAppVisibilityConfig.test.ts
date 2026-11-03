import { test } from "node:test";
import assert from "node:assert/strict";
import { isMiniAppVisible, STORE_APP_VISIBILITY, orderedMglApps } from "./miniAppVisibilityConfig";
test("visibility overrides legacy omission and shortcut defaults", () => {
  assert.equal(isMiniAppVisible({"app-mini-apps": "[]"}, "grocery"), false);
  assert.equal(isMiniAppVisible({"app-mini-apps": "[]", "app-mini-app-visible-grocery": "true"}, "grocery"), true);
  assert.equal(isMiniAppVisible({"app-mini-app-visible-wallet": "false"}, "wallet"), true);
  assert.equal(isMiniAppVisible({}, "wallet"), true);
});
test("legacy aliases and catalog settings keep matching existing client", () => {
  assert.equal(isMiniAppVisible({"app-mini-apps": '[{"id":"study"}]'}, "hr"), true);
  assert.equal(isMiniAppVisible({"app-mini-apps": "[]", "app-catalog-mini-apps": '["shared-store"]'}, "shared-store"), true);
});

test("only MGL Apps are manageable, not native shortcuts", () => {
  const ids = new Set<string>(STORE_APP_VISIBILITY.map(app => app.id));
  for (const id of ["wallet", "qr-scan", "qr", "payments", "catalog", "coupons", "points", "map", "chat", "video", "discover"]) assert.equal(ids.has(id), false);
});

test("order ignores core shortcuts and duplicates, appends newly available apps", () => {
  const apps = orderedMglApps({"app-mini-app-order": '["travel","qr","travel","hypermarket","unknown"]'});
  assert.deepEqual(apps.slice(0, 2).map(app => app.id), ["travel", "hypermarket"]);
  assert.equal(new Set(apps.map(app => app.id)).size, STORE_APP_VISIBILITY.length);
  assert.equal(apps.some(app => String(app.id) === "qr"), false);
});
