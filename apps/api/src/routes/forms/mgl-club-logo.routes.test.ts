import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import sharp from "sharp";
import { createClubLogoRouter } from "./mgl-club-logo.routes";
let server: Server;
let base: string;
let stored: Buffer | null;
let failStorage = false;
const url =
  "/api/forms/mgl-club/logos/00000000-0000-4000-8000-000000000000.webp";
beforeEach(async () => {
  stored = null;
  failStorage = false;
  const app = express();
  app.use(
    createClubLogoRouter(async (name, content) => {
      assert.match(name, /^[0-9a-f-]{36}\.webp$/);
      if (failStorage) throw new Error("offline");
      stored = content;
      return url;
    }),
  );
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club/logos`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
async function image() {
  return sharp({
    create: { width: 800, height: 400, channels: 3, background: "#24508a" },
  })
    .png()
    .toBuffer();
}
function upload(
  content: Buffer,
  mime = "image/png",
  role: string | null = "ADMIN",
) {
  const body = new FormData();
  body.append(
    "logo",
    new Blob([new Uint8Array(content)], { type: mime }),
    "photo.png",
  );
  return fetch(base, {
    method: "POST",
    body,
    headers: role
      ? {
          Authorization: `Bearer ${jwt.sign({ userId: "test-user", role, email: "test@example.test" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
        }
      : {},
  });
}

test("preserves a wide logo's aspect ratio and removes metadata", async () => {
  const response = await upload(await image());
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { url });
  assert.ok(stored);
  const metadata = await sharp(stored).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 160);
  assert.equal(metadata.exif, undefined);
});
test("rejects invalid and oversized content before storage", async () => {
  assert.equal((await upload(Buffer.from("not an image"))).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 400);
  assert.equal(stored, null);
});
test("returns a retryable storage failure", async () => {
  failStorage = true;
  assert.equal((await upload(await image())).status, 503);
});

test("logo upload requires authentication and accepts each signed-in role", async () => {
  const content = await image();
  assert.equal((await upload(content, "image/png", null)).status, 401);
  assert.equal(stored, null);
  for (const role of [
    "CUSTOMER",
    "OWNER",
    "ORG_ADMIN",
    "HR_ADMIN",
    "CONTENT_ADMIN",
    "PARTNER_ADMIN",
    "ADMIN",
    "SUPER_ADMIN",
  ])
    assert.equal((await upload(content, "image/png", role)).status, 201, role);
});
