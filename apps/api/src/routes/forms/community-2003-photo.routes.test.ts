import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import sharp from "sharp";
import { createCommunityPhotoRouter } from "./community-2003-photo.routes";
import {
  parseCommunityResponse,
  toPublicCommunityMember,
} from "./community-2003";
import { COMMUNITY_PHOTO_MAX_BYTES } from "./community-2003-photo";

let server: Server;
let base: string;
let stored: Buffer | null;
let failStorage = false;
const url = "/api/forms/2003/photos/00000000-0000-4000-8000-000000000000.webp";
beforeEach(async () => {
  stored = null;
  failStorage = false;
  const app = express();
  app.use(
    createCommunityPhotoRouter(async (name, content) => {
      assert.match(name, /^[0-9a-f-]{36}\.webp$/);
      if (failStorage) throw new Error("offline");
      stored = content;
      return url;
    }),
  );
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/2003/photos`;
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
function upload(content: Buffer, mime = "image/png") {
  const body = new FormData();
  body.append(
    "photo",
    new Blob([new Uint8Array(content)], { type: mime }),
    "photo.png",
  );
  return fetch(base, { method: "POST", body });
}
test("stores a resized WebP and persists its URL in the public profile", async () => {
  const response = await upload(await image());
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { url });
  assert.ok(stored);
  const metadata = await sharp(stored).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width && metadata.width <= 640);
  assert.equal(metadata.height, metadata.width);
  assert.equal(metadata.exif, undefined);
  const profile = {
    name: "Member",
    profession: "Engineer",
    phone: "99112233",
    business: "no",
    consent: "yes",
    publishConsent: "yes",
    photoUrl: url,
  };
  assert.equal(toPublicCommunityMember("member", profile)?.photoUrl, url);
  assert.equal(
    parseCommunityResponse({ ...profile, photoUrl: "" })?.photoUrl,
    "",
  );
  assert.equal(
    parseCommunityResponse({ ...profile, photoUrl: "javascript:alert(1)" }),
    null,
  );
  assert.equal(
    parseCommunityResponse({
      ...profile,
      photoUrl: "https://untrusted.example/photo.jpg",
    }),
    null,
  );
});
test("rejects corrupt, oversized and disguised SVG files before storage", async () => {
  assert.equal((await upload(Buffer.from("not an image"))).status, 400);
  assert.equal(
    (await upload(Buffer.alloc(COMMUNITY_PHOTO_MAX_BYTES + 1))).status,
    400,
  );
  assert.equal(
    (
      await upload(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" /></svg>',
        ),
      )
    ).status,
    400,
  );
  assert.equal(stored, null);
});
test("reports storage failure and missing photos without a successful URL", async () => {
  failStorage = true;
  assert.equal((await upload(await image())).status, 503);
  assert.equal(
    (await fetch(base, { method: "POST", body: new FormData() })).status,
    400,
  );
});
