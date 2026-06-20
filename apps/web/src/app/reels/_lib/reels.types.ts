export type ReelItem = {
  id: string;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  tags?: string[];
  metadata?: {
    isLive?: boolean;
    live?: boolean;
    [key: string]: unknown;
  } | null;
  organization?: {
    id?: string;
    name?: string | null;
    logoUrl?: string | null;
    slug?: string | null;
  } | null;
  product?: {
    id: string;
    name: string;
    price?: number | string | null;
    images?: Array<{ url?: string | null }>;
  } | null;
};

export type ReelsFeedMode = "reels" | "following" | "live";

export type OrganizationPreview = {
  key: string;
  name: string;
  logoUrl?: string | null;
  slug?: string | null;
  count: number;
};
