"use client";

import { API } from "@/lib/api";
import { getToken } from "@/lib/auth-context";

const REEL_VISITOR_ID_KEY = "mgl_reel_visitor_id";
const LIKED_REELS_KEY = "mgl_reel_likes";

export type ReelInteractionType =
  | "VIEW"
  | "LIKE"
  | "SAVE"
  | "SHARE"
  | "COMMENT"
  | "FOLLOW_CLICK"
  | "PRODUCT_CLICK";

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `web-reel:${crypto.randomUUID()}`;
  }
  return `web-reel:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

export function getReelVisitorId() {
  if (typeof window === "undefined") return "";
  let visitorId = localStorage.getItem(REEL_VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = createVisitorId();
    localStorage.setItem(REEL_VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function getLikedReelIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(localStorage.getItem(LIKED_REELS_KEY) || "[]");
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

export function saveLikedReelIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIKED_REELS_KEY, JSON.stringify([...ids]));
}

export async function trackReelInteraction(
  reelId: string,
  type: ReelInteractionType,
  metadata?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}/reels/${reelId}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type,
      visitorId: getReelVisitorId(),
      source: "web-reels",
      metadata,
    }),
    keepalive: true,
  });

  return res.ok;
}

export async function setReelLike(reelId: string, liked: boolean) {
  if (typeof window === "undefined") {
    return { ok: false, liked, likeCount: 0 };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}/reels/${reelId}/like`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      liked,
      visitorId: getReelVisitorId(),
      source: "web-reels",
    }),
  });

  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    liked: Boolean(data?.liked),
    likeCount: Number(data?.likeCount || 0),
  };
}
