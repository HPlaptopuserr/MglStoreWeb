import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express, { type Request, type RequestHandler } from "express";
import { prisma, type ChatApp } from "@mgl/database";
import { createDmRouter } from "./dm.routes";
import type { AuthPayload } from "../../middleware/auth";

const authenticate: RequestHandler = (req, res, next) => {
  if (req.headers.authorization !== "test") return void res.sendStatus(401);
  (req as Request & { user: AuthPayload }).user = {
    userId: "member",
    email: "",
    role: "CUSTOMER",
  };
  next();
};

test("app namespaces isolate lists, counters, calls, creation, attachments and every conversation operation", async (t) => {
  const scopes: ChatApp[] = [];
  const db = {
    conversation: {
      findFirst: async ({
        where,
      }: {
        where: { id?: string; app: ChatApp };
      }) => {
        scopes.push(where.app);
        return where.id === `${where.app}-chat` ? { id: where.id } : null;
      },
      create: async ({ data }: { data: { app: ChatApp } }) => ({
        id: `${data.app}-new`,
      }),
    },
    conversationParticipant: {
      findMany: async ({
        where,
      }: {
        where: { conversation: { app: ChatApp } };
      }) => {
        scopes.push(where.conversation.app);
        return [];
      },
      update: async () => ({}),
    },
    pushToken: {
      upsert: async ({
        create,
        update,
      }: {
        create: { app: ChatApp };
        update: { app: ChatApp };
      }) => {
        scopes.push(create.app, update.app);
        return {};
      },
      deleteMany: async ({ where }: { where: { app: ChatApp } }) => {
        scopes.push(where.app);
        return { count: 1 };
      },
    },
    user: { findUnique: async () => ({ id: "peer", isActive: true }) },
    directMessage: {
      findMany: async ({
        where,
      }: {
        where: { conversation: { app: ChatApp } };
      }) => {
        scopes.push(where.conversation.app);
        return [];
      },
      findFirst: async ({
        where,
      }: {
        where: { conversation: { app: ChatApp } };
      }) => {
        scopes.push(where.conversation.app);
        return null;
      },
    },
  } as unknown as typeof prisma;
  const serverApp = express();
  serverApp.use(express.json());
  serverApp.use("/api", createDmRouter("BUSINESS", db, authenticate));
  serverApp.use("/api/store", createDmRouter("STORE", db, authenticate));
  const server = serverApp.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const app of ["STORE", "BUSINESS"] as const) {
    const prefix = app === "STORE" ? "/api/store/dm" : "/api/dm";
    const request = (path: string, method = "GET", body?: object) =>
      fetch(root + prefix + path, {
        method,
        headers: { authorization: "test", "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    scopes.length = 0;
    assert.equal(
      (
        await request("/push-token", "POST", {
          token: "test-token",
          platform: "android",
        })
      ).status,
      204,
    );
    assert.equal(
      (await request("/push-token", "DELETE", { token: "test-token" })).status,
      204,
    );
    assert.equal((await request("/conversations")).status, 200);
    assert.equal((await request("/unread-count")).status, 200);
    assert.equal((await request("/calls/incoming")).status, 200);
    assert.equal((await request("/uploads/foreign.png")).status, 404);
    const created = await request("/conversations", "POST", {
      recipientId: "peer",
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).conversationId, `${app}-new`);
    const foreign = app === "STORE" ? "BUSINESS-chat" : "STORE-chat";
    for (const [method, suffix] of [
      ["GET", ""],
      ["GET", "/messages"],
      ["GET", "/media"],
      ["POST", "/messages"],
      ["POST", "/file"],
      ["POST", "/voice"],
      ["PATCH", "/read"],
      ["PATCH", "/request/accept"],
      ["PATCH", "/request/decline"],
      ["POST", "/participants"],
      ["PATCH", "/participants/peer/role"],
      ["DELETE", "/participants/me"],
    ]) {
      assert.equal(
        (await request(`/conversations/${foreign}${suffix}`, method)).status,
        404,
        `${app}: ${method} ${suffix}`,
      );
    }
    assert.equal(
      (await request(`/conversations/${app}-chat/read`, "PATCH")).status,
      200,
    );
    assert.ok(scopes.length > 15);
    assert.ok(scopes.every((scope) => scope === app));
    assert.equal(
      (
        await fetch(root + prefix + "/conversations/foreign/read", {
          method: "PATCH",
        })
      ).status,
      401,
    );
  }
});

test("Store people search is mounted, authenticated and searches active people by name or phone", async (t) => {
  const seen: unknown[] = [];
  const db = {
    user: {
      findMany: async (query: { where: unknown; take: number }) => {
        seen.push(query.where);
        assert.equal(query.take, 20);
        return [
          {
            id: "peer",
            email: "peer@example.com",
            profile: {
              fullName: "Амина",
              phoneNumber: "99112233",
              avatarUrl: null,
            },
          },
        ];
      },
    },
  } as unknown as typeof prisma;
  const app = express();
  app.use("/api/store", createDmRouter("STORE", db, authenticate));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/store/dm/users/search`;
  assert.equal((await fetch(url + "?q=Амина")).status, 401);
  assert.equal(
    (await fetch(url + "?q=a", { headers: { authorization: "test" } })).status,
    400,
  );
  for (const query of [" Амина ", "9911", "Өлзий"]) {
    const response = await fetch(url + "?q=" + encodeURIComponent(query), {
      headers: { authorization: "test" },
    });
    assert.equal(response.status, 200);
    const people = (await response.json()) as Array<{
      id: string;
      fullName: string;
    }>;
    assert.equal(people[0].fullName, "Амина");
    assert.deepEqual(seen.at(-1), {
      id: { not: "member" },
      isActive: true,
      deletedAt: null,
      OR: [
        { email: { contains: query.trim(), mode: "insensitive" } },
        {
          profile: {
            fullName: { contains: query.trim(), mode: "insensitive" },
          },
        },
        { profile: { phoneNumber: { contains: query.trim() } } },
      ],
    });
  }
});
