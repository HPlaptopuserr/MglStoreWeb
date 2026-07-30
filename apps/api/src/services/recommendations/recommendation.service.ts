import { collectRecommendationCandidates } from "./recommendation-data.service";
import type { RecommendationStrategy } from "./recommendation-strategy";
import type {
  RecommendationContext,
  RecommendationResult,
} from "./recommendation.types";
import { RuleBasedRecommendationStrategy } from "./rule-based-recommendation.strategy";

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<
  string,
  { expiresAt: number; result: RecommendationResult }
>();

function cacheResult(key: string, result: RecommendationResult) {
  const now = Date.now();
  for (const [cachedKey, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(cachedKey);
  }
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    result,
  });
}

export class RecommendationService {
  constructor(
    private readonly strategy: RecommendationStrategy =
      new RuleBasedRecommendationStrategy(),
  ) {}

  async recommend(
    context: RecommendationContext,
  ): Promise<RecommendationResult> {
    const cacheKey = [
      context.organizationId,
      context.warehouseId,
      context.limit,
      this.strategy.name,
      this.strategy.version,
    ].join(":");
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const candidates = await collectRecommendationCandidates(context);
    const items = await this.strategy.score(candidates, context);
    const result: RecommendationResult = {
      engine: {
        strategy: this.strategy.name,
        version: this.strategy.version,
      },
      generatedAt: new Date().toISOString(),
      items,
    };
    cacheResult(cacheKey, result);
    return result;
  }
}

export const recommendationService = new RecommendationService();
