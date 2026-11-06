import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { uploadReelOutput } from "./output-storage";

test("large output uses bounded chunks and recovers a committed PATCH with a lost reply", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "reel-output-"));
  const file = path.join(folder, "video.mp4");
  const source = Buffer.alloc(13 * 1024 * 1024 + 17, 42);
  await fs.writeFile(file, source);
  let committed = 0;
  let heads = 0;
  let lost = false;
  const sizes: number[] = [];
  const send: typeof fetch = async (_url, options) => {
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("authorization"), "Bearer server-only");
    if (options?.method === "POST") {
      assert.equal(headers.get("upload-length"), String(source.length));
      return new Response(null, {
        status: 201,
        headers: { location: "/storage/v1/upload/resumable/test" },
      });
    }
    if (options?.method === "HEAD") {
      heads++;
      return new Response(null, {
        headers: { "upload-offset": String(committed) },
      });
    }
    const chunk = options?.body as Buffer;
    assert.ok(chunk.length <= 6 * 1024 * 1024);
    assert.equal(Number(headers.get("upload-offset")), committed);
    assert.deepEqual(
      chunk,
      source.subarray(committed, committed + chunk.length),
    );
    sizes.push(chunk.length);
    committed += chunk.length;
    if (!lost) {
      lost = true;
      throw new Error("Lost acknowledgement");
    }
    return new Response(null, {
      status: 204,
      headers: { "upload-offset": String(committed) },
    });
  };
  try {
    await uploadReelOutput({
      file,
      bucket: "private-reels",
      path: "users/test/video.mp4",
      endpoint: "https://storage.example/storage/v1/upload/resumable",
      serviceKey: "server-only",
      send,
    });
    assert.equal(committed, source.length);
    assert.equal(heads, 1);
    assert.equal(sizes.length, 3);
    await assert.rejects(
      uploadReelOutput({
        file,
        bucket: "reels",
        path: "test.mp4",
        endpoint: "https://storage.example/storage/v1/upload/resumable",
        serviceKey: "secret",
        send: async () =>
          new Response(null, {
            status: 201,
            headers: { location: "https://other.example/steal" },
          }),
      }),
      /Unexpected reel storage origin/,
    );
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
