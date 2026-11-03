import "../config/env";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { createReelUploadsRouter } from "../routes/content/reel-uploads.routes";
import { processNextReelUpload } from "../services/reel-upload/worker";
import { ffmpegPath } from "../services/reel-upload/transcode";
import { REEL_PART_BYTES } from "../services/reel-upload/policy";
import {
  discardParts,
  localReelStaging,
} from "../services/reel-upload/staging";
import { removeStoredReelVideo } from "../services/reel-storage.service";

async function main() {
  const database = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
    !localReelStaging()
  ) {
    throw new Error(
      "This diagnostic only creates disposable data in a local database and local storage.",
    );
  }
  assert.ok(ffmpegPath);
  const id = randomUUID();
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-reel-e2e-"));
  const owner = await prisma.user.create({
    data: { email: `reel-upload-check-${id}@example.invalid`, role: "USER" },
  });
  const app = express();
  app.use(express.json());
  app.use("/api", createReelUploadsRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = jwt.sign(
    { userId: owner.id, email: owner.email, role: owner.role },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "5m" },
  );
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const request = async (url: string, body?: Record<string, unknown>) => {
    const response = await fetch(`${base}${url}`, {
      headers,
      method: body ? "POST" : "GET",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = (await response.json()) as Record<string, unknown>;
    assert.ok(response.ok, `${response.status}: ${String(data.message)}`);
    return data;
  };
  try {
    const file = path.join(folder, "source.mov");
    await promisify(execFile)(
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
        file,
      ],
      { timeout: 30000 },
    );
    const size = (await fs.stat(file)).size;
    assert.ok(size > 50 * 1024 * 1024);
    const input = {
      uploadId: id,
      fileName: "source.mov",
      mimeType: "video/quicktime",
      sizeBytes: size,
      title: "Disposable local upload check",
      caption: "",
      visibility: "PUBLIC",
    };
    let state = await request("/api/reel-uploads", input);
    const count = Number(state.partCount);
    const source = await fs.open(file, "r");
    try {
      for (let index = 0; index < count; index++) {
        const start = index * REEL_PART_BYTES;
        const length = Math.min(REEL_PART_BYTES, size - start);
        const bytes = Buffer.alloc(length);
        const read = await source.read(bytes, 0, length, start);
        assert.equal(read.bytesRead, length);
        const ticket = await request(
          `/api/reel-uploads/${id}/parts/${index}`,
          {},
        );
        const result = await fetch(`${base}${String(ticket.url)}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
          },
          body: bytes,
        });
        assert.equal(result.status, 200);
        if (index === 1) {
          // Simulate a new client resuming the same upload after losing its connection.
          state = await request("/api/reel-uploads", input);
          assert.deepEqual(state.receivedParts, [0, 1]);
        }
      }
    } finally {
      await source.close();
    }
    await request(`/api/reel-uploads/${id}/complete`, {});
    for (let attempt = 0; attempt < 50; attempt++) {
      await processNextReelUpload();
      state = await request(`/api/reel-uploads/${id}`);
      if (state.status === "SUCCEEDED" || state.status === "FAILED") break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    assert.equal(state.status, "SUCCEEDED", String(state.message));
    const reel = state.reel as {
      id: string;
      mimeType: string;
      fileSizeBytes: string;
      status: string;
    };
    assert.equal(reel.id, id);
    assert.equal(reel.status, "READY");
    assert.equal(reel.mimeType, "video/mp4");
    assert.ok(Number(reel.fileSizeBytes) < 45 * 1024 * 1024);
    const retry = await request("/api/reel-uploads", input);
    assert.equal(retry.status, "SUCCEEDED");
    assert.equal(await prisma.reel.count({ where: { id } }), 1);
    console.log(
      JSON.stringify({
        sourceMiB: (size / 1024 / 1024).toFixed(2),
        outputMiB: (Number(reel.fileSizeBytes) / 1024 / 1024).toFixed(2),
        parts: count,
        resumedParts: 2,
        status: state.status,
        duplicateReels: 0,
      }),
    );
  } finally {
    const reel = await prisma.reel.findUnique({
      where: { id },
      select: {
        videoUrl: true,
        storageBucket: true,
        storagePath: true,
        authorId: true,
      },
    });
    if (
      reel?.authorId === owner.id &&
      reel.storageBucket === "local-reels" &&
      reel.storagePath?.startsWith(`users/${owner.id}/`)
    ) {
      await removeStoredReelVideo({
        url: reel.videoUrl,
        storageBucket: reel.storageBucket,
        storagePath: reel.storagePath,
        storageProvider: "local",
      });
    }
    await prisma.reel.deleteMany({ where: { id, authorId: owner.id } });
    await prisma.reelUploadSession.deleteMany({
      where: { id, authorId: owner.id },
    });
    await discardParts(
      owner.id,
      id,
      Math.ceil((1024 * 1024 * 1024) / REEL_PART_BYTES),
    );
    await prisma.user.delete({ where: { id: owner.id } });
    await fs.rm(folder, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
