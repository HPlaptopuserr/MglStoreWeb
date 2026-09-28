import { getSupabase } from "../lib/supabase";
import { REEL_VIDEO_MAX_BYTES } from "./reel-upload-limits";

export const PRIVATE_REELS_BUCKET =
  process.env.SUPABASE_PRIVATE_REELS_BUCKET || "private-reels";
let bucketReady: Promise<void> | undefined;

async function checkBucket() {
  const storage = getSupabase().storage;
  const existing = await storage.getBucket(PRIVATE_REELS_BUCKET);
  if (existing.data) {
    if (existing.data.public)
      throw new Error("Private reel bucket must not be public");
    return;
  }
  const created = await storage.createBucket(PRIVATE_REELS_BUCKET, {
    public: false,
    fileSizeLimit: REEL_VIDEO_MAX_BYTES,
    allowedMimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-m4v",
      "video/webm",
    ],
  });
  if (created.error) {
    // Another instance may have created it concurrently. Always verify privacy.
    const retry = await storage.getBucket(PRIVATE_REELS_BUCKET);
    if (!retry.data || retry.data.public)
      throw new Error("Private reel storage unavailable");
  }
}

export async function ensurePrivateReelBucket() {
  bucketReady ??= checkBucket().catch((error: unknown) => {
    bucketReady = undefined;
    throw error;
  });
  await bucketReady;
}

/** Call only after the record's audience/ownership has been authorized. */
export async function withPrivateReelPlayback<
  T extends {
    visibility: string;
    storageBucket: string | null;
    storagePath: string | null;
    videoUrl: string;
  },
>(reel: T): Promise<T> {
  if (reel.visibility !== "PRIVATE") return reel;
  if (reel.storageBucket !== PRIVATE_REELS_BUCKET || !reel.storagePath) {
    throw new Error("Private reel storage is not configured");
  }
  const { data, error } = await getSupabase()
    .storage.from(PRIVATE_REELS_BUCKET)
    .createSignedUrl(reel.storagePath, 15 * 60);
  if (error || !data?.signedUrl)
    throw new Error("Private reel playback unavailable");
  return {
    ...reel,
    videoUrl: data.signedUrl,
    hlsUrl: null,
    thumbnailUrl: null,
  };
}
