import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { parseMglClubPost } from "@mgl/types";
import { createClubPostsRouter } from "./mgl-club-posts.routes";
let server: Server, base: string;
const companyId = "00000000-0000-4000-8000-000000000001";
const postId = "00000000-0000-4000-8000-000000000002";
const token = jwt.sign(
  { userId: "system-admin", role: "ADMIN", email: "admin@example.test" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
const profile = {
  ownerUserId: "owner",
  name: "Бат",
  businessName: "Компани",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Танилцуулга",
  offers: "Бараа",
  phone: "99112233",
  consent: "yes",
};
const input = {
  title: " Шинэ үйлчилгээ ",
  body: " Мэдээний агуулга ",
  published: true,
};
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
before(async () => {
  const app = express();
  app.use(express.json(), createClubPostsRouter());
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
function request(
  path: string,
  data: unknown,
  method = "POST",
  authenticated: boolean | string = true,
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated
        ? {
            Authorization: `Bearer ${typeof authenticated === "string" ? authenticated : token}`,
          }
        : {}),
    },
    body: JSON.stringify(data),
  });
}
test("post input is bounded, trims whitespace and ignores client ownership fields", () => {
  assert.deepEqual(parseMglClubPost({ ...input, ownerUserId: "attacker" }), {
    title: "Шинэ үйлчилгээ",
    body: "Мэдээний агуулга",
    published: true,
  });
  for (const change of [
    { title: " " },
    { body: "" },
    { title: "a".repeat(161) },
    { body: "a".repeat(12001) },
    { published: "true" },
  ])
    assert.equal(parseMglClubPost({ ...input, ...change }), null);
});
const customerToken = jwt.sign(
  { userId: "owner", email: "owner@example.test", role: "CUSTOMER" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
test("anonymous and unrelated accounts cannot publish", async () => {
  assert.equal(
    (await request(`/my-companies/${companyId}/posts`, input, "POST", false))
      .status,
    401,
  );
  stub(
    prisma.formResponse,
    "findFirst",
    async (args: { where: { data: unknown } }) => {
      assert.deepEqual(args.where.data, {
        path: ["ownerUserId"],
        equals: "owner",
      });
      return null;
    },
  );
  assert.equal(
    (
      await request(
        `/my-companies/${companyId}/posts`,
        input,
        "POST",
        customerToken,
      )
    ).status,
    403,
  );
});
test("public feed filters drafts in storage and exposes only public post fields", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id: companyId,
    data: profile,
  }));
  stub(
    prisma.formResponse,
    "findMany",
    async (args: { where: { AND: unknown[] } }) => {
      assert.deepEqual(args.where.AND, [
        { data: { path: ["companyId"], equals: companyId } },
        { data: { path: ["published"], equals: true } },
      ]);
      return [
        {
          id: postId,
          submittedAt: new Date("2026-11-15T00:00:00Z"),
          data: {
            ...input,
            companyId,
            ownerUserId: "private",
            paymentTokenHash: "secret",
          },
        },
      ];
    },
  );
  const response = await fetch(`${base}/members/${companyId}/posts`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.posts.length, 1);
  assert.equal(body.posts[0].title, "Шинэ үйлчилгээ");
  assert.equal(body.posts[0].ownerUserId, undefined);
  assert.equal(body.posts[0].paymentTokenHash, undefined);
});
test("system administrator saves drafts without trusting client company or timestamps", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id: companyId,
    data: profile,
  }));
  stub(prisma.form, "upsert", async () => ({
    id: "blog-form",
    isActive: true,
  }));
  stub(
    prisma.formResponse,
    "create",
    async (args: {
      data: { formId: string; data: Record<string, unknown> };
    }) => {
      assert.equal(args.data.formId, "blog-form");
      assert.equal(args.data.data.companyId, companyId);
      assert.equal(args.data.data.published, false);
      assert.notEqual(args.data.data.updatedAt, "client-date");
      return { id: postId, submittedAt: new Date(), data: args.data.data };
    },
  );
  assert.equal(
    (
      await request(`/my-companies/${companyId}/posts`, {
        ...input,
        published: false,
        companyId: "spoofed",
        updatedAt: "client-date",
      })
    ).status,
    201,
  );
});
test("administrator edits remain scoped to the requested company", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id: companyId,
    data: profile,
  }));
  stub(prisma.form, "upsert", async () => ({
    id: "blog-form",
    isActive: true,
  }));
  stub(
    prisma.formResponse,
    "updateMany",
    async (args: { where: { id: string; formId: string; data: unknown } }) => {
      assert.equal(args.where.id, postId);
      assert.deepEqual(args.where.data, {
        path: ["companyId"],
        equals: companyId,
      });
      return { count: 0 };
    },
  );
  assert.equal(
    (
      await request(
        `/my-companies/${companyId}/posts/${postId}`,
        input,
        "PATCH",
      )
    ).status,
    404,
  );
});
test("another account cannot claim an owned company even with a registration token", async () => {
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      formResponse: {
        findFirst: async () => ({
          data: {
            ...profile,
            ownerUserId: "another-owner",
            paymentTokenHash: createHash("sha256")
              .update("a".repeat(64))
              .digest("hex"),
          },
        }),
      },
    }),
  );
  assert.equal(
    (
      await request(`/members/${companyId}/claim`, {
        paymentToken: "a".repeat(64),
      })
    ).status,
    403,
  );
});

