import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMUNITY_LOCATIONS,
  UNSPECIFIED_LOCATION,
  matchesCommunityLocation,
  normalizeCommunityLocation,
} from "./locations";
import { matchesMember } from "./model";
import { DEMO_STATE } from "./demo-data";

test("location choices cover the capital, 21 provinces and abroad", () => {
  assert.equal(COMMUNITY_LOCATIONS.length, 23);
  assert.equal(new Set(COMMUNITY_LOCATIONS).size, 23);
});

test("legacy city names match their province and capital filters", () => {
  for (const [actual, selected] of [
    [" УБ ", "Улаанбаатар"],
    ["Ulaanbaatar", "Улаанбаатар"],
    ["Дархан хот", "Дархан-Уул"],
    ["дархан уул аймаг", "Дархан-Уул"],
    ["Эрдэнэт", "Орхон"],
    ["Хөвсгөл аймаг", "Хөвсгөл"],
  ]) {
    assert.equal(matchesCommunityLocation(actual, selected), true);
  }
  assert.equal(matchesCommunityLocation("Дархан", "Орхон"), false);
});

test("legacy locations and missing locations remain independently selectable", () => {
  assert.equal(normalizeCommunityLocation(" Seoul "), "Seoul");
  assert.equal(matchesCommunityLocation("Seoul", "Seoul"), true);
  assert.equal(matchesCommunityLocation("Seoul", "Гадаадад"), false);
  assert.equal(matchesCommunityLocation(" ", UNSPECIFIED_LOCATION), true);
  assert.equal(matchesCommunityLocation("УБ", UNSPECIFIED_LOCATION), false);
  assert.equal(matchesCommunityLocation("", ""), true);
});

test("province filtering composes with search and activity sector", () => {
  const member = { ...DEMO_STATE.members[0], city: "Дархан" };
  assert.equal(matchesMember(member, "ВЭБСАЙТ", "Дархан-Уул", "Технологи"), true);
  assert.equal(matchesMember(member, "ВЭБСАЙТ", "Орхон", "Технологи"), false);
  assert.equal(matchesMember(member, "ВЭБСАЙТ", "Дархан-Уул", "Худалдаа"), false);
});
