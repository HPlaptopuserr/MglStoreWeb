import assert from "node:assert/strict";
import { test } from "node:test";
import { innovaCompany, parseClubWebsite } from "@mgl/types";
import {
  companyWebsiteTemplates,
  makeCompanyWebsiteTemplate,
} from "./company-website-templates";
test("all easy templates create valid four or five section sites with current company information", () => {
  const original = JSON.stringify(innovaCompany);
  for (const template of companyWebsiteTemplates) {
    const site = makeCompanyWebsiteTemplate(template.id, innovaCompany);
    assert.ok(parseClubWebsite(site), template.id);
    assert.ok(site.sections.length >= 4 && site.sections.length <= 5);
    assert.equal(site.sections[0].type, "hero");
    assert.equal(site.sections.at(-1)?.type, "contact");
    assert.equal(site.sections[0].title, innovaCompany.businessName);
    assert.equal(
      new Set(site.sections.map((section) => section.id)).size,
      site.sections.length,
    );
  }
  assert.equal(JSON.stringify(innovaCompany), original);
});
test("new templates do not share mutable sections between companies or drafts", () => {
  const first = makeCompanyWebsiteTemplate("products", innovaCompany);
  const second = makeCompanyWebsiteTemplate("products", {
    ...innovaCompany,
    businessName: "Өөр компани",
    phone: "99112233",
  });
  first.sections[0].title = "Засварласан";
  assert.notEqual(second.sections[0].title, "Засварласан");
  assert.equal(second.sections[0].title, "Өөр компани");
});