test("generic public form submission cannot bypass company blog ownership", async () => {
  const response = await fetch(`${base}-posts/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { ...input, companyId } }),
  });
  assert.equal(response.status, 403);
});

test("owners create their own posts while spoofed ownership and company fields are ignored", async () => {
  stub(
    prisma.formResponse,
    "findFirst",
    async (args: { where: { data?: unknown } }) => {
      if (args.where.data)
        assert.deepEqual(args.where.data, {
          path: ["ownerUserId"],
          equals: "owner",
        });
      return { id: companyId, data: profile };
    },
  );
  stub(prisma.form, "upsert", async () => ({
    id: "blog-form",
    isActive: true,
  }));
  stub(
    prisma.formResponse,
    "create",
    async (args: { data: { data: Record<string, unknown> } }) => {
      assert.equal(args.data.data.companyId, companyId);
      assert.equal(args.data.data.ownerUserId, undefined);
      return { id: postId, submittedAt: new Date(), data: args.data.data };
    },
  );
  const response = await request(
    `/my-companies/${companyId}/posts`,
    { ...input, companyId: "other-company", ownerUserId: "another-user" },
    "POST",
    customerToken,
  );
  assert.equal(response.status, 201);
});
test("owner edits cannot update a post belonging to another company", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id: companyId,
    data: profile,
  }));
  stub(prisma.form, "upsert", async () => ({
    id: "blog-form",
    isActive: true,
  }));
  stub(
    prisma.formResponse,
    "updateMany",
    async (args: { where: { data: unknown } }) => {
      assert.deepEqual(args.where.data, {
        path: ["companyId"],
        equals: companyId,
      });
      return { count: 0 };
    },
  );
  assert.equal(
    (
      await request(
        `/my-companies/${companyId}/posts/${postId}`,
        input,
        "PATCH",
        customerToken,
      )
    ).status,
    404,
  );
});
test("legacy claim assigns only the authenticated user and preserves stored company metadata", async () => {
  const paymentToken = "a".repeat(64);
  let updated = false;
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      formResponse: {
        findFirst: async () => ({
          data: {
            ...profile,
            paymentTokenHash: createHash("sha256")
              .update(paymentToken)
              .digest("hex"),
            clubSiteSlug: "existing-company",
          },
        }),
        update: async (args: { data: { data: Record<string, unknown> } }) => {
          updated = true;
          assert.equal(args.data.data.ownerUserId, "owner");
          assert.equal(args.data.data.clubSiteSlug, "existing-company");
          return {};
        },
      },
    }),
  );
  const response = await request(
    `/members/${companyId}/claim`,
    { paymentToken, ownerUserId: "spoofed" },
    "POST",
    customerToken,
  );
  assert.equal(response.status, 200);
  assert.equal(updated, true);
});
