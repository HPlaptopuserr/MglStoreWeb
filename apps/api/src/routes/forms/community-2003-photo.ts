import { ORG_IMAGES_BUCKET } from "../../lib/supabase";
export const COMMUNITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export function isCommunityPhotoUrl(value: string): boolean {
  const file = "[0-9a-f-]{36}\\.webp";
  if (new RegExp(`^/api/forms/2003/photos/${file}$`).test(value)) return true;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return false;
  const prefix = `${base}/storage/v1/object/public/${ORG_IMAGES_BUCKET}/community-2003/`;
  return (
    value.startsWith(prefix) &&
    new RegExp(`^${file}$`).test(value.slice(prefix.length))
  );
}
