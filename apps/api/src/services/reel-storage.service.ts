import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getSupabase } from "../lib/supabase";
import {
  ensurePrivateReelBucket,
  PRIVATE_REELS_BUCKET,
} from "./private-reel-storage.service";

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
  return (
    VIDEO_EXTENSION_BY_MIME[mimeType] ||
    path.extname(originalName).toLowerCase() ||
    ".mp4"
  );
}

export async function storeReelVideo(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  organizationId?: string;
  authorId?: string;
  private?: boolean;
}): Promise<StoredReelVideo> {
  const ownerId = input.organizationId || input.authorId;
  if (!ownerId || !/^[a-zA-Z0-9_-]+$/.test(ownerId)) {
    throw new Error("Invalid reel owner");
  }
  const ext = resolveVideoExtension(input.originalName, input.mimeType);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const fileName = `${crypto.randomUUID()}${ext}`;
  const storagePath = `${input.organizationId ? "organizations" : "users"}/${ownerId}/${datePrefix}/${fileName}`;

  if (input.private) {
    await ensurePrivateReelBucket();
    const { error } = await getSupabase()
      .storage.from(PRIVATE_REELS_BUCKET)
      .upload(storagePath, input.buffer, {
        contentType: input.mimeType,
        upsert: false,
      });
    if (error) throw new Error("Private reel upload failed");
    return {
      url: `private://${PRIVATE_REELS_BUCKET}/${storagePath}`,
      storageBucket: PRIVATE_REELS_BUCKET,
      storagePath,
      storageProvider: "supabase",
    };
  }

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

/** Remove only a file returned by this storage adapter after a failed create. */
export async function removeStoredReelVideo(stored: StoredReelVideo) {
  if (stored.storageProvider === "local") {
    const file = path.resolve(LOCAL_REELS_UPLOAD_DIR, stored.storagePath);
    if (!file.startsWith(`${LOCAL_REELS_UPLOAD_DIR}${path.sep}`)) {
      throw new Error("Invalid reel storage path");
    }
    await fs.rm(file, { force: true });
    return;
  }
  const { error } = await getSupabase()
    .storage.from(stored.storageBucket)
    .remove([stored.storagePath]);
  if (error) throw error;
}
