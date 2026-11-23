import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegisteredCreditUserLookup } from "./RegisteredCreditUserLookup";

const user = {
  id: "registered-person",
  fullName: "Registered Person",
  phoneNumber: "99489147",
  email: null,
};
const scope = { requestId: 1, organizationId: "org-a", phone: "99489147" };
const noop = () => {};

test("search result exposes an explicit select action before showing a selected identity", () => {
  const html = renderToStaticMarkup(
    <RegisteredCreditUserLookup
      phone={user.phoneNumber}
      state={{ ...scope, status: "found", user }}
      user={null}
      onLookup={noop}
      onSelect={noop}
    />,
  );
  assert.match(html, /Утсаар хайх/);
  assert.match(html, /Registered Person/);
  assert.match(html, /<button[^>]*>Сонгох<\/button>/);
  assert.ok(!html.includes("Сонгосон MGL хэрэглэгч"));
});

test("only an explicitly selected identity renders the selected summary", () => {
  const html = renderToStaticMarkup(
    <RegisteredCreditUserLookup
      phone={user.phoneNumber}
      state={{ ...scope, status: "ready", user }}
      user={user}
      onLookup={noop}
      onSelect={noop}
    />,
  );
  assert.match(html, /Сонгосон MGL хэрэглэгч/);
  assert.ok(!html.includes(">Сонгох</button>"));
});
