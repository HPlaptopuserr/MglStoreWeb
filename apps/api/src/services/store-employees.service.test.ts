import assert from "node:assert/strict";
import { afterEach, mock, test, type Mock } from "node:test";
import { prisma, Prisma } from "@mgl/database";
import {
  assignStoreCashier,
  grantStoreCashierAccess,
  searchStorePersonalAccounts,
  setStoreEmployeeStatus,
  StoreEmployeeError,
} from "./store-employees.service";

const employee = {
  id: "member",
  userId: "personal-user",
  role: "STAFF",
  department: "Касс",
  capabilities: ["POS_CASHIER"],
  isActive: true,
  user: {
    email: "cashier@example.test",
    profile: { fullName: "Test cashier", phoneNumber: "99112233" },
    isActive: true,
    deletedAt: null,
  },
};

const restores: (() => void)[] = [];
function restoreMocks() {
  while (restores.length) restores.pop()?.();
  mock.restoreAll();
}
afterEach(restoreMocks);

// Prisma delegates are proxies; assign their methods rather than mocking descriptors.
function mockMethod<T extends object, K extends keyof T>(
  target: T,
  key: K,
  implementation: (...args: never[]) => unknown,
) {
  const original = target[key];
  const replacement = mock.fn(implementation);
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, original);
  });
  return replacement as Mock<Extract<T[K], (...args: never[]) => unknown>>;
}

function mockStore(
  options: {
    owner?: boolean;
    maxMembers?: number;
    count?: number;
    existing?: boolean;
    target?: typeof employee | null;
  } = {},
) {
  mockMethod(
    prisma,
    "$transaction",
    async (work: (db: Prisma.TransactionClient) => Promise<unknown>) =>
      work(prisma),
  );
  mockMethod(prisma.organization, "findFirst", async () => ({
    id: "store",
    maxMembers: options.maxMembers ?? 10,
  }));
  mockMethod(
    prisma.organizationMember,
    "findFirst",
    async (args: { where: { role?: string; organizationId?: string } }) => {
      assert.equal(args.where.organizationId, "store");
      return args.where.role === "OWNER"
        ? options.owner === false
          ? null
          : { id: "owner-member" }
        : options.target === undefined
          ? employee
          : options.target;
    },
  );
  mockMethod(prisma.organizationMember, "findUnique", async () =>
    options.existing ? { ...employee, deletedAt: null } : null,
  );
  mockMethod(
    prisma.organizationMember,
    "count",
    async () => options.count ?? 1,
  );
  mockMethod(prisma.user, "findFirst", async () => ({ id: "personal-user" }));
}

function status(expected: number) {
  return (error: unknown) =>
    error instanceof StoreEmployeeError && error.status === expected;
}

test("assignment links an existing identity with least privilege and never changes personal data", async () => {
  mockStore();
  const create = mockMethod(
    prisma.organizationMember,
    "create",
    async () => employee,
  );
  const updateUser = mockMethod(prisma.user, "update", async () => {
    throw new Error("Personal identity must not be written");
  });
  const createUser = mockMethod(prisma.user, "create", async () => {
    throw new Error("New identity must not be created");
  });
  const updateProfile = mockMethod(prisma.profile, "upsert", async () => {
    throw new Error("Personal profile must not be written");
  });
  const result = await assignStoreCashier("owner", "store", "personal-user");
  assert.equal(result.fullName, "Test cashier");
  assert.equal(result.userId, "personal-user");
  assert.deepEqual(create.mock.calls[0].arguments[0].data, {
    userId: "personal-user",
    organizationId: "store",
    role: "STAFF",
    department: "Касс",
    capabilities: ["POS_CASHIER"],
    isActive: true,
  });
  assert.equal(
    updateUser.mock.callCount() +
      createUser.mock.callCount() +
      updateProfile.mock.callCount(),
    0,
  );
});

test("only active store owners can search, assign or change status", async () => {
  mockStore({ owner: false });
  await assert.rejects(
    searchStorePersonalAccounts("outsider", "store", "test"),
    status(403),
  );
  await assert.rejects(
    assignStoreCashier("outsider", "store", "personal-user"),
    status(403),
  );
  await assert.rejects(
    setStoreEmployeeStatus("outsider", "store", "member", false),
    status(403),
  );
});

