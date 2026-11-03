import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, test } from "node:test";
import express, { type Request } from "express";
import type { AddressInfo } from "node:net";
import { prisma, type ReelUploadSession } from "@mgl/database";
import { createReelUploadsRouter } from "./reel-uploads.routes";
import type { AuthPayload } from "../../middleware/auth";
import { discardParts } from "../../services/reel-upload/staging";
import { REEL_PART_BYTES } from "../../services/reel-upload/policy";

const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => Reflect.set(target, key, previous));
}
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

test("authenticated upload scopes private parts to their owner and queues only complete media", async () => {
  stub(
    prisma,
    "$transaction",
    async (run: (transaction: typeof prisma) => Promise<unknown>) =>
      run(prisma),
  );
  let current: ReelUploadSession | null = null;
  let active = true;
  const authorId = `test-${randomUUID()}`;
  const id = randomUUID();
  stub(prisma.user, "findFirst", async () =>
    active ? { id: authorId } : null,
  );
  stub(prisma.reel, "findUnique", async () => null);
  stub(prisma.reelUploadSession, "findUnique", async () => current);
  stub(prisma.reelUploadSession, "count", async () => 0);
  stub(
    prisma.reelUploadSession,
    "create",
    async ({
      data,
    }: {
      data: Omit<
        ReelUploadSession,
        | "createdAt"
        | "updatedAt"
        | "status"
        | "leaseUntil"
        | "leaseToken"
        | "attempts"
        | "errorMessage"
      >;
    }) => {
      current = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "UPLOADING",
        leaseUntil: null,
        leaseToken: null,
        attempts: 0,
        errorMessage: null,
      };
      return current;
    },
  );
  stub(
    prisma.reelUploadSession,
    "updateMany",
    async ({
      where,
      data,
    }: {
      where: { status?: { in: string[] } };
      data: Partial<ReelUploadSession>;
    }) => {
      if (
        !current ||
        (where.status && !where.status.in.includes(current.status))
      )
        return { count: 0 };
      current = { ...current, ...data };
      return { count: 1 };
    },
  );
  const app = express();
  app.use(express.json());
  app.use(
    createReelUploadsRouter((req, res, next) => {
      const token = req.headers.authorization;
      if (!token) {
        res.sendStatus(401);
        return;
      }
      (req as Request & { user: AuthPayload }).user = {
        userId: token.replace("Bearer ", ""),
        email: "",
        role: "CUSTOMER",
      };
      next();
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = {
    Authorization: `Bearer ${authorId}`,
    "Content-Type": "application/json",
  };
  try {
    assert.equal(
      (await fetch(`${base}/reel-uploads/capabilities`)).status,
      401,
    );
    const input = {
      uploadId: id,
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      sizeBytes: REEL_PART_BYTES + 12,
      visibility: "PRIVATE",
    };
    active = false;
    assert.equal(
      (
        await fetch(`${base}/reel-uploads`, {
          method: "POST",
          headers,
          body: JSON.stringify(input),
        })
      ).status,
      401,
    );
    active = true;
    assert.equal(
      (
        await fetch(`${base}/reel-uploads`, {
          method: "POST",
          headers,
          body: JSON.stringify(input),
        })
      ).status,
      201,
    );
    for (const suffix of ["", "/parts/0", "/complete"]) {
      const result = await fetch(`${base}/reel-uploads/${id}${suffix}`, {
        method: suffix ? "POST" : "GET",
        headers: { Authorization: "Bearer attacker" },
      });
      assert.equal(result.status, 404);
    }
    assert.equal(
      (
        await fetch(`${base}/reel-uploads/${id}/complete`, {
          method: "POST",
          headers,
        })
      ).status,
      409,
    );
    for (let index = 0; index < 2; index++) {
      const result = await fetch(`${base}/reel-uploads/${id}/parts/${index}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authorId}`,
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.alloc(index === 0 ? REEL_PART_BYTES : 12),
      });
      assert.equal(result.status, 200);
    }
    const status = await fetch(`${base}/reel-uploads/${id}`, { headers });
    assert.equal(status.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(
      ((await status.json()) as { receivedParts: number[] }).receivedParts,
      [0, 1],
    );
    const queued = await fetch(`${base}/reel-uploads/${id}/complete`, {
      method: "POST",
      headers,
    });
    assert.equal(queued.status, 202);
    assert.equal(
      ((await queued.json()) as { status: string }).status,
      "QUEUED",
    );
    assert.equal(
      (
        await fetch(`${base}/reel-uploads/${id}/parts/0`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authorId}`,
            "Content-Type": "application/octet-stream",
          },
          body: Buffer.alloc(1),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(`${base}/reel-uploads/${id}/complete`, {
          method: "POST",
          headers,
        })
      ).status,
      202,
    );
  } finally {
    await discardParts(authorId, id, 2);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
