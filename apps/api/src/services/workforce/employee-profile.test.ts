import assert from "node:assert/strict";
import test from "node:test";
import {
  employeeAuditSnapshot,
  normalizeDepartmentName,
  parseEmployeeProfile,
  serializeEmployeeProfile,
} from "./employee-profile";
test("department names normalize spacing and reject invalid types", () => {
  assert.equal(
    normalizeDepartmentName("  Борлуулалтын   алба  "),
    "Борлуулалтын алба",
  );
  assert.equal(normalizeDepartmentName(""), "");
  assert.throws(() => normalizeDepartmentName(123));
  assert.throws(() => normalizeDepartmentName("x".repeat(121)));
});
test("profile validates dates, contact details and limits without accepting account fields", () => {
  const profile = parseEmployeeProfile({
    fullName: " Тест ",
    phone: "+976 9911 2233",
    birthDate: "2000-02-29",
    gender: "FEMALE",
    email: "person@example.mn",
    role: "OWNER",
    password: "ignored",
  });
  assert.equal(profile.fullName, "Тест");
  assert.equal(profile.phone, "99112233");
  assert.equal(
    profile.birthDate instanceof Date
      ? profile.birthDate.toISOString().slice(0, 10)
      : profile.birthDate,
    "2000-02-29",
  );
  assert.ok(!("role" in profile));
  assert.ok(!("password" in profile));
  for (const input of [
    { birthDate: "2001-02-29" },
    { birthDate: "2999-01-01" },
    { hiredAt: "2026-13-01" },
    { phone: "abc99112233" },
    { email: "invalid" },
    { gender: "INVALID" },
    { notes: "x".repeat(2001) },
    { fullName: "" },
  ])
    assert.throws(() => parseEmployeeProfile(input));
  assert.deepEqual(
    parseEmployeeProfile({ address: "", hiredAt: "", gender: "" }),
    { address: null, hiredAt: null, gender: null },
  );
});
test("missing organization profile initializes from account without modifying the account", () => {
  const account = Object.freeze({
    fullName: "Үндсэн нэр",
    email: "account@example.mn",
    phone: "99112233",
  });
  const result = serializeEmployeeProfile(null, account);
  assert.equal(result.fullName, account.fullName);
  assert.equal(result.birthDate, "");
  assert.equal(result.notes, "");
});

test("payroll accounts normalize, preserve leading zeroes, reject incomplete data, and clear explicitly", () => {
  const result = parseEmployeeProfile({
    payrollBankName: " Тест банк ",
    payrollAccountNumber: "0000 1122-3344",
    payrollAccountHolder: " Тест ажилтан ",
  });
  assert.equal(result.payrollAccountNumber, "000011223344");
  assert.equal(result.payrollBankName, "Тест банк");
  assert.throws(() => parseEmployeeProfile({ payrollBankName: "Тест банк" }));
  assert.throws(() =>
    parseEmployeeProfile({
      payrollBankName: "Банк",
      payrollAccountNumber: "../123456",
      payrollAccountHolder: "Ажилтан",
    }),
  );
  assert.throws(() =>
    parseEmployeeProfile({
      payrollBankName: "Банк",
      payrollAccountNumber: 12345678,
      payrollAccountHolder: "Ажилтан",
    }),
  );
  assert.deepEqual(
    parseEmployeeProfile({
      payrollBankName: "",
      payrollAccountNumber: "",
      payrollAccountHolder: "",
    }),
    {
      payrollBankName: null,
      payrollAccountNumber: null,
      payrollAccountHolder: null,
    },
  );
  assert.ok(
    !("payrollAccountNumber" in parseEmployeeProfile({ jobTitle: "Менежер" })),
  );
});
test("audit history masks payroll account numbers without mutating stored values", () => {
  const member = {
    id: "fixture",
    workforceProfile: {
      payrollAccountNumber: "000011223344",
      fullName: "Тест",
    },
  };
  const snapshot = employeeAuditSnapshot(member);
  assert.equal(snapshot.workforceProfile?.payrollAccountNumber, "•••• 3344");
  assert.equal(member.workforceProfile.payrollAccountNumber, "000011223344");
  assert.ok(!JSON.stringify(snapshot).includes("000011223344"));
});
