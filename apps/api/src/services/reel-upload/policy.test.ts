import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  expectedPartSize,
  verifiedParts,
  REEL_PART_BYTES,
  REEL_SOURCE_MAX_BYTES,
} from "./policy";
import { parseNewReelUpload } from "./sessions";

test("files above 50 MB are accepted as bounded source parts, with an exact final part", () => {
  const size = 76 * 1024 * 1024 + 17;
  const value = parseNewReelUpload({
    uploadId: randomUUID(),
    fileName: "clip.mov",
    mimeType: "video/quicktime",
    sizeBytes: size,
  });
  assert.equal(value.sizeBytes, size);
  assert.equal(expectedPartSize(size, 0), REEL_PART_BYTES);
  assert.equal(expectedPartSize(size, 19), 17);
  assert.deepEqual(
    verifiedParts(size, [
      { index: 0, size: REEL_PART_BYTES },
      { index: 1, size: 12 },
      { index: 19, size: 17 },
      { index: 99, size: 1 },
    ]),
    [0, 19],
  );
  assert.throws(() => expectedPartSize(size, -1));
  assert.throws(() => expectedPartSize(size, 20));
});

test("large 4K source metadata above one GiB is accepted without allocating file bytes", () => {
  const size = 1536 * 1024 * 1024;
  assert.equal(
    parseNewReelUpload({
      uploadId: randomUUID(),
      fileName: "4k.mov",
      mimeType: "video/quicktime",
      sizeBytes: size,
    }).sizeBytes,
    size,
  );
  assert.equal(expectedPartSize(size, 383), REEL_PART_BYTES);
});

test("invalid source and metadata cannot create upload sessions", () => {
  const input = {
    uploadId: randomUUID(),
    fileName: "clip.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1000,
  };
  for (const patch of [
    { sizeBytes: REEL_SOURCE_MAX_BYTES + 1 },
    { sizeBytes: 0 },
    { mimeType: "text/html" },
    { visibility: "ORGANIZATION" },
    { title: "a".repeat(121) },
  ]) {
    assert.throws(() => parseNewReelUpload({ ...input, ...patch }));
  }
});
