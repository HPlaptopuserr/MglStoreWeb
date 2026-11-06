export const REEL_SOURCE_MAX_BYTES = 2 ** 31 - 1;
export const REEL_PART_BYTES = 4 * 1024 * 1024;
export const REEL_OUTPUT_MAX_BYTES = 1024 * 1024 * 1024;
// Database Int bounds source size; duration is validated as media, not capped.
export const REEL_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
export const REEL_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
]);
export const reelUploadId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ReelUploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export function expectedPartSize(
  size: number,
  index: number,
  partSize = REEL_PART_BYTES,
): number {
  const count = Math.ceil(size / partSize);
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
    throw new ReelUploadError("Видео хэсгийн дугаар буруу байна.");
  }
  return Math.min(partSize, size - index * partSize);
}
export interface UploadPart {
  index: number;
  size: number;
}
export function verifiedParts(
  size: number,
  parts: UploadPart[],
  partSize = REEL_PART_BYTES,
): number[] {
  return parts
    .filter(
      (part) =>
        Number.isSafeInteger(part.index) &&
        part.index >= 0 &&
        part.index < Math.ceil(size / partSize) &&
        part.size === expectedPartSize(size, part.index, partSize),
    )
    .map((part) => part.index);
}
