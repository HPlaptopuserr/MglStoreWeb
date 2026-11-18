import assert from "node:assert/strict";
import { test } from "node:test";
import { innovaCompany, innovaWebsite, parseClubWebsite } from "@mgl/types";
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
test("corporate template uses the Innova structure with the selected company's own content", () => {
  const member = {
    ...innovaCompany,
    id: "another-company",
    businessName: "Өөрийн байгууллага",
    sector: "Үйлчилгээ",
    description: "Байгууллагын өөрийн танилцуулга",
    offers: "Вэб сайт, Дизайн",
  };
  const site = makeCompanyWebsiteTemplate("corporate", member);
  assert.deepEqual(
    site.sections.map(({ id, type, layout, tone }) => ({
      id,
      type,
      layout,
      tone,
    })),
    innovaWebsite.sections.map(({ id, type, layout, tone }) => ({
      id,
      type,
      layout,
      tone,
    })),
  );
  assert.deepEqual(site.theme, innovaWebsite.theme);
  assert.equal(site.sections[0].title, member.businessName);
  assert.equal(site.sections[1].text, member.description);
  assert.deepEqual(
    site.sections[2].items.map((item) => item.title),
    ["Вэб сайт", "Дизайн"],
  );
  assert.equal(site.sections[3].items.length, 0);
  assert.ok(!JSON.stringify(site).includes("/innova-"));
  assert.ok(parseClubWebsite(site));
});
test("applying the corporate layout preserves entered images, products and extra sections", () => {
  const current = makeCompanyWebsiteTemplate("products", innovaCompany);
  current.sections[0].title = "Өөрийн нүүр гарчиг";
  current.sections[0].imageUrl = "https://example.com/hero.png";
  const products = current.sections.find(
    (section) => section.type === "services",
  )!;
  products.items[0].text = "Оруулсан тайлбар";
  products.items[0].imageUrl = "https://example.com/product.png";
  const before = JSON.stringify(current);
  const updated = makeCompanyWebsiteTemplate(
    "corporate",
    innovaCompany,
    current,
  );
  assert.equal(updated.sections[0].title, current.sections[0].title);
  assert.equal(updated.sections[0].imageUrl, current.sections[0].imageUrl);
  assert.deepEqual(
    updated.sections.find((section) => section.id === "production")?.items,
    products.items,
  );
  assert.ok(updated.sections.some((section) => section.id === "gallery"));
  assert.ok(parseClubWebsite(updated));
  assert.equal(JSON.stringify(current), before);
});
test("corporate layout retains extra gallery content when its ID matches a new section", () => {
  const current = makeCompanyWebsiteTemplate("products", innovaCompany);
  const gallery = current.sections.find(
    (section) => section.type === "gallery",
  )!;
  gallery.id = "production";
  gallery.title = "Өмнөх зургийн цомог";
  gallery.items = [
    {
      title: "Өмнөх зураг",
      text: "Тайлбар",
      imageUrl: "https://example.com/photo.png",
      imageAlt: "Зураг",
    },
  ];
  const updated = makeCompanyWebsiteTemplate(
    "corporate",
    innovaCompany,
    current,
  );
  assert.ok(parseClubWebsite(updated));
  assert.deepEqual(
    updated.sections.find((section) => section.title === gallery.title)?.items,
    gallery.items,
  );
});
