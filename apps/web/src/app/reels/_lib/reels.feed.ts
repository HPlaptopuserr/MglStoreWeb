"use client";

import type { ReelItem, ReelsFeedMode } from "./reels.types";
import { getOrgKey } from "./reels.utils";

const FOLLOWED_REEL_ORGS_KEY = "mgl_reel_followed_orgs";

export const REELS_FEED_TABS: Array<{
  id: ReelsFeedMode;
  label: string;
}> = [
  { id: "reels", label: "Reels" },
  { id: "following", label: "Дагадаг" },
  { id: "live", label: "Live" },
];

export function getFollowedReelOrgKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(
      localStorage.getItem(FOLLOWED_REEL_ORGS_KEY) || "[]",
    );
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

export function saveFollowedReelOrgKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLLOWED_REEL_ORGS_KEY, JSON.stringify([...keys]));
}

export function isLiveReel(item: ReelItem) {
  return Boolean(
    item.metadata?.isLive ||
    item.metadata?.live ||
    item.tags?.some((tag) => tag.toLowerCase() === "live"),
  );
}

export function filterReelsByMode(
  items: ReelItem[],
  mode: ReelsFeedMode,
  followedOrgKeys: Set<string>,
) {
  if (mode === "following") {
    return items.filter((item) => followedOrgKeys.has(getOrgKey(item)));
  }

  if (mode === "live") {
    return items.filter(isLiveReel);
  }

  return items;
}

export function getReelsEmptyCopy(mode: ReelsFeedMode) {
  if (mode === "following") {
    return {
      title: "Following reel алга байна",
      description: "Дагах товч дарсан дэлгүүрүүдийн reel энд тусдаа харагдана.",
    };
  }

  if (mode === "live") {
    return {
      title: "Live reel одоогоор алга",
      description:
        "Live тэмдэглэгээтэй худалдааны reel орж ирэхэд энэ хэсэгт гарна.",
    };
  }

  return {
    title: "Reel одоогоор алга байна",
    description:
      "Байгууллага эсвэл бүтээгдэхүүний богино video орсны дараа энд харагдана.",
  };
}
