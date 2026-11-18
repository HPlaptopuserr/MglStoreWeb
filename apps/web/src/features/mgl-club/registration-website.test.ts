import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRegistrationWebsite } from "./registration-website";
test("plain business domains and social links receive HTTPS", () => {
  assert.equal(
    normalizeRegistrationWebsite("www.mglbusiness.mn"),
    "https://www.mglbusiness.mn/",
  );
  assert.equal(
    normalizeRegistrationWebsite(" mglbusiness.mn "),
    "https://mglbusiness.mn/",
  );
  assert.equal(
    normalizeRegistrationWebsite("facebook.com/profile.php?id=123&sk=about"),
    "https://facebook.com/profile.php?id=123&sk=about",
  );
  assert.equal(
    normalizeRegistrationWebsite("http://example.com/path"),
    "http://example.com/path",
  );
  assert.equal(normalizeRegistrationWebsite(""), "");
});
test("unsafe schemes, credentials and invalid domains remain invalid", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.com",
    "https://user:password@example.com",
    "bad domain.mn",
    "not-a-domain",
  ])
    assert.equal(normalizeRegistrationWebsite(value), null, value);
});
