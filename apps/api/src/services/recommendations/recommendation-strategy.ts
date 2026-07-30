import type {
  RecommendationCandidate,
  RecommendationContext,
  ScoredRecommendation,
} from "./recommendation.types";

/**
 * Stable boundary for recommendation implementations.
 * A future ML adapter should implement this contract and consume the exact
 * same normalized features as the deterministic strategy.
 */
export interface RecommendationStrategy {
  readonly name: string;
  readonly version: string;
  score(
    candidates: RecommendationCandidate[],
    context: RecommendationContext,
  ): Promise<ScoredRecommendation[]>;
}
