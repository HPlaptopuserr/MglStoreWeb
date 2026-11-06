import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { ffmpegPath, probeVideo, transcodeReel } from "./transcode";
import { REEL_OUTPUT_MAX_BYTES } from "./policy";
const execute = promisify(execFile);

test("a real MOV over 50 MB becomes a validated, bounded MP4 without loading the source in RAM", async () => {
  assert.ok(ffmpegPath);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-encode-test-"));
  try {
    const source = path.join(folder, "large.mov");
    const output = path.join(folder, "ready.mp4");
    await execute(
      ffmpegPath,
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1280x720:rate=30",
        "-t",
        "1",
        "-c:v",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-threads",
        "1",
        source,
      ],
      { timeout: 30000 },
    );
    // Raw 1280x720 yuv420p is ~41 MB/sec. Extend the fixture to cross 50 MB.
    if ((await fs.stat(source)).size <= 50 * 1024 * 1024) {
      await execute(
        ffmpegPath,
        [
          "-y",
          "-nostdin",
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=1280x720:rate=30",
          "-t",
          "2",
          "-c:v",
          "rawvideo",
          "-pix_fmt",
          "rgb24",
          "-threads",
          "1",
          source,
        ],
        { timeout: 30000 },
      );
    }
    assert.ok((await fs.stat(source)).size > 50 * 1024 * 1024);
    const media = await transcodeReel(source, output);
    assert.ok(media.size < REEL_OUTPUT_MAX_BYTES);
    assert.ok(media.size < (await fs.stat(source)).size / 5);
    assert.equal(media.width, 1280);
    assert.equal(media.height, 720);
    assert.ok(media.duration <= 3);
    assert.equal((await fs.readFile(output)).toString("ascii", 4, 8), "ftyp");
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("long videos retain their full duration and nonvideo input is rejected", async () => {
  assert.ok(ffmpegPath);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-invalid-video-"));
  try {
    const source = path.join(folder, "long.mp4");
    await execute(
      ffmpegPath,
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=size=16x16:rate=1",
        "-t",
        "181",
        "-c:v",
        "libx264",
        "-threads",
        "1",
        source,
      ],
      { timeout: 30000 },
    );
    assert.ok((await probeVideo(source)).duration >= 181);
    const encoded = await transcodeReel(
      source,
      path.join(folder, "long-ready.mp4"),
    );
    assert.ok(encoded.duration >= 180.9);
    await fs.writeFile(path.join(folder, "bad.mp4"), "not a video");
    await assert.rejects(
      transcodeReel(path.join(folder, "bad.mp4"), path.join(folder, "out.mp4")),
    );
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("portrait 4K 10-bit HEVC from a MOV is published as full-length 1080p H264", async () => {
  assert.ok(ffmpegPath);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-4k-hevc-"));
  try {
    const source = path.join(folder, "iphone.mov");
    await execute(
      ffmpegPath,
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=size=2160x3840:rate=2",
        "-t",
        "1",
        "-c:v",
        "libx265",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p10le",
        "-x265-params",
        "pools=1:frame-threads=1",
        "-threads",
        "1",
        source,
      ],
      { timeout: 60000 },
    );
    const media = await transcodeReel(source, path.join(folder, "ready.mp4"));
    assert.equal(media.width, 1080);
    assert.equal(media.height, 1920);
    assert.ok(media.duration >= 0.95);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
