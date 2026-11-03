import { prisma, type ReelUploadSession } from "@mgl/database";
import { ensureReelStaging, listParts } from "./staging";
import {
  expectedPartSize,
  verifiedParts,
  REEL_SOURCE_MAX_BYTES,
  REEL_PART_BYTES,
  REEL_MIME_TYPES,
  REEL_UPLOAD_TTL_MS,
  reelUploadId,
  ReelUploadError,
} from "./policy";

export type UploadSession = ReelUploadSession;
export interface NewReelUpload {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  title: string;
  caption: string;
  organizationId: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  productId: string | null;
  tags: string[];
}
export function parseNewReelUpload(value: unknown): NewReelUpload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReelUploadError("Видео илгээх мэдээлэл буруу байна.");
  }
  const body = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof body[key] === "string" ? body[key].trim() : "";
  const id = text("uploadId");
  const fileName = text("fileName");
  const mimeType = text("mimeType");
  const sizeBytes = Number(body.sizeBytes);
  const title = text("title");
  const caption = text("caption");
  const visibility = body.visibility ?? "PUBLIC";
  const tags =
    typeof body.tags === "string"
      ? body.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  if (
    !reelUploadId.test(id) ||
    !fileName ||
    fileName.length > 255 ||
    !REEL_MIME_TYPES.has(mimeType) ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 12 ||
    sizeBytes > REEL_SOURCE_MAX_BYTES ||
    title.length > 120 ||
    caption.length > 2200 ||
    !["PUBLIC", "PRIVATE"].includes(String(visibility)) ||
    tags.length > 20 ||
    tags.some((tag) => tag.length > 60)
  ) {
    throw new ReelUploadError(
      "1 GB хүртэлх MP4, MOV эсвэл WebM видео болон тайлбараа шалгана уу.",
    );
  }
  const organizationId = text("organizationId") || null;
  if (organizationId && visibility === "PRIVATE")
    throw new ReelUploadError(
      "Байгууллагын reel-ийн харагдах тохиргоо буруу байна.",
    );
  return {
    id,
    fileName,
    mimeType,
    sizeBytes,
    title,
    caption,
    organizationId,
    visibility: visibility as "PUBLIC" | "PRIVATE",
    productId: text("productId") || null,
    tags,
  };
}
export async function ownedUpload(
  id: string,
  authorId: string,
): Promise<UploadSession> {
  if (!reelUploadId.test(id))
    throw new ReelUploadError("Upload олдсонгүй.", 404);
  const session = await prisma.reelUploadSession.findUnique({ where: { id } });
  if (!session || session.authorId !== authorId)
    throw new ReelUploadError("Upload олдсонгүй.", 404);
  return session;
}
export function assertUploadActive(session: UploadSession) {
  if (session.expiresAt.getTime() <= Date.now())
    throw new ReelUploadError(
      "Илгээх хугацаа дууссан. Дахин видео сонгоно уу.",
      410,
    );
  if (session.status !== "UPLOADING")
    throw new ReelUploadError("Видео боловсруулж эхэлсэн байна.", 409);
}
export async function startReelUpload(authorId: string, input: NewReelUpload) {
  await ensureReelStaging();
  return prisma.$transaction(
    async (transaction) => {
      const existing = await transaction.reelUploadSession.findUnique({
        where: { id: input.id },
      });
      if (existing) {
        if (
          existing.authorId !== authorId ||
          Object.entries(input).some(
            ([key, value]) =>
              key !== "fileName" &&
              JSON.stringify(existing[key as keyof UploadSession]) !==
                JSON.stringify(value),
          )
        ) {
          throw new ReelUploadError(
            "Энэ upload өөр видео эсвэл тохиргоотой байна. Дахин сонгоно уу.",
            409,
          );
        }
        if (
          existing.status !== "SUCCEEDED" &&
          existing.expiresAt.getTime() <= Date.now()
        ) {
          throw new ReelUploadError(
            "Илгээх хугацаа дууссан. Дахин видео сонгоно уу.",
            410,
          );
        }
        return existing;
      }
      const active = await transaction.reelUploadSession.count({
        where: {
          authorId,
          status: { in: ["UPLOADING", "QUEUED", "PROCESSING"] },
          expiresAt: { gt: new Date() },
        },
      });
      if (active >= 3)
        throw new ReelUploadError("Өмнөх видео илгээлтээ дуусгана уу.", 429);
      return transaction.reelUploadSession.create({
        data: {
          ...input,
          authorId,
          partSize: REEL_PART_BYTES,
          partCount: Math.ceil(input.sizeBytes / REEL_PART_BYTES),
          expiresAt: new Date(Date.now() + REEL_UPLOAD_TTL_MS),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function uploadStatus(session: UploadSession) {
  const received =
    session.status === "UPLOADING"
      ? verifiedParts(
          session.sizeBytes,
          await listParts(session.authorId, session.id),
          session.partSize,
        )
      : [];
  return {
    uploadId: session.id,
    status: session.status,
    partSize: session.partSize,
    partCount: session.partCount,
    sizeBytes: session.sizeBytes,
    receivedParts: received,
    expiresAt: session.expiresAt.toISOString(),
    message: session.errorMessage,
    reelId: session.status === "SUCCEEDED" ? session.id : null,
  };
}
export async function queueReelUpload(session: UploadSession) {
  if (["QUEUED", "PROCESSING", "SUCCEEDED"].includes(session.status))
    return session;
  if (session.status === "CANCELLED")
    throw new ReelUploadError("Илгээлт цуцлагдсан.", 410);
  if (session.expiresAt.getTime() <= Date.now())
    throw new ReelUploadError("Илгээх хугацаа дууссан.", 410);
  if (session.status === "FAILED" && session.attempts >= 3)
    throw new ReelUploadError(
      "Видео боловсруулж чадсангүй. Өөр видео сонгоно уу.",
    );
  const present = verifiedParts(
    session.sizeBytes,
    await listParts(session.authorId, session.id),
    session.partSize,
  );
  if (new Set(present).size !== session.partCount)
    throw new ReelUploadError(
      "Видео хэсгүүд дутуу байна. Илгээлтийг үргэлжлүүлнэ үү.",
      409,
    );
  await prisma.reelUploadSession.updateMany({
    where: { id: session.id, status: { in: ["UPLOADING", "FAILED"] } },
    data: { status: "QUEUED", errorMessage: null, leaseUntil: null },
  });
  return ownedUpload(session.id, session.authorId);
}
export function partLength(session: UploadSession, index: number) {
  return expectedPartSize(session.sizeBytes, index, session.partSize);
}
