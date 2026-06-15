import { prisma } from "@mgl/database";
import { ProductInteractionType } from "@prisma/client";
import {
  buildProductDiscoveryText,
  normalizeDiscoveryText,
  tokenizeDiscoveryText,
} from "./product-discovery.service";

type InterestProduct = {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  businessCategoryId?: string | null;
  businessCategory?: {
    id: string;
    name: string;
    slug?: string | null;
    parent?: { id: string; name: string; slug?: string | null } | null;
  } | null;
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
};

export type ProductInterestProfile = {
  productScores: Map<string, number>;
  categoryScores: Map<string, number>;
  organizationScores: Map<string, number>;
  keywordScores: Map<string, number>;
  hasSignals: boolean;
};

type InteractionInput = {
  userId?: string | null;
  visitorId?: string | null;
  type: ProductInteractionType;
  productId?: string | null;
  businessCategoryId?: string | null;
  organizationId?: string | null;
  searchQuery?: string | null;
  source?: string | null;
  metadata?: unknown;
};

type InterestField = "productId" | "businessCategoryId" | "organizationId" | "keyword";

const INTERACTION_WEIGHTS: Record<ProductInteractionType, number> = {
  VIEW: 1,
  SEARCH: 1.4,
  CATEGORY_VIEW: 1.7,
  ADD_TO_CART: 6,
  WISHLIST: 4.2,
  SHARE: 2.4,
  RECOMMENDATION_CLICK: 2.8,
  PURCHASE: 10,
};

const MAX_INTEREST_SCORE = 500;
const HALF_LIFE_DAYS = 30;
const PROFILE_LOOKBACK_DAYS = 180;

function sanitizeVisitorId(value?: string | null) {
  const visitorId = String(value || "").trim();
  if (!visitorId || visitorId.length < 8 || visitorId.length > 128) return null;
  return visitorId.replace(/[^\w:.-]/g, "").slice(0, 128);
}

function normalizeKeyword(value: string) {
  const normalized = normalizeDiscoveryText(value);
  if (!normalized || normalized.length < 2 || normalized.length > 48) return null;
  return normalized;
}

function metadataToJson(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value));
}

function decayedScore(score: number, lastEventAt: Date, now = new Date()) {
  const ageMs = Math.max(0, now.getTime() - lastEventAt.getTime());
  const ageDays = ageMs / 86_400_000;
  return score * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function addScore(map: Map<string, number>, key: string | null | undefined, score: number) {
  if (!key || score <= 0) return;
  map.set(key, (map.get(key) || 0) + score);
}

async function incrementInterestScore({
  userId,
  visitorId,
  field,
  value,
  weight,
}: {
  userId?: string | null;
  visitorId?: string | null;
  field: InterestField;
  value: string;
  weight: number;
}) {
  if (!value || (!userId && !visitorId)) return;
  const identityWhere = userId ? { userId } : { visitorId };
  const where = { ...identityWhere, [field]: value };
  const now = new Date();

  const existing = await prisma.productInterestScore.findFirst({
    where,
    select: { id: true, score: true, lastEventAt: true },
  });

  if (existing) {
    await prisma.productInterestScore.update({
      where: { id: existing.id },
      data: {
        score: Math.min(
          MAX_INTEREST_SCORE,
          decayedScore(existing.score, existing.lastEventAt, now) + weight,
        ),
        lastEventAt: now,
      },
    });
    return;
  }

  await prisma.productInterestScore.create({
    data: {
      ...identityWhere,
      [field]: value,
      score: weight,
      lastEventAt: now,
    },
  });
}

function productKeywords(product: InterestProduct | null, searchQuery?: string | null) {
  const tokens = new Set<string>();
  if (searchQuery) {
    for (const token of tokenizeDiscoveryText(searchQuery)) {
      const keyword = normalizeKeyword(token);
      if (keyword) tokens.add(keyword);
    }
  }
  if (product) {
    for (const token of tokenizeDiscoveryText(buildProductDiscoveryText(product))) {
      const keyword = normalizeKeyword(token);
      if (keyword) tokens.add(keyword);
      if (tokens.size >= 12) break;
    }
  }
  return [...tokens].slice(0, 12);
}

export async function recordProductInteraction(input: InteractionInput) {
  const userId = input.userId || null;
  const visitorId = sanitizeVisitorId(input.visitorId);
  if (!userId && !visitorId) return null;

  const weight = INTERACTION_WEIGHTS[input.type] || 1;
  const searchQuery = normalizeDiscoveryText(input.searchQuery || "");
  const product = input.productId
    ? await prisma.product.findFirst({
        where: { id: input.productId, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          barcode: true,
          businessCategoryId: true,
          organizationId: true,
          businessCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent: { select: { id: true, name: true, slug: true } },
            },
          },
          organization: { select: { id: true, name: true } },
        },
      })
    : null;

  const businessCategoryId =
    input.businessCategoryId || product?.businessCategoryId || null;
  const organizationId = input.organizationId || product?.organizationId || null;

  await prisma.productInteraction.create({
    data: {
      userId,
      visitorId,
      type: input.type,
      weight,
      productId: product?.id || null,
      businessCategoryId,
      organizationId,
      searchQuery: searchQuery || null,
      source: input.source?.slice(0, 80) || null,
      metadata: metadataToJson(input.metadata),
    },
  });

  const updates: Array<Promise<unknown>> = [];
  if (product?.id) {
    updates.push(
      incrementInterestScore({
        userId,
        visitorId,
        field: "productId",
        value: product.id,
        weight: weight * 1.2,
      }),
    );
  }
  if (businessCategoryId) {
    updates.push(
      incrementInterestScore({
        userId,
        visitorId,
        field: "businessCategoryId",
        value: businessCategoryId,
        weight: weight * 2,
      }),
    );
  }
  if (product?.businessCategory?.parent?.id) {
    updates.push(
      incrementInterestScore({
        userId,
        visitorId,
        field: "businessCategoryId",
        value: product.businessCategory.parent.id,
        weight: weight * 0.8,
      }),
    );
  }
  if (organizationId) {
    updates.push(
      incrementInterestScore({
        userId,
        visitorId,
        field: "organizationId",
        value: organizationId,
        weight,
      }),
    );
  }
  for (const keyword of productKeywords(product, searchQuery)) {
    updates.push(
      incrementInterestScore({
        userId,
        visitorId,
        field: "keyword",
        value: keyword,
        weight: weight * 0.35,
      }),
    );
  }

  await Promise.all(updates);
  return { ok: true };
}

