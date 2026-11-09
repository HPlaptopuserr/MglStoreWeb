import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCommunityPhoto } from "./prepare-community-photo";
test("phone photos over 5 MB and HEIC are accepted for local compression", () => {
  assert.doesNotThrow(() =>
    validateCommunityPhoto({
      name: "camera.jpg",
      type: "image/jpeg",
      size: 12 * 1024 * 1024,
    }),
  );
  assert.doesNotThrow(() =>
    validateCommunityPhoto({
      name: "IMG.HEIC",
      type: "image/heic",
      size: 4 * 1024 * 1024,
    }),
  );
  assert.doesNotThrow(() =>
    validateCommunityPhoto({ name: "camera.JPG", type: "", size: 1 }),
  );
});
test("non-image, empty and oversized files are rejected before decoding", () => {
  for (const file of [
    { name: "image.svg", type: "image/svg+xml", size: 1 },
    { name: "empty.jpg", type: "image/jpeg", size: 0 },
    { name: "large.jpg", type: "image/jpeg", size: 31 * 1024 * 1024 },
  ])
    assert.throws(() => validateCommunityPhoto(file));
});
