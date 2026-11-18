import assert from "node:assert/strict";
import { test } from "node:test";
import { innovaWebsite } from "../src/data/innova-company";
import { parseClubWebsite } from "../src/domain/mgl-club-website";

test("website saves preserve either explicit hero image layout", () => {
  for (const heroImageMode of ["split", "background"] as const) {
    const site = structuredClone(innovaWebsite);
    site.sections[0].heroImageMode = heroImageMode;
    const parsed = parseClubWebsite(site);
    assert.equal(parsed?.sections[0].heroImageMode, heroImageMode);
    assert.equal(parsed?.sections[0].imageUrl, site.sections[0].imageUrl);
    assert.equal(parsed?.sections[0].title, site.sections[0].title);
  }
});
test("older website data remains valid while unsupported image modes are rejected", () => {
  const site = structuredClone(innovaWebsite);
  delete site.sections[0].heroImageMode;
  assert.ok(parseClubWebsite(site));
  const invalid = {
    ...site,
    sections: site.sections.map((section, index) =>
      index === 0 ? { ...section, heroImageMode: "unsupported" } : section,
    ),
  };
  assert.equal(parseClubWebsite(invalid), null);
});