test("adding an existing cashier is idempotent without a duplicate membership", async () => {
  mockStore({ existing: true });
  const create = mockMethod(
    prisma.organizationMember,
    "create",
    async () => employee,
  );
  const result = await assignStoreCashier("owner", "store", "personal-user");
  assert.equal(result.id, employee.id);
  assert.equal(create.mock.callCount(), 0);
});

test("assignments and reactivations enforce the active member limit", async () => {
  mockStore({
    count: 2,
    maxMembers: 2,
    target: { ...employee, isActive: false },
  });
  await assert.rejects(
    assignStoreCashier("owner", "store", "personal-user"),
    status(409),
  );
  await assert.rejects(
    setStoreEmployeeStatus("owner", "store", "member", true),
    status(409),
  );
});

test("deleted, inactive or missing personal accounts cannot be assigned", async () => {
  mockStore();
  const user = mockMethod(prisma.user, "findFirst", async () => null);
  await assert.rejects(
    assignStoreCashier("owner", "store", "personal-user"),
    status(404),
  );
  assert.deepEqual(user.mock.calls[0].arguments[0]?.where, {
    id: "personal-user",
    role: "USER",
    isActive: true,
    deletedAt: null,
  });
});

test("status writes cannot target a member of another store", async () => {
  mockStore({ target: null });
  await assert.rejects(
    setStoreEmployeeStatus("owner", "store", "foreign-member", false),
    status(404),
  );
});

test("owner and self status changes are rejected", async () => {
  mockStore({ target: { ...employee, role: "OWNER" } });
  await assert.rejects(
    setStoreEmployeeStatus("owner", "store", "member", false),
    status(403),
  );
  restoreMocks();
  mockStore({ target: { ...employee, userId: "owner" } });
  await assert.rejects(
    setStoreEmployeeStatus("owner", "store", "member", false),
    status(403),
  );
});

test("repeated status requests are idempotent and do not toggle access back", async () => {
  mockStore({ target: { ...employee, isActive: false } });
  const update = mockMethod(prisma.organizationMember, "update", async () => {
    throw new Error("No write needed");
  });
  assert.equal(
    (await setStoreEmployeeStatus("owner", "store", "member", false)).isActive,
    false,
  );
  assert.equal(update.mock.callCount(), 0);
});

test("pausing changes only the selected membership", async () => {
  mockStore();
  const update = mockMethod(prisma.organizationMember, "update", async () => ({
    ...employee,
    isActive: false,
  }));
  const result = await setStoreEmployeeStatus(
    "owner",
    "store",
    "member",
    false,
  );
  assert.equal(result.isActive, false);
  assert.deepEqual(update.mock.calls[0].arguments[0].where, { id: "member" });
  assert.deepEqual(update.mock.calls[0].arguments[0].data, { isActive: false });
});

test("search enforces short and bounded queries and returns membership status without credentials", async () => {
  mockStore();
  const find = mockMethod(prisma.user, "findMany", async () => [
    {
      id: "personal-user",
      email: employee.user.email,
      profile: employee.user.profile,
      organizationMemberships: [
        {
          isActive: false,
          role: "STAFF",
          capabilities: ["POS_CASHIER"],
          deletedAt: null,
        },
      ],
    },
  ]);
  assert.deepEqual(
    await searchStorePersonalAccounts("owner", "store", " a "),
    [],
  );
  await assert.rejects(
    searchStorePersonalAccounts("owner", "store", "a".repeat(101)),
    status(400),
  );
  assert.equal(find.mock.callCount(), 0);
  const result = await searchStorePersonalAccounts(
    "owner",
    "store",
    " cashier ",
  );
  assert.equal(result[0].membership, "INACTIVE");
  const args = find.mock.calls[0].arguments[0];
  assert.ok(args?.where);
  assert.ok(args.select);
  assert.equal(args.take, 10);
  assert.equal(args.where.role, "USER");
  assert.equal(args.where.deletedAt, null);
  assert.equal("passwordHash" in args.select, false);
  assert.deepEqual(args.where.OR?.[0], {
    email: { contains: "cashier", mode: "insensitive" },
  });
});

