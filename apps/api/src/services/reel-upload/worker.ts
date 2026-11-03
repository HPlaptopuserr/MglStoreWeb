import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { prisma, type ReelUploadSession } from "@mgl/database";
import { Permission } from "@mgl/types";
import { createReel } from "../reel.service";
import {
  storeReelVideo,
  removeStoredReelVideo,
  type StoredReelVideo,
} from "../reel-storage.service";
import { resolvePermissionsForOrg } from "../permission.service";
import { assembleParts, discardParts } from "./staging";
import { transcodeReel } from "./transcode";
import { ReelUploadError } from "./policy";

const leaseMs = 15 * 60 * 1000;
async function processUpload(session: ReelUploadSession, leaseToken: string) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mgl-reel-"));
  const abort = new AbortController();
  const heartbeat = setInterval(() => {
    void prisma.reelUploadSession
      .updateMany({
        where: { id: session.id, leaseToken, status: "PROCESSING" },
        data: { leaseUntil: new Date(Date.now() + leaseMs) },
      })
      .then((result) => {
        if (result.count !== 1) abort.abort();
      })
      .catch(() => {
        abort.abort();
      });
  }, 30000);
  heartbeat.unref();
  let stored: StoredReelVideo | undefined;
  try {
    // Recheck author and organization permissions after a queued upload waits.
    const author = await prisma.user.findFirst({
      where: { id: session.authorId, isActive: true, deletedAt: null },
      select: { role: true },
    });
    if (!author) throw new ReelUploadError("Хэрэглэгч идэвхгүй болсон байна.");
    if (session.organizationId) {
      const access = await resolvePermissionsForOrg(
        session.authorId,
        author.role,
        session.organizationId,
      );
      if (!access.permissions.has(Permission.MANAGE_PRODUCTS))
        throw new ReelUploadError("Байгууллагын reel нийтлэх эрхгүй байна.");
    }
    // A previous process may have committed the Reel before its lease expired.
    const existing = await prisma.reel.findUnique({
      where: { id: session.id },
      select: { id: true, authorId: true, organizationId: true },
    });
    if (!existing) {
      const input = path.join(directory, "source");
      const output = path.join(directory, "video.mp4");
      await assembleParts(
        session.authorId,
        session.id,
        session.partCount,
        input,
        abort.signal,
      );
      if ((await fs.stat(input)).size !== session.sizeBytes)
        throw new ReelUploadError("Видео хэсгүүд дутуу байна.");
      const media = await transcodeReel(input, output, abort.signal);
      const stillOwned = await prisma.reelUploadSession.count({
        where: { id: session.id, leaseToken, status: "PROCESSING" },
      });
      if (!stillOwned || abort.signal.aborted)
        throw new Error("Upload lease lost");
      stored = await storeReelVideo({
        buffer: await fs.readFile(output),
        mimeType: "video/mp4",
        originalName: "video.mp4",
        authorId: session.authorId,
        organizationId: session.organizationId ?? undefined,
        private: session.visibility === "PRIVATE",
      });
      await createReel({
        id: session.id,
        authorId: session.authorId,
        organizationId: session.organizationId,
        visibility: session.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        title: session.title || "Миний reel",
        caption: session.caption,
        productId: session.productId,
        tags: session.tags,
        videoUrl: stored.url,
        storageBucket: stored.storageBucket,
        storagePath: stored.storagePath,
        mimeType: "video/mp4",
        durationSeconds: Math.ceil(media.duration),
        width: media.width,
        height: media.height,
        fileSizeBytes: BigInt(media.size),
        metadata: {
          uploadProtocol: "private-parts-v1",
          sourceBytes: session.sizeBytes,
          encoder: "h264-aac-720p",
        },
      });
    } else if (
      existing.authorId !== session.authorId ||
      existing.organizationId !== session.organizationId
    )
      throw new ReelUploadError("Upload давхардсан байна.");
    await prisma.reelUploadSession.updateMany({
      where: { id: session.id, leaseToken },
      data: { status: "SUCCEEDED", leaseUntil: null, errorMessage: null },
    });
    await discardParts(session.authorId, session.id, session.partCount).catch(
      () => {},
    );
  } catch (error) {
    // Never remove a media object after an uncertain DB commit.
    const committed = await prisma.reel
      .findUnique({
        where: { id: session.id },
        select: { id: true, authorId: true, organizationId: true },
      })
      .catch(() => undefined);
    if (
      committed &&
      committed.authorId === session.authorId &&
      committed.organizationId === session.organizationId
    ) {
      await prisma.reelUploadSession.updateMany({
        where: { id: session.id, leaseToken },
        data: { status: "SUCCEEDED", leaseUntil: null },
      });
    } else if (committed !== undefined) {
      if (stored) await removeStoredReelVideo(stored).catch(() => {});
      await prisma.reelUploadSession.updateMany({
        where: { id: session.id, leaseToken },
        data: {
          status: "FAILED",
          leaseUntil: null,
          errorMessage:
            error instanceof ReelUploadError
              ? error.message
              : "Видео боловсруулж чадсангүй. Дахин оролдоно уу.",
        },
      });
    }
    // Undefined lookup means DB unavailable: retain lease/job for recovery.
  } finally {
    clearInterval(heartbeat);
    await fs.rm(directory, { recursive: true, force: true });
  }
}
export async function processNextReelUpload(): Promise<boolean> {
  const session = await prisma.reelUploadSession.findFirst({
    where: {
      expiresAt: { gt: new Date() },
      OR: [
        { status: "QUEUED" },
        { status: "PROCESSING", leaseUntil: { lt: new Date() } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!session) return false;
  const leaseToken = randomUUID();
  const claimed = await prisma.reelUploadSession.updateMany({
    where: {
      id: session.id,
      status: session.status,
      leaseUntil: session.leaseUntil,
    },
    data: {
      status: "PROCESSING",
      leaseToken,
      attempts: { increment: 1 },
      leaseUntil: new Date(Date.now() + leaseMs),
    },
  });
  if (claimed.count !== 1) return false;
  await processUpload(session, leaseToken);
  return true;
}
export async function cleanupExpiredReelUpload() {
  const expired = await prisma.reelUploadSession.findFirst({
    where: {
      expiresAt: { lt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      OR: [
        { status: { in: ["UPLOADING", "FAILED", "CANCELLED", "SUCCEEDED"] } },
        { status: "PROCESSING", leaseUntil: { lt: new Date() } },
        { status: "QUEUED" },
      ],
    },
    orderBy: { expiresAt: "asc" },
  });
  if (!expired) return;
  await discardParts(expired.authorId, expired.id, expired.partCount);
  await prisma.reelUploadSession.delete({ where: { id: expired.id } });
}
let running = false;
export function startReelUploadWorker() {
  const timer = setInterval(() => {
    if (running || process.env.REEL_UPLOAD_WORKER_ENABLED === "false") return;
    running = true;
    void processNextReelUpload()
      .then(async (worked) => {
        if (!worked) await cleanupExpiredReelUpload();
      })
      .catch(() => {
        console.error(
          "[reel-upload] worker unavailable; durable jobs retained",
        );
      })
      .finally(() => {
        running = false;
      });
  }, 3000);
  timer.unref();
  return timer;
}
