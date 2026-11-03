import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMglClubProfile,
  MGL_CLUB_PROVINCES,
  getMglClubCurrentYear,
  getMglClubOperatingYears,
} from "@mgl/types";
const valid = {
  name: " Бат ",
  businessName: "MGL",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Танилцуулга",
  offers: "Сав баглаа боодол",
  phone: "99112233",
  consent: "yes",
};
test("club profiles normalize known fields and optional procurement needs", () => {
  const data = parseMglClubProfile({ ...valid, privateData: "must not leak" });
  assert.equal(data?.name, "Бат");
  assert.equal(data?.needs, "");
  assert.equal(
    Object.prototype.hasOwnProperty.call(data ?? {}, "privateData"),
    false,
  );
  assert.equal(
    parseMglClubProfile({ ...valid, needs: " Хүргэлт " })?.needs,
    "Хүргэлт",
  );
});
test("club profiles require explicit public consent and valid contact information", () => {
  for (const patch of [
    { consent: "" },
    { consent: true },
    { phone: "123" },
    { phone: "abcdefgh" },
    { name: " " },
    { sector: "unknown" },
    { businessName: [] },
    { offers: "" },
    { description: "x".repeat(1501) },
    { needs: 123 },
  ])
    assert.equal(parseMglClubProfile({ ...valid, ...patch }), null);
  for (const input of [null, [], 1, "hello"])
    assert.equal(parseMglClubProfile(input), null);
});

test("supports all 21 provinces and the capital with canonical legacy locations", () => {
  assert.equal(MGL_CLUB_PROVINCES.length, 21);
  assert.equal(new Set(MGL_CLUB_PROVINCES).size, 21);
  for (const city of MGL_CLUB_PROVINCES)
    assert.equal(parseMglClubProfile({ ...valid, city })?.city, city);
  assert.equal(
    parseMglClubProfile({ ...valid, city: "Дархан" })?.city,
    "Дархан-Уул",
  );
  assert.equal(
    parseMglClubProfile({ ...valid, city: "Эрдэнэт" })?.city,
    "Орхон",
  );
  assert.equal(
    parseMglClubProfile({ ...valid, city: " Хөвсгөл аймаг " })?.city,
    "Хөвсгөл",
  );
  for (const city of ["unknown", "__proto__", "constructor"])
    assert.equal(parseMglClubProfile({ ...valid, city }), null);
});

test("business facts are optional for existing registrations and validate provided values", () => {
  const legacy = parseMglClubProfile(valid);
  assert.equal(legacy?.foundedYear, "");
  const facts = {
    foundedYear: "2018",
    role: "Үүсгэн байгуулагч",
    teamSize: "12",
    address: "Туршилтын хаяг",
    workingHours: "09:00–18:00",
    serviceArea: "Улс даяар",
    website: "https://example.com/business",
  };
  const result = parseMglClubProfile({ ...valid, ...facts });
  for (const [key, value] of Object.entries(facts))
    assert.equal(result?.[key as keyof typeof facts], value);
  for (const patch of [
    { foundedYear: String(getMglClubCurrentYear() + 1) },
    { foundedYear: "1899" },
    { foundedYear: "2e3" },
    { teamSize: "0" },
    { teamSize: "-1" },
    { teamSize: "2.5" },
    { teamSize: "100001" },
    { website: "javascript:alert(1)" },
    { website: "https://user:password@example.com" },
    { website: "example.com" },
  ])
    assert.equal(parseMglClubProfile({ ...valid, ...patch }), null);
});
test("operating years use the start year and handle a newly started business", () => {
  assert.equal(getMglClubOperatingYears("2018", 2026), 8);
  assert.equal(getMglClubOperatingYears("2026", 2026), 0);
  assert.equal(getMglClubOperatingYears("2027", 2026), null);
  assert.equal(getMglClubOperatingYears("", 2026), null);
});
