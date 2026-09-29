import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import express, { type Request, type RequestHandler } from "express";
import { createReelSocialRouter } from "./reel-social.routes";
import {
  assertChatShareAccess,
  ReelSocialError,
} from "../../services/reel-social/access";
import type { AuthPayload } from "../../middleware/auth";

test("share access requires membership and accepted direct recipients", () => {
  const member = { userId: "a", status: "ACCEPTED" };
  assert.throws(() => assertChatShareAccess("a", null), ReelSocialError);
  assert.throws(
    () =>
      assertChatShareAccess("b", { type: "DIRECT", participants: [member] }),
    ReelSocialError,
  );
  assert.throws(
    () =>
      assertChatShareAccess("a", {
        type: "DIRECT",
        participants: [member, { userId: "b", status: "PENDING" }],
      }),
    ReelSocialError,
  );
  assert.doesNotThrow(() =>
    assertChatShareAccess("a", {
      type: "DIRECT",
      participants: [member, { userId: "b", status: "ACCEPTED" }],
    }),
  );
});

test("social endpoints validate input, authentication, and preserve authenticated identity", async (t) => {
  const app = express();
  app.use(express.json());
  const auth: RequestHandler = (req, res, next) => {
    if (req.headers.authorization !== "test") {
      res.sendStatus(401);
      return;
    }
    (req as Request & { user: AuthPayload }).user = {
      userId: "owner",
      email: "",
      role: "CUSTOMER",
    };
    next();
  };
  const calls: string[][] = [];
  app.use(
    "/api",
    createReelSocialRouter({
      authenticate: auth,
      optional: (_req, _res, next) => next(),
      summary: async (id) => {
        if (id === "private") throw new ReelSocialError(404, "hidden");
        return { likeCount: 2, commentCount: 0, shareCount: 0, liked: false };
      },
      comments: async () => ({ items: [], nextCursor: null }),
      add: async (id, userId, commentId, text) => {
        calls.push([id, userId, commentId, text]);
        return {
          id: commentId,
          text,
          createdAt: new Date(),
          authorId: userId,
          authorName: "Person",
          avatarUrl: null,
          isOwn: true,
        };
      },
      remove: async () => ({ ok: true }),
      share: async (id, userId, conversationId, shareId) => {
        calls.push([id, userId, conversationId, shareId]);
        return {
          id: shareId,
          conversationId,
          content: "reel",
          createdAt: new Date(),
          isOwn: true,
          type: "TEXT",
        };
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reels`;
  const post = (path: string, body: unknown, signed = true) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signed ? { authorization: "test" } : {}),
      },
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(base + "/private/social")).status, 404);
  const publicSummary = await fetch(base + "/public/social");
  assert.equal(publicSummary.status, 200);
  assert.equal(publicSummary.headers.get("cache-control"), "private, no-store");
  assert.equal((await post("/r/comments", {}, false)).status, 401);
  assert.equal((await post("/r/share", {}, false)).status, 401);
  const id = randomUUID();
  for (const text of ["", " ", "x".repeat(1001)])
    assert.equal(
      (await post("/r/comments", { text, commentId: id })).status,
      400,
    );
  assert.equal(
    (await post("/r/comments", { text: "Hello", commentId: "bad" })).status,
    400,
  );
  assert.equal(
    (
      await post("/r/comments", {
        text: " Hello ",
        commentId: id,
        userId: "spoof",
      })
    ).status,
    200,
  );
  assert.deepEqual(calls.at(-1), ["r", "owner", id, "Hello"]);
  assert.equal(
    (await post("/r/share", { shareId: id, conversationId: "../foreign" }))
      .status,
    400,
  );
  assert.equal(
    (
      await post("/r/share", {
        shareId: id,
        conversationId: "chat_1",
        userId: "spoof",
      })
    ).status,
    200,
  );
  assert.deepEqual(calls.at(-1), ["r", "owner", "chat_1", id]);
  assert.equal((await fetch(base + "/r/comments?cursor=invalid")).status, 400);
});
