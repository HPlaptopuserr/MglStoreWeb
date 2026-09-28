import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type Request } from "express";
import { createPersonalReelsRouter } from "./personal-reels.routes";
import type { AuthPayload } from "../../middleware/auth";
import type {
  CreateReelInput,
  ListReelsInput,
} from "../../services/reel.service";

const owner = { userId: "customer-1", email: "", role: "CUSTOMER" };
const mp4 = new Uint8Array([
  0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109,
]);
function form(id = randomUUID(), bytes = mp4, mime = "video/mp4") {
  const body = new FormData();
  body.append("video", new Blob([bytes], { type: mime }), "clip.mp4");
  body.append("uploadId", id);
  body.append("title", "My reel");
  body.append("durationSeconds", "30");
  body.append("authorId", "attacker-choice");
  body.append("organizationId", "foreign-org");
  return body;
}

async function setup() {
  const created: CreateReelInput[] = [];
  const listed: ListReelsInput[] = [];
  const records = new Map<
    string,
    {
      id: string;
      authorId: string | null;
      organizationId: string | null;
      deletedAt: Date | null;
    }
  >();
  let stored = 0;
  let discarded = 0;
  let failCreate = false;
  let failAfterCommit = false;
  let failRecoveryLookup = false;
  const privateUploads: boolean[] = [];
  const deleted: string[] = [];
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createPersonalReelsRouter({
      authenticate: (req, res, next) => {
        if (req.headers.authorization !== "Bearer test") {
          res.sendStatus(401);
          return;
        }
        (req as Request & { user: AuthPayload }).user = owner;
        next();
      },
      list: async (input) => {
        listed.push(input);
        return { items: [], nextCursor: null };
      },
      find: async (id) => {
        if (failRecoveryLookup && records.has(id))
          throw new Error("lookup unavailable");
        return records.get(id) ?? null;
      },
      get: async (id) => ({ ...records.get(id), reviewStatus: "PENDING" }),
      create: async (input) => {
        if (failCreate) throw new Error("database unavailable");
        created.push(input);
        const record = {
          id: input.id!,
          authorId: input.authorId,
          organizationId: input.organizationId ?? null,
          deletedAt: null,
        };
        records.set(record.id, record);
        if (failAfterCommit) throw new Error("signing unavailable");
        return {
          ...record,
          fileSizeBytes: input.fileSizeBytes,
          reviewStatus: "PENDING",
        };
      },
      store: async (input) => {
        stored++;
        privateUploads.push(input.private === true);
        assert.equal(input.authorId, owner.userId);
        assert.equal(input.organizationId, undefined);
        return {
          url: "https://media.example/clip.mp4",
          storageBucket: "reels",
          storagePath: "users/customer-1/clip.mp4",
          storageProvider: "supabase",
        };
      },
      discard: async () => {
        discarded++;
      },
      remove: async (id) => {
        deleted.push(id);
        return { id };
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/me/reels`;
  return {
    url,
    created,
    listed,
    records,
    deleted,
    privateUploads,
    failRecovery() {
      failAfterCommit = true;
      failRecoveryLookup = true;
    },
    failSigning() {
      failAfterCommit = true;
    },
    get stored() {
      return stored;
    },
    get discarded() {
      return discarded;
    },
    fail() {
      failCreate = true;
    },
    request: (path = "", init: RequestInit = {}) =>
      fetch(url + path, {
        ...init,
        headers: { Authorization: "Bearer test", ...init.headers },
      }),
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}

test("personal uploads require login, use authenticated ownership and retry without duplicates", async () => {
  const app = await setup();
  try {
    assert.equal(
      (await fetch(app.url, { method: "POST", body: form() })).status,
      401,
    );
    assert.equal(app.stored, 0);
    const id = randomUUID();
    const first = await app.request("", { method: "POST", body: form(id) });
    assert.equal(first.status, 201);
    assert.equal((await first.json()).fileSizeBytes, "12");
    assert.equal(app.created[0]?.authorId, owner.userId);
    assert.equal(app.created[0]?.organizationId, null);
    const retry = await app.request("", { method: "POST", body: form(id) });
    assert.equal(retry.status, 200);
    assert.equal(app.created.length, 1);
    assert.equal(app.stored, 1);
  } finally {
    app.close();
  }
});

test("own list cannot be redirected to another author and includes review statuses", async () => {
  const app = await setup();
  try {
    const result = await app.request("?authorId=someone-else&limit=10");
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "private, no-store");
    assert.equal(app.listed[0]?.authorId, owner.userId);
    assert.equal(app.listed[0]?.organizationId, null);
    assert.equal(app.listed[0]?.includePending, true);
    assert.equal(app.listed[0]?.includePrivate, true);
    const capabilities = await app.request("/capabilities");
    assert.equal((await capabilities.json()).maxBytes, 50 * 1024 * 1024);
  } finally {
    app.close();
  }
});

test("invalid files and duration are rejected before storage", async () => {
  const app = await setup();
  try {
    const invalidDuration = form();
    invalidDuration.set("durationSeconds", "181");
    for (const body of [
      form(randomUUID(), new Uint8Array([1, 2, 3])),
      form(randomUUID(), mp4, "image/png"),
      invalidDuration,
    ]) {
      assert.equal(
        (await app.request("", { method: "POST", body })).status,
        400,
      );
    }
    assert.equal((await app.request("", { method: "POST" })).status, 400);
    assert.equal(app.stored, 0);
  } finally {
    app.close();
  }
});

test("foreign, deleted and organization-owned reels cannot be removed or reused by an individual", async () => {
  const app = await setup();
  try {
    for (const variation of [
      { authorId: "another-user", organizationId: null, deletedAt: null },
      { authorId: owner.userId, organizationId: "business", deletedAt: null },
      { authorId: owner.userId, organizationId: null, deletedAt: new Date() },
    ]) {
      const id = randomUUID();
      app.records.set(id, { id, ...variation });
      assert.equal(
        (await app.request(`/${id}`, { method: "DELETE" })).status,
        404,
      );
      assert.equal(
        (await app.request("", { method: "POST", body: form(id) })).status,
        409,
      );
    }
    assert.equal(app.deleted.length, 0);
    const id = randomUUID();
    app.records.set(id, {
      id,
      authorId: owner.userId,
      organizationId: null,
      deletedAt: null,
    });
    assert.equal(
      (await app.request(`/${id}`, { method: "DELETE" })).status,
      200,
    );
    assert.deepEqual(app.deleted, [id]);
  } finally {
    app.close();
  }
});

test("failed creation removes the orphaned video and returns a recoverable error", async () => {
  const app = await setup();
  try {
    app.fail();
    assert.equal(
      (await app.request("", { method: "POST", body: form() })).status,
      500,
    );
    assert.equal(app.stored, 1);
    assert.equal(app.discarded, 1);
    assert.equal(app.created.length, 0);
  } finally {
    app.close();
  }
});

test("private uploads require private storage and reject unsupported audiences", async () => {
  const app = await setup();
  try {
    const body = form();
    body.set("visibility", "PRIVATE");
    assert.equal((await app.request("", { method: "POST", body })).status, 201);
    assert.deepEqual(app.privateUploads, [true]);
    assert.equal(app.created[0]?.visibility, "PRIVATE");
    const invalid = form();
    invalid.set("visibility", "ORGANIZATION");
    assert.equal(
      (await app.request("", { method: "POST", body: invalid })).status,
      400,
    );
    assert.equal(app.stored, 1);
  } finally {
    app.close();
  }
});

test("a response signing failure after commit never deletes the stored clip", async () => {
  const app = await setup();
  try {
    app.failSigning();
    assert.equal(
      (await app.request("", { method: "POST", body: form() })).status,
      200,
    );
    assert.equal(app.created.length, 1);
    assert.equal(app.discarded, 0);
  } finally {
    app.close();
  }
});

test("uncertain recovery never deletes a committed video", async (t) => {
  const state = await setup();
  t.after(state.close);
  state.failRecovery();
  const response = await fetch(state.url, {
    method: "POST",
    headers: { authorization: "Bearer test" },
    body: form(),
  });
  assert.equal(response.status, 503);
  assert.equal(state.records.size, 1);
  assert.equal(state.discarded, 0);
});
