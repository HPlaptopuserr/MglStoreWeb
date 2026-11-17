import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import formsRouter from "./forms.routes";
let server: Server, base: string;
const id = "00000000-0000-4000-8000-000000000001";
const restores: Array<() => void> = [];
function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
function token(role: string) {
  return jwt.sign(
    { userId: "company-owner", email: "owner@example.test", role },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
}
before(async () => {
  const app = express();
  app.use(express.json(), formsRouter);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
const endpoints = [
  ["POST", "/forms/mgl-club/responses"],
  ["POST", "/forms/mgl-club/logos"],
  ["PUT", `/forms/mgl-club/my-companies/${id}/site-url`],
  ["GET", "/forms/mgl-club/my-companies"],
  ["GET", `/forms/mgl-club/my-companies/${id}/profile`],
  ["PATCH", `/forms/mgl-club/my-companies/${id}/profile`],
  ["POST", "/forms/mgl-club/my-companies/import-innova"],
  ["POST", `/forms/mgl-club/members/${id}/claim`],
  ["GET", `/forms/mgl-club/my-companies/${id}/website`],
  ["GET", `/forms/mgl-club/my-companies/${id}/website-access`],
  ["POST", `/forms/mgl-club/my-companies/${id}/gold-invoice`],
  ["POST", `/forms/mgl-club/my-companies/${id}/gold-invoices/${id}/check`],
  ["PUT", `/forms/mgl-club/my-companies/${id}/website`],
  ["POST", `/forms/mgl-club/my-companies/${id}/website/publish`],
  ["POST", `/forms/mgl-club/my-companies/${id}/website/images`],
  ["GET", `/forms/mgl-club/my-companies/${id}/posts`],
  ["POST", `/forms/mgl-club/my-companies/${id}/posts`],
  ["PATCH", `/forms/mgl-club/my-companies/${id}/posts/${id}`],
];
test("anonymous users, company owners and sub-admins cannot enter any content management route", async () => {
  let accessed = false;
  for (const key of ["findFirst", "findMany", "create", "update", "updateMany"])
    stub(prisma.formResponse, key, async () => {
      accessed = true;
      throw new Error("unexpected storage access");
    });
  for (const role of [
    null,
    "CUSTOMER",
    "ORG_ADMIN",
    "OWNER",
    "HR_ADMIN",
    "CONTENT_ADMIN",
    "PARTNER_ADMIN",
  ]) {
    for (const [method, path] of endpoints) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: role ? { Authorization: `Bearer ${token(role)}` } : {},
      });
      assert.equal(
        response.status,
        role ? 403 : 401,
        `${role} ${method} ${path}`,
      );
    }
  }
  assert.equal(accessed, false);
});
test("both full administrator roles can list all companies independently of owner", async () => {
  stub(
    prisma.formResponse,
    "findMany",
    async (args: { where: Record<string, unknown> }) => {
      assert.equal(args.where.data, undefined);
      return [];
    },
  );
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const response = await fetch(`${base}/forms/mgl-club/my-companies`, {
      headers: { Authorization: `Bearer ${token(role)}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { companies: [] });
  }
});
test("content admins cannot bypass restrictions by updating or deleting club forms and responses", async () => {
  stub(prisma.form, "findUnique", async () => ({ slug: "mgl-club" }));
  stub(prisma.formResponse, "findUnique", async () => ({
    form: { slug: "mgl-club-posts" },
  }));
  for (const [method, path] of [
    ["PUT", `/admin/forms/${id}`],
    ["DELETE", `/admin/forms/${id}`],
    ["DELETE", `/admin/form-responses/${id}`],
  ]) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token("CONTENT_ADMIN")}` },
    });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
});

test("unrelated forms retain content administrators' existing permissions", async () => {
  stub(prisma.form, "findUnique", async () => ({ slug: "other-form" }));
  stub(prisma.form, "update", async () => ({ id, title: "Updated" }));
  const response = await fetch(`${base}/admin/forms/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token("CONTENT_ADMIN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Updated" }),
  });
  assert.equal(response.status, 200);
});
