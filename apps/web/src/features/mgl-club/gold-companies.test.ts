import assert from "node:assert/strict";
import { test } from "node:test";
import { innovaCompany } from "@mgl/ui/company-site/innova";
import { goldCompanies } from "./gold-companies";

const filters = { query: "", sector: "", city: "" };
test("admin-selected Innova is visible before remote results and opens the Business presentation", () => {
  const result = goldCompanies([], filters);
  assert.equal(result.length, 1);
  assert.equal(result[0].member.businessName, "Иннова ХХК");
  assert.match(result[0].href, /\/innovallc$/);
});
test("Innova respects search, location and sector filters", () => {
  for (const query of ["INNOVA", "innovallc", "иннова", "бетон"])
    assert.equal(goldCompanies([], { ...filters, query }).length, 1);
  for (const mismatch of [
    { query: "аялал" },
    { city: "Архангай" },
    { sector: "Худалдаа" },
  ])
    assert.equal(goldCompanies([], { ...filters, ...mismatch }).length, 0);
});
test("remote duplicate Innova is shown once while other paid entries retain their links", () => {
  const result = goldCompanies(
    [
      { ...innovaCompany, id: "real-innova", businessName: "ИННОВА ХХК" },
      { ...innovaCompany, id: "other", businessName: "Бусад байгууллага" },
    ],
    filters,
  );
  assert.equal(result.length, 2);
  assert.equal(result[1].href, "/mgl-club/companies/other");
});

test("admin-managed Innova name, logo, sector and city replace the published fallback consistently", () => {
  const edited = {
    ...innovaCompany,
    id: "managed-innova",
    businessName: "Иннова шинэ нэр",
    logoUrl: "https://example.test/new-logo.webp",
    city: "Дархан-Уул",
    sector: "Барилга, үл хөдлөх",
    offers: "Шинэ үйлчилгээ",
  };
  const result = goldCompanies(
    [edited],
    { ...filters, query: "шинэ нэр" },
    edited,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].member.logoUrl, edited.logoUrl);
  assert.equal(result[0].member.businessName, edited.businessName);
  assert.match(result[0].href, /\/innovallc$/);
  assert.equal(
    goldCompanies([], { ...filters, city: "Улаанбаатар" }, edited).length,
    0,
  );
  assert.equal(
    goldCompanies(
      [],
      { ...filters, city: "Дархан-Уул", sector: "Барилга, үл хөдлөх" },
      edited,
    ).length,
    1,
  );
});