export async function getProductInterestProfile({
  userId,
  visitorId,
}: {
  userId?: string | null;
  visitorId?: string | null;
}): Promise<ProductInterestProfile> {
  const sanitizedVisitorId = sanitizeVisitorId(visitorId);
  if (!userId && !sanitizedVisitorId) {
    return {
      productScores: new Map(),
      categoryScores: new Map(),
      organizationScores: new Map(),
      keywordScores: new Map(),
      hasSignals: false,
    };
  }

  const since = new Date(Date.now() - PROFILE_LOOKBACK_DAYS * 86_400_000);
  const scores = await prisma.productInterestScore.findMany({
    where: {
      lastEventAt: { gte: since },
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(sanitizedVisitorId ? [{ visitorId: sanitizedVisitorId }] : []),
      ],
    },
    orderBy: { score: "desc" },
    take: 160,
  });

  const profile: ProductInterestProfile = {
    productScores: new Map(),
    categoryScores: new Map(),
    organizationScores: new Map(),
    keywordScores: new Map(),
    hasSignals: scores.length > 0,
  };

  for (const item of scores) {
    const score = decayedScore(item.score, item.lastEventAt);
    addScore(profile.productScores, item.productId, score);
    addScore(profile.categoryScores, item.businessCategoryId, score);
    addScore(profile.organizationScores, item.organizationId, score);
    addScore(profile.keywordScores, item.keyword, score);
  }

  return profile;
}

export function scoreProductForInterest(
  product: InterestProduct,
  profile: ProductInterestProfile,
) {
  if (!profile.hasSignals) return 0;

  let score = 0;
  score += (profile.productScores.get(product.id) || 0) * 3;
  score += (profile.categoryScores.get(product.businessCategoryId || "") || 0) * 2.4;
  score += (profile.organizationScores.get(product.organizationId || product.organization?.id || "") || 0) * 1.4;
  if (product.businessCategory?.parent?.id) {
    score += (profile.categoryScores.get(product.businessCategory.parent.id) || 0) * 1.1;
  }

  const tokens = new Set(tokenizeDiscoveryText(buildProductDiscoveryText(product)));
  for (const [keyword, keywordScore] of profile.keywordScores) {
    if (tokens.has(keyword)) score += Math.min(18, keywordScore * 0.45);
  }

  return Math.round(score * 100) / 100;
}

export { ProductInteractionType };
