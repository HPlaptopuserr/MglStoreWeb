import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditBorrowerConnection } from "./CreditBorrowerConnection";

const props = {
  phone: "99489147", fallback: null, canLink: true, disabled: false, onLink: () => {},
};

test("confirmed MGL accounts show green status to every viewer without offering linking again", () => {
  for (const canLink of [true, false]) {
    const html = renderToStaticMarkup(
      <CreditBorrowerConnection {...props} borrowerUserId="registered-user" canLink={canLink} />,
    );
    assert.match(html, /99489147/);
    assert.match(html, /text-emerald-700/);
    assert.match(html, /MGL холбогдсон/);
    assert.doesNotMatch(html, /<button/);
  }
});

test("a saved phone alone does not prove linking and edit permissions are respected", () => {
  const html = renderToStaticMarkup(<CreditBorrowerConnection {...props} borrowerUserId={null} />);
  assert.match(html, /MGL бүртгэлд холбох/);
  assert.doesNotMatch(html, /MGL холбогдсон/);
  assert.doesNotMatch(renderToStaticMarkup(
    <CreditBorrowerConnection {...props} borrowerUserId={null} canLink={false} />,
  ), /<button/);
  assert.match(renderToStaticMarkup(
    <CreditBorrowerConnection {...props} borrowerUserId={null} disabled />,
  ), /<button[^>]*disabled/);
});
