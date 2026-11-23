import assert from "node:assert/strict";
import test from "node:test";
import {
  linkExistingCreditBorrower,
  type LinkExistingCreditBorrowerInput,
} from "./link-existing-credit-borrower";

const input: LinkExistingCreditBorrowerInput = {
  organizationId: "org-a",
  creditSaleIds: ["credit-one", "credit-two"],
  borrowerUserId: "registered-person",
  borrowerPhone: "+976 99489147",
  expectedCredits: ["credit-one", "credit-two"].map((id) => ({
    id,
    customerId: "old-customer",
    borrowerId: "old-borrower",
    borrowerPhone: "99051206",
    borrowerUserId: null,
  })),
};
const acknowledgment = {
  linkedCreditSaleIds: input.creditSaleIds,
  borrowerUserId: input.borrowerUserId,
  linkedCount: 2,
  user: {
    id: input.borrowerUserId,
    fullName: "Registered Person",
    phoneNumber: "99489147",
    email: null,
  },
};

test("existing debt link sends exact selected rows, original snapshot and canonical registered account only", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(
      new URL(String(url)).pathname,
      "/api/pos/credit-customers/link-existing",
    );
    assert.equal(init?.method, "POST");
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload, { ...input, borrowerPhone: "99489147" });
    assert.ok(!("totalDue" in payload));
    assert.ok(!("paidAmount" in payload));
    assert.ok(!("status" in payload));
    return Response.json(acknowledgment);
  };
  try {
    assert.deepEqual(await linkExistingCreditBorrower(input), acknowledgment);
  } finally {
    globalThis.fetch = previous;
  }
});
test("incomplete or duplicate row snapshots cannot dispatch a correction", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json(acknowledgment);
  };
  try {
    await assert.rejects(
      linkExistingCreditBorrower({ ...input, expectedCredits: [] }),
    );
    await assert.rejects(
      linkExistingCreditBorrower({
        ...input,
        expectedCredits: [input.expectedCredits[0]!, input.expectedCredits[0]!],
      }),
    );
    await assert.rejects(
      linkExistingCreditBorrower({ ...input, borrowerPhone: "9948" }),
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previous;
  }
});
test("stale correction conflicts and a mismatched acknowledgement are never reported as successful", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json(
        { message: "Зээлийн мэдээлэл өөрчлөгдсөн. Шинэчилнэ үү." },
        { status: 409 },
      );
    await assert.rejects(
      linkExistingCreditBorrower(input),
      /Зээлийн мэдээлэл өөрчлөгдсөн/,
    );
    globalThis.fetch = async () =>
      Response.json({ ...acknowledgment, borrowerUserId: "another-person" });
    await assert.rejects(
      linkExistingCreditBorrower(input),
      /хүсэлттэй таарахгүй/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
