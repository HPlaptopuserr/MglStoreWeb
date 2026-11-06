import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { setTimeout as pause } from "node:timers/promises";
import { pipeline } from "node:stream/promises";
import { getSupabase } from "../../lib/supabase";
import { LOCAL_REELS_UPLOAD_DIR } from "../reel-storage.service";
import {
  REEL_PART_BYTES,
  REEL_SOURCE_MAX_BYTES,
  ReelUploadError,
  type UploadPart,
} from "./policy";

const bucket = process.env.SUPABASE_REEL_STAGING_BUCKET || "reel-upload-parts";
const localRoot = path.join(LOCAL_REELS_UPLOAD_DIR, "..", "reel-upload-parts");
export const localReelStaging = () =>
  !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY;
let ready: Promise<void> | undefined;
function prefix(authorId: string, id: string): string {
  if (![authorId, id].every((value) => /^[a-zA-Z0-9_-]+$/.test(value)))
    throw new ReelUploadError("Буруу upload ID.");
  return `${authorId}/${id}`;
}
function objectName(authorId: string, id: string, index: number): string {
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= Math.ceil(REEL_SOURCE_MAX_BYTES / REEL_PART_BYTES)
  )
    throw new ReelUploadError("Буруу хэсэг.");
  return `${prefix(authorId, id)}/${index}.part`;
}
export async function ensureReelStaging(): Promise<void> {
  if (localReelStaging()) {
    if (process.env.NODE_ENV === "production")
      throw new ReelUploadError("Видео хадгалалт тохируулагдаагүй байна.", 503);
    await fs.mkdir(localRoot, { recursive: true });
    return;
  }
  ready ??= (async () => {
    const storage = getSupabase().storage;
    const existing = await storage.getBucket(bucket);
    if (existing.data) {
      if (existing.data.public)
        throw new Error("Reel staging must remain private");
      if (
        existing.data.file_size_limit &&
        existing.data.file_size_limit < REEL_PART_BYTES
      ) {
        throw new Error("Reel staging bucket limit is smaller than one part");
      }
      return;
    }
    const created = await storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: REEL_PART_BYTES,
      allowedMimeTypes: ["application/octet-stream"],
    });
    if (created.error) {
      const retry = await storage.getBucket(bucket);
      if (!retry.data || retry.data.public)
        throw new Error("Private staging unavailable");
    }
  })().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  await ready;
}
export async function partTicket(authorId: string, id: string, index: number) {
  await ensureReelStaging();
  const name = objectName(authorId, id, index);
  if (localReelStaging())
    return {
      url: `/api/reel-uploads/${id}/parts/${index}`,
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
    };
  const result = await getSupabase()
    .storage.from(bucket)
    .createSignedUploadUrl(name);
  if (result.error || !result.data)
    throw new ReelUploadError("Видео илгээх холбоос үүссэнгүй.", 503);
  return {
    url: result.data.signedUrl,
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
  };
}
export async function listParts(
  authorId: string,
  id: string,
): Promise<UploadPart[]> {
  const folder = prefix(authorId, id);
  if (localReelStaging()) {
    const names = await fs
      .readdir(path.join(localRoot, folder))
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
    return Promise.all(
      names
        .filter((name) => /^\d+\.part$/.test(name))
        .map(async (name) => ({
          index: Number.parseInt(name, 10),
          size: (await fs.stat(path.join(localRoot, folder, name))).size,
        })),
    );
  }
  const { data, error } = await getSupabase()
    .storage.from(bucket)
    .list(folder, { limit: 1000 });
  if (error)
    throw new ReelUploadError("Видео хэсгүүдийг шалгаж чадсангүй.", 503);
  return (data ?? [])
    .filter((item) => /^\d+\.part$/.test(item.name))
    .map((item) => ({
      index: Number.parseInt(item.name, 10),
      size: Number(item.metadata?.size),
    }));
}
export async function writeLocalPart(
  authorId: string,
  id: string,
  index: number,
  source: Readable,
  expected: number,
) {
  const target = path.join(localRoot, objectName(authorId, id, index));
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  let received = 0;
  try {
    await pipeline(
      source,
      async function* (chunks) {
        for await (const chunk of chunks) {
          const bytes = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as Uint8Array);
          received += bytes.length;
          if (received > expected)
            throw new ReelUploadError("Видео хэсгийн хэмжээ хэтэрсэн.", 413);
          yield bytes;
        }
      },
      createWriteStream(temporary, { flags: "wx" }),
    );
    if (received !== expected)
      throw new ReelUploadError("Видео хэсэг дутуу байна.");
    // Atomic, immutable parts: a stale retry may never replace queued bytes.
    await fs.link(temporary, target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
      throw new ReelUploadError(
        "Энэ хэсэг хадгалагдсан байна. Төлөвийг шинэчилнэ үү.",
        409,
      );
    });
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
export async function assembleParts(
  authorId: string,
  id: string,
  count: number,
  destination: string,
  signal?: AbortSignal,
) {
  const output = await fs.open(destination, "wx");
  try {
    for (let index = 0; index < count; index++) {
      signal?.throwIfAborted();
      const name = objectName(authorId, id, index);
      if (localReelStaging()) {
        for await (const chunk of createReadStream(
          path.join(localRoot, name),
        )) {
          await output.writeFile(chunk as Buffer);
        }
      } else {
        // Each private source object is bounded to 4 MiB. Commit only a fully
        // downloaded part so a timeout/retry cannot duplicate partial bytes.
        let downloaded: Buffer | undefined;
        for (let attempt = 0; ; attempt++) {
          try {
            const signed = await getSupabase()
              .storage.from(bucket)
              .createSignedUrl(name, 600);
            if (signed.error || !signed.data)
              throw new Error("Source part unavailable");
            const response = await fetch(signed.data.signedUrl, {
              signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
                : AbortSignal.timeout(120000),
            });
            if (!response.ok || !response.body)
              throw new Error("Source download failed");
            const chunks: Buffer[] = [];
            let length = 0;
            for await (const chunk of Readable.fromWeb(
              response.body as import("node:stream/web").ReadableStream<Uint8Array>,
            )) {
              const bytes = Buffer.from(chunk as Uint8Array);
              length += bytes.length;
              if (length > REEL_PART_BYTES)
                throw new ReelUploadError("Видео хэсгийн хэмжээ буруу байна.");
              chunks.push(bytes);
            }
            if (
              length === 0 ||
              (index < count - 1 && length !== REEL_PART_BYTES)
            ) {
              throw new Error("Source part incomplete");
            }
            downloaded = Buffer.concat(chunks, length);
            break;
          } catch (error: unknown) {
            if (
              signal?.aborted ||
              error instanceof ReelUploadError ||
              attempt >= 4
            )
              throw error;
            await pause(1000 * 2 ** attempt, undefined, { signal });
          }
        }
        if (!downloaded) throw new Error("Source part unavailable");
        await output.writeFile(downloaded);
      }
    }
  } finally {
    await output.close();
  }
}
export async function discardParts(
  authorId: string,
  id: string,
  count: number,
) {
  if (localReelStaging()) {
    await fs.rm(path.join(localRoot, prefix(authorId, id)), {
      force: true,
      recursive: true,
    });
    return;
  }
  const names = Array.from({ length: count }, (_, index) =>
    objectName(authorId, id, index),
  );
  const { error } = await getSupabase().storage.from(bucket).remove(names);
  if (error) throw error;
}
