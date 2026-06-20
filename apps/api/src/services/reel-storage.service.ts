import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getSupabase } from "../lib/supabase";

export const REELS_BUCKET = process.env.SUPABASE_REELS_BUCKET || "reels";
export const LOCAL_REELS_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/reels",
);

const VIDEO_EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
};

export interface StoredReelVideo {
  url: string;
  storageBucket: string;
  storagePath: string;
  storageProvider: "supabase" | "local";
}

function resolveVideoExtension(originalName: string, mimeType: string) {
  const fromName = path.extname(originalName).toLowerCase();
  if (fromName) return fromName;
  return VIDEO_EXTENSION_BY_MIME[mimeType] || ".mp4";
}

export async function storeReelVideo(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  organizationId: string;
}): Promise<StoredReelVideo> {
  const ext = resolveVideoExtension(input.originalName, input.mimeType);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const fileName = `${crypto.randomUUID()}${ext}`;
  const storagePath = `organizations/${input.organizationId}/${datePrefix}/${fileName}`;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    const localPath = path.join(LOCAL_REELS_UPLOAD_DIR, storagePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, input.buffer);
    return {
      url: `/api/reels/uploads/${storagePath}`,
      storageBucket: "local-reels",
      storagePath,
      storageProvider: "local",
    };
  }

  const { error } = await getSupabase()
    .storage.from(REELS_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Reel video upload failed");
  }

  const { data } = getSupabase()
    .storage.from(REELS_BUCKET)
    .getPublicUrl(storagePath);
  return {
    url: data.publicUrl,
    storageBucket: REELS_BUCKET,
    storagePath,
    storageProvider: "supabase",
  };
}
