import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getClubSearchVariants,
  matchesClubSearch,
} from "../src/domain/mgl-club-search";

test("Latin and Cyrillic product spellings match in both directions", () => {
  for (const query of ["block", "blok", "БЛОК", "  block  "])
    assert.ok(
      matchesClubSearch("Эко хөнгөн бетон блок үйлдвэрлэл", query),
      query,
    );
  assert.ok(matchesClubSearch("Block factory", "блок"));
  assert.ok(matchesClubSearch("Иннова ХХК", "innova"));
  assert.ok(matchesClubSearch("INNOVA LLC", "иннова"));
  assert.ok(matchesClubSearch("Вэб сайт хийх", "veb"));
});
test("spoken Latin initials find the original company acronym", () => {
  assert.ok(getClubSearchVariants("эм жи эл").includes("mgl"));
  assert.ok(matchesClubSearch("Mgl bmbch digital llc", "эм жи эл"));
  assert.ok(!matchesClubSearch("Иннова ХХК", "эм жи эл"));
});
test("phrase expansion preserves word order and stays bounded", () => {
  assert.ok(matchesClubSearch("Блок үйлдвэр", "blok uildver"));
  assert.ok(!matchesClubSearch("Блок худалдаа", "blok uildver"));
  assert.ok(!matchesClubSearch("Аялал жуулчлал", "block"));
  assert.ok(getClubSearchVariants("u o ".repeat(40)).length <= 20);
  assert.ok(matchesClubSearch("Байгууллага", "  "));
});
