import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminMenuIndex, searchAdminMenu } from "./admin-menu-search";

test("search only indexes visible menus and separately authorized nested sections", () => {
  const sections = [
    { key: "banner", label: "Промо баннер" },
    { key: "forms", label: "Маягт", requires: "MANAGE_FORMS" },
    {
      key: "vendor-features",
      label: "Vendor & POS",
      requiresAny: ["MANAGE_SITE_SETTINGS", "MANAGE_POS"],
    },
  ];
  assert.deepEqual(
    buildAdminMenuIndex([], sections, () => true),
    [],
  );
  const entries = buildAdminMenuIndex(
    [
      { href: "/sections", label: "Нэмэлт хэсгүүд" },
      { href: "/requests", label: "Хүсэлтүүд" },
    ],
    sections,
    (permission) => permission === "MANAGE_POS",
  );
  assert.ok(
    entries.some((entry) => entry.href === "/sections/vendor-features"),
  );
  assert.ok(!entries.some((entry) => entry.href === "/sections/forms"));
  assert.ok(
    !entries.some((entry) => entry.href === "/requests/stock-requests"),
  );
  assert.ok(!entries.some((entry) => entry.href.startsWith("/statistics")));
});
test("Mongolian aliases, English keywords and multi-word paths find nested store menus", () => {
  const entries = buildAdminMenuIndex(
    [{ label: "Статистик", href: "/statistics" }],
    [],
    () => true,
  );
  assert.equal(
    searchAdminMenu(entries, "  ДЭЛГҮҮР  ")[0]?.href,
    "/statistics/stores?days=all",
  );
  assert.equal(
    searchAdminMenu(entries, "excel дэлгүүр")[0]?.label,
    "MGL Store-ууд",
  );
  assert.equal(searchAdminMenu(entries, "холбоогүй").length, 0);
  assert.equal(searchAdminMenu(entries, " ").length, entries.length);
  assert.equal(searchAdminMenu(entries, "статистик")[0]?.href, "/statistics");
});