test("serialization conflicts are retried and unique collisions produce a conflict response", async () => {
  mockStore();
  let attempts = 0;
  mockMethod(
    prisma,
    "$transaction",
    async (
      work: (db: Prisma.TransactionClient) => Promise<unknown>,
      options: { isolationLevel: string },
    ) => {
      assert.equal(options.isolationLevel, "Serializable");
      if (++attempts === 1)
        throw new Prisma.PrismaClientKnownRequestError("Write conflict", {
          code: "P2034",
          clientVersion: "test",
        });
      return work(prisma);
    },
  );
  mockMethod(prisma.organizationMember, "create", async () => employee);
  await assignStoreCashier("owner", "store", "personal-user");
  assert.equal(attempts, 2);
  mockMethod(prisma.organizationMember, "create", async () => {
    throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "test",
    });
  });
  await assert.rejects(
    assignStoreCashier("owner", "store", "personal-user"),
    status(409),
  );
});

test("existing staff gain cashier access without replacing their other permissions or role", async () => {
  mockStore({
    target: { ...employee, department: "Борлуулалт", capabilities: ["SALES"] },
  });
  const update = mockMethod(
    prisma.organizationMember,
    "update",
    async () => employee,
  );
  await grantStoreCashierAccess("owner", "store", "member");
  assert.deepEqual(update.mock.calls[0]?.arguments[0]?.data, {
    capabilities: ["SALES", "POS_CASHIER"],
  });
  assert.deepEqual(update.mock.calls[0]?.arguments[0]?.where, { id: "member" });
});
test("only the store owner can grant access and only to a member of that store", async () => {
  mockStore({ owner: false });
  await assert.rejects(
    grantStoreCashierAccess("staff", "store", "member"),
    status(403),
  );
  mockStore({ target: null });
  await assert.rejects(
    grantStoreCashierAccess("owner", "store", "foreign-member"),
    status(404),
  );
});
test("cashier grants do not reactivate disabled memberships or personal accounts", async () => {
  for (const target of [
    { ...employee, isActive: false },
    { ...employee, user: { ...employee.user, isActive: false } },
  ]) {
    mockStore({ target });
    await assert.rejects(
      grantStoreCashierAccess("owner", "store", "member"),
      status(409),
    );
  }
});
test("cashier grants are idempotent and cannot alter owner memberships", async () => {
  mockStore();
  const update = mockMethod(prisma.organizationMember, "update", async () => {
    throw new Error("No duplicate write");
  });
  await grantStoreCashierAccess("owner", "store", "member");
  assert.equal(update.mock.callCount(), 0);
  mockStore({ target: { ...employee, role: "OWNER" } });
  await assert.rejects(
    grantStoreCashierAccess("owner", "store", "member"),
    status(403),
  );
});

test("adding an existing non-cashier directly assigns POS in the same operation", async () => {
  mockStore();
  mockMethod(prisma.organizationMember, "findUnique", async () => ({
    ...employee,
    capabilities: ["SALES_REPRESENTATIVE"],
    deletedAt: null,
  }));
  const update = mockMethod(
    prisma.organizationMember,
    "update",
    async () => employee,
  );
  await assignStoreCashier("owner", "store", "personal-user");
  assert.deepEqual(update.mock.calls[0]?.arguments[0]?.data, {
    isActive: true,
    capabilities: ["SALES_REPRESENTATIVE", "POS_CASHIER"],
  });
});
test("reactivating an existing membership via cashier assignment respects the plan limit", async () => {
  mockStore({ count: 10, maxMembers: 10 });
  mockMethod(prisma.organizationMember, "findUnique", async () => ({
    ...employee,
    isActive: false,
    deletedAt: null,
  }));
  await assert.rejects(
    assignStoreCashier("owner", "store", "personal-user"),
    status(409),
  );
});
