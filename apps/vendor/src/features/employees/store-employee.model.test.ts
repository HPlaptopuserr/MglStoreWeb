import assert from "node:assert/strict";
import test from "node:test";
import {
  employeeJob,
  filterEmployees,
  summarizeEmployees,
  type StoreEmployee,
} from "./store-employee.model";
import {
  parsePersonalAccounts,
  parseStoreEmployee,
  parseStoreEmployees,
} from "./store-employee.validation";

const cashier: StoreEmployee = {
  id: "member",
  userId: "user",
  email: "cashier@example.test",
  fullName: "Бат",
  phone: "99112233",
  role: "STAFF",
  roleLabel: "Ажилтан",
  department: "Касс",
  capabilities: ["POS_CASHIER"],
  isActive: true,
};

test("employee responses reject missing fields, unsupported roles and malformed capabilities", () => {
  assert.deepEqual(parseStoreEmployee(cashier), cashier);
  for (const value of [
    null,
    {},
    { ...cashier, role: "SUPER_ADMIN" },
    { ...cashier, isActive: "true" },
    { ...cashier, capabilities: [42] },
    { ...cashier, phone: 99112233 },
  ]) {
    assert.throws(() => parseStoreEmployee(value));
  }
});

test("list responses reject an error object and even one malformed item", () => {
  assert.deepEqual(parseStoreEmployees([]), []);
  assert.deepEqual(parseStoreEmployees([cashier]), [cashier]);
  assert.throws(() => parseStoreEmployees({ message: "server error" }));
  assert.throws(() => parseStoreEmployees([cashier, { id: "invalid" }]));
});

test("personal account results require an explicit membership state before selection", () => {
  const account = {
    id: "personal",
    email: cashier.email,
    fullName: cashier.fullName,
    phone: null,
    membership: null,
  };
  assert.deepEqual(parsePersonalAccounts([account]), [account]);
  assert.throws(() =>
    parsePersonalAccounts([{ ...account, membership: "UNKNOWN" }]),
  );
  assert.throws(() =>
    parsePersonalAccounts([{ ...account, membership: undefined }]),
  );
});

test("cashier statistics count explicit POS access regardless of other job roles", () => {
  const members: StoreEmployee[] = [
    cashier,
    { ...cashier, role: "OWNER" },
    { ...cashier, role: "ADMIN" },
    { ...cashier, isActive: false },
  ];
  assert.deepEqual(summarizeEmployees(members), {
    total: 4,
    active: 3,
    inactive: 1,
    cashiers: 2,
  });
  assert.equal(employeeJob(members[1]), "Дэлгүүрийн эзэмшигч");
  assert.deepEqual(summarizeEmployees([]), {
    total: 0,
    active: 0,
    inactive: 0,
    cashiers: 0,
  });
});

test("directory search combines status with case-insensitive names, contacts and job titles", () => {
  const paused = { ...cashier, id: "paused", isActive: false };
  const members = [cashier, paused];
  assert.deepEqual(filterEmployees(members, "  БАТ  ", "ACTIVE"), [cashier]);
  assert.deepEqual(filterEmployees(members, "991122", "INACTIVE"), [paused]);
  assert.deepEqual(filterEmployees(members, "CASHIER@", "ALL"), members);
  assert.deepEqual(filterEmployees(members, "Кассын", "ALL"), members);
  assert.deepEqual(filterEmployees(members, "unknown", "ALL"), []);
  assert.deepEqual(members, [cashier, paused]);
});
