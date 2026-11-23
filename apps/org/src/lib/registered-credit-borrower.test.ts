import assert from "node:assert/strict";
import test from "node:test";
import { lookupRegisteredCreditBorrower } from "./registered-credit-borrower";

test("registered borrower lookup includes the active organization and canonical exact phone", async () => {
  const previous = globalThis.fetch;
  const user = {
    id: "person",
    fullName: "Registered Person",
    phoneNumber: "99489147",
    email: "person@example.test",
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/api/pos/credit-customers/registered-user");
    assert.equal(url.searchParams.get("organizationId"), "org-a");
    assert.equal(url.searchParams.get("phone"), "99489147");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    return Response.json({ user });
  };
  try {
    assert.deepEqual(
      await lookupRegisteredCreditBorrower("org-a", "+976 99489147"),
      user,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
test("no match cannot become a borrower, and mismatched identity responses fail closed", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ user: null });
    assert.equal(
      await lookupRegisteredCreditBorrower("org-a", "99489147"),
      null,
    );
    for (const user of [
      undefined,
      {},
      {
        id: "person",
        fullName: "Wrong person",
        phoneNumber: "99051206",
        email: null,
      },
      { id: "person", fullName: "", phoneNumber: "99489147", email: null },
    ]) {
      globalThis.fetch = async () => Response.json({ user });
      await assert.rejects(lookupRegisteredCreditBorrower("org-a", "99489147"));
    }
    globalThis.fetch = async () =>
      Response.json({ message: "Дахин оролдоно уу" }, { status: 503 });
    await assert.rejects(
      lookupRegisteredCreditBorrower("org-a", "99489147"),
      /Дахин оролдоно уу/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
