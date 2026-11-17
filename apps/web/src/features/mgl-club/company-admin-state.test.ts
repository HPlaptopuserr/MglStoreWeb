import assert from "node:assert/strict";
import { test } from "node:test";
import { innovaCompany } from "@mgl/ui/company-site/innova";
import {
  companyProfileChanged,
  editableCompanyProfile,
} from "./company-admin-state";

const member = {
  ...innovaCompany,
  ownerUserId: "private-owner",
  websiteDraft: { private: true },
  profileVersion: 4,
};
test("editing starts with the known public fields, not IDs or private metadata", () => {
  const draft = editableCompanyProfile(member);
  assert.equal(draft.businessName, innovaCompany.businessName);
  assert.equal(draft.consent, "yes");
  assert.equal("id" in draft, false);
  assert.equal("ownerUserId" in draft, false);
  assert.equal("websiteDraft" in draft, false);
  assert.equal("profileVersion" in draft, false);
});
test("dirty-state detection includes optional information and removed logos", () => {
  const draft = editableCompanyProfile(member);
  assert.equal(companyProfileChanged(draft, { ...draft }), false);
  assert.equal(companyProfileChanged(draft, { ...draft, logoUrl: "" }), true);
  assert.equal(
    companyProfileChanged(draft, { ...draft, address: "Шинэ хаяг" }),
    true,
  );
  assert.equal(
    companyProfileChanged(
      { ...draft, logoUrl: undefined },
      { ...draft, logoUrl: "" },
    ),
    false,
  );
});
