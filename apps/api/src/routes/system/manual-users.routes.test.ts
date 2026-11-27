import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type Prisma, type PlatformRole } from "@mgl/database";
import { createManualUsersRouter } from "./manual-users.routes";

const validInput = {
  fullName: " Г. Уранчимэг ",
  email: " Urnaa@example.com ",
  phone: "+976 8912-2723",
  password: "89122723",
};

test("manual user creation enforces permissions, validation and account invariants", async (t) => {
  let createdData: Prisma.UserCreateInput | undefined;
  const find = t.mock.fn(async (): Promise<{ id: string } | null> => null);
  const create = t.mock.fn(async (args: { data: Prisma.UserCreateInput }) => {
    createdData = args.data;
    return {
      id: "new-user",
      email: validInput.email.trim().toLowerCase(),
      role: "USER" as PlatformRole,
    };
  });
  const app = express();
  app.use(
    express.json({ strict: false }),
    createManualUsersRouter({ findFirst: find, create }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/admin/users/manual`;
  async function send(body: unknown, role?: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (role)
      headers.Authorization = `Bearer ${jwt.sign(
        { userId: "admin", email: "admin@example.com", role },
        process.env.JWT_SECRET || "dev-secret-change-me",
      )}`;
    return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  }
  try {
    for (const [role, expected] of [
      [undefined, 401],
      ["USER", 403],
      ["CONTENT_ADMIN", 403],
    ] as const) {
      assert.equal((await send(validInput, role)).status, expected);
    }
    for (const invalid of [
      null,
      {},
      { ...validInput, email: "invalid" },
      { ...validInput, phone: "abc89122723" },
      { ...validInput, password: "123" },
      { ...validInput, password: "ө".repeat(37) },
    ]) {
      assert.equal((await send(invalid, "HR_ADMIN")).status, 400);
    }
    assert.equal(find.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);

    const response = await send(
      { ...validInput, role: "SUPER_ADMIN", emailVerified: true },
      "HR_ADMIN",
    );
    assert.equal(response.status, 201);
    assert.ok(createdData);
    assert.equal(createdData.email, "urnaa@example.com");
    assert.equal(createdData.role, "USER");
    assert.equal(createdData.isActive, true);
    assert.equal(createdData.emailVerified, false);
    assert.equal(createdData.onboardingSource, "ADMIN");
    assert.deepEqual(createdData.profile, {
      create: { fullName: "Г. Уранчимэг", phoneNumber: "89122723" },
    });
    assert.equal(
      await bcrypt.compare(
        validInput.password,
        String(createdData.passwordHash),
      ),
      true,
    );
    assert.equal(
      JSON.stringify(await response.json()).includes("password"),
      false,
    );

    find.mock.mockImplementation(async () => ({ id: "existing-user" }));
    assert.equal((await send(validInput, "ADMIN")).status, 409);
    assert.equal(create.mock.callCount(), 1);

    find.mock.mockImplementation(async () => null);
    create.mock.mockImplementation(async () => {
      throw { code: "P2002" };
    });
    assert.equal((await send(validInput, "ADMIN")).status, 409);
    create.mock.mockImplementation(async () => {
      throw new Error("database unavailable");
    });
    assert.equal((await send(validInput, "ADMIN")).status, 500);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
