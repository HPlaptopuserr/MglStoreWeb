import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { prisma } from "@mgl/database";
import { createClubWebsiteMediaRouter } from "./mgl-club-website-media.routes";
const companyId = "00000000-0000-4000-8000-000000000001";
const token = jwt.sign(
  { userId: "system-admin", email: "admin@example.test", role: "ADMIN" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
let server: Server,
  base: string,
  stored: Buffer | null,
  owner: string,
  previous: unknown;
beforeEach(async () => {
  stored = null;
  owner = "owner";
  previous = Reflect.get(prisma.formResponse, "findFirst");
  Reflect.set(prisma.formResponse, "findFirst", async () => ({
    data: { ownerUserId: owner },
  }));
  const app = express();
  app.use(
    createClubWebsiteMediaRouter(async (name, bytes) => {
      assert.match(name, /^[0-9a-f-]{36}\.webp$/);
      stored = bytes;
      return `/api/forms/mgl-club/website-images/${name}`;
    }),
  );
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club/my-companies/${companyId}/website/images`;
});
afterEach(async () => {
  Reflect.set(prisma.formResponse, "findFirst", previous);
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
function upload(bytes: Buffer, auth: boolean | string = true) {
  const body = new FormData();
  body.append(
    "image",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    "image.png",
  );
  return fetch(base, {
    method: "POST",
    headers: auth
      ? { Authorization: `Bearer ${typeof auth === "string" ? auth : token}` }
      : {},
    body,
  });
}
const customerToken = jwt.sign(
  { userId: "owner", email: "owner@example.test", role: "CUSTOMER" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
test("website media requires a system administrator before storing content", async () => {
  assert.equal((await upload(Buffer.from("bad"), false)).status, 401);
  owner = "another-owner";
  assert.equal((await upload(Buffer.from("bad"), customerToken)).status, 403);
  assert.equal(stored, null);
});
test("website images preserve aspect ratio and resize to a bounded WebP", async () => {
  const image = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#0f3e2e" },
  })
    .png()
    .toBuffer();
  const response = await upload(image);
  assert.equal(response.status, 201);
  assert.ok(stored);
  const meta = await sharp(stored).metadata();
  assert.equal(meta.width, 1920);
  assert.equal(meta.height, 960);
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined);
});
test("invalid image content never reaches storage", async () => {
  assert.equal(
    (
      await upload(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        ),
      )
    ).status,
    400,
  );
  assert.equal((await upload(Buffer.from("not an image"))).status, 400);
  assert.equal(stored, null);
});
