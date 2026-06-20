import { API } from "@/lib/api";
import type { OrganizationPreview, ReelItem } from "./reels.types";

export function mediaUrl(url?: string | null) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API.replace(/\/api$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function compactCount(value?: number) {
  const next = Number(value || 0);
  if (next >= 1_000_000) return `${Math.round(next / 100_000) / 10}M`;
  if (next >= 1_000) return `${Math.round(next / 100) / 10}K`;
  return String(next);
}

export function parsePrice(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatMnt(value?: number | string | null) {
  const parsed = parsePrice(value);
  if (!parsed) return "Үнэ асуух";
  return `₮${Math.round(parsed).toLocaleString("mn-MN")}`;
}

export function getReelTitle(item: ReelItem) {
  return item.title || item.caption || "Reel video";
}

export function getReelBody(item: ReelItem) {
  return item.description || item.caption || "";
}

export function getOrgName(item: ReelItem) {
  return item.organization?.name || "MGL Store";
}

export function getOrgKey(item: ReelItem) {
  return item.organization?.slug || getOrgName(item);
}

export function buildOrganizationPreviews(items: ReelItem[]) {
  const map = new Map<string, OrganizationPreview>();

  items.forEach((item) => {
    const key = getOrgKey(item);
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    map.set(key, {
      key,
      name: getOrgName(item),
      logoUrl: item.organization?.logoUrl,
      slug: item.organization?.slug,
      count: 1,
    });
  });

  return Array.from(map.values());
}
