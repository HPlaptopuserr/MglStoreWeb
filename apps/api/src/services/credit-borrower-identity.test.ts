import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { prisma } from "@mgl/database";
import {
  CreditBorrowerError,
  findRegisteredCreditBorrower,
  registeredBorrowerPhone,
  resolveCreditBorrowerIdentity,
} from "./credit-borrower-identity";

const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
let matchedIds: Array<{ id: string }>;
let active: boolean;
let profilePhone: string;
let locks: string[];
const registered = {
  id: "registered-user",
  email: "person@example.com",
  profile: { fullName: "Болд", phoneNumber: "99112233" },
};
beforeEach(() => {
  matchedIds = [{ id: registered.id }];
  active = true;
  profilePhone = registered.profile.phoneNumber;
  locks = [];
  stub(prisma, "$queryRaw", async (query: TemplateStringsArray) => {
    const sql = query.join("?");
    if (sql.includes("FOR SHARE")) {
      locks.push(sql);
      return [];
    }
    assert.ok(sql.includes("LIMIT 2"));
    assert.ok(sql.includes('u."isActive" = true'));
    assert.ok(sql.includes('u."deletedAt" IS NULL'));
    return matchedIds;
  });
  stub(prisma.user, "findFirst", async () =>
    active
      ? {
          ...registered,
          profile: { ...registered.profile, phoneNumber: profilePhone },
        }
      : null,
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

test("lookup accepts equivalent exact Mongolian phone forms and returns only minimal identity", async () => {
  for (const phone of ["99112233", "+976 9911-2233", "97699112233"]) {
    assert.equal(registeredBorrowerPhone(phone), "99112233");
    assert.deepEqual(await findRegisteredCreditBorrower(prisma, phone), {
      id: "registered-user",
      fullName: "Болд",
      phoneNumber: "99112233",
      email: "person@example.com",
    });
  }
});
test("lookup rejects malformed, short and ambiguous numbers instead of choosing a random account", async () => {
  for (const phone of ["", "9911", "99112233x", undefined, ["99112233"]])
    assert.throws(() => registeredBorrowerPhone(phone), CreditBorrowerError);
  matchedIds = [{ id: "one" }, { id: "two" }];
  await assert.rejects(
    findRegisteredCreditBorrower(prisma, "99112233"),
    (error) => error instanceof CreditBorrowerError && error.status === 409,
  );
  matchedIds = [];
  assert.equal(await findRegisteredCreditBorrower(prisma, "99112233"), null);
});
test("issuance derives immutable account identity rather than client-supplied name and borrower id", async () => {
  const identity = await resolveCreditBorrowerIdentity(prisma, {
    borrowerUserId: registered.id,
    targetType: "CUSTOMER",
    borrowerName: "Spoofed",
    borrowerPhone: "+97699112233",
  });
  assert.equal(identity.borrowerUserId, registered.id);
  assert.equal(identity.borrowerName, "Болд");
  assert.equal(identity.borrowerPhone, "99112233");
  assert.equal(identity.borrowerEmail, "person@example.com");
  assert.equal(identity.borrowerId, `user:${registered.id}`);
  assert.equal(identity.employeeId, null);
  assert.equal(
    locks.length,
    1,
    "account cannot be deactivated between validation and issuance",
  );
});
test("company uses registered responsible person while retaining the company label", async () => {
  const identity = await resolveCreditBorrowerIdentity(prisma, {
    borrowerUserId: registered.id,
    targetType: "COMPANY",
    borrowerName: " МГЛ Компани ",
    borrowerPhone: "99112233",
  });
  assert.equal(identity.borrowerName, "МГЛ Компани");
  assert.equal(identity.employeeName, "Болд");
  assert.equal(identity.employeeId, registered.id);
  const equivalent = await resolveCreditBorrowerIdentity(prisma, {
    borrowerUserId: registered.id,
    targetType: "COMPANY",
    borrowerName: "мгл  компани",
    borrowerPhone: "99112233",
  });
  assert.equal(
    equivalent.normalizedBorrowerKey,
    identity.normalizedBorrowerKey,
  );
});
test("missing, disabled and stale selected accounts cannot issue a new debt", async () => {
  await assert.rejects(
    resolveCreditBorrowerIdentity(prisma, {
      targetType: "CUSTOMER",
      borrowerPhone: "99112233",
    }),
    CreditBorrowerError,
  );
  active = false;
  await assert.rejects(
    resolveCreditBorrowerIdentity(prisma, {
      borrowerUserId: registered.id,
      targetType: "CUSTOMER",
      borrowerPhone: "99112233",
    }),
    CreditBorrowerError,
  );
  active = true;
  profilePhone = "99223344";
  await assert.rejects(
    resolveCreditBorrowerIdentity(prisma, {
      borrowerUserId: registered.id,
      targetType: "CUSTOMER",
      borrowerPhone: "99112233",
    }),
    CreditBorrowerError,
  );
});

test("a known user ID cannot bypass ambiguous phone selection during credit issuance", async () => {
  matchedIds = [{ id: "registered-user" }, { id: "legacy-duplicate" }];
  await assert.rejects(
    resolveCreditBorrowerIdentity(prisma, {
      borrowerUserId: registered.id,
      targetType: "CUSTOMER",
      borrowerPhone: "99112233",
    }),
    (error) => error instanceof CreditBorrowerError && error.status === 409,
  );
});
