import type { RecommendationStrategy } from "./recommendation-strategy";
import type {
  RecommendationCandidate,
  RecommendationContext,
  RecommendationReason,
  ScoredRecommendation,
} from "./recommendation.types";

const NETWORK_PRIVACY_MIN_ORGANIZATIONS = 3;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function scoreCandidate(
  candidate: RecommendationCandidate,
): ScoredRecommendation | null {
  const { features } = candidate;
  const personalMonthlyDemand = Math.ceil(
    features.personalRequestedQuantity90d / 3,
  );
  const networkSignalEligible =
    features.networkOrganizationCount90d >=
    NETWORK_PRIVACY_MIN_ORGANIZATIONS;
  const networkMonthlyDemandPerOrganization = networkSignalEligible
    ? Math.ceil(
        features.networkRequestedQuantity90d /
          features.networkOrganizationCount90d /
          3,
      )
    : 0;
  const stockShortfall = Math.max(
    0,
    personalMonthlyDemand - features.organizationStock,
  );

  let reason: RecommendationReason | null = null;
  if (stockShortfall > 0) reason = "STOCK_REPLENISHMENT";
  else if (features.personalRequestCount90d > 0) reason = "REPEAT_PURCHASE";
  else if (networkMonthlyDemandPerOrganization > 0) {
    reason = "NETWORK_TRENDING";
  }
  if (!reason || features.availableStock <= 0) return null;

  const personalScore =
    features.personalRequestedQuantity90d * 4 +
    features.personalRequestCount90d * 20 +
    stockShortfall * 12;
  const networkScore = networkSignalEligible
    ? Math.log1p(features.networkRequestedQuantity90d) * 10 +
      features.networkOrganizationCount90d * 4
    : 0;
  const score = personalScore + networkScore;
  const demandQuantity =
    personalMonthlyDemand > 0
      ? Math.max(personalMonthlyDemand, stockShortfall)
      : Math.max(1, Math.ceil(networkMonthlyDemandPerOrganization * 0.5));
  const suggestedQuantity = clamp(
    demandQuantity,
    1,
    features.availableStock,
  );
  const confidence = clamp(
    (features.personalRequestCount90d > 0 ? 0.45 : 0.2) +
      Math.min(0.35, features.personalRequestCount90d * 0.07) +
      (networkSignalEligible
        ? Math.min(0.25, features.networkOrganizationCount90d * 0.025)
        : 0),
    0,
    0.95,
  );

  const explanation =
    reason === "STOCK_REPLENISHMENT"
      ? `90 хоногийн хэрэглээгээр ${stockShortfall} ширхэг нөхөх шаардлагатай`
      : reason === "REPEAT_PURCHASE"
        ? `90 хоногт ${features.personalRequestCount90d} удаа, ${features.personalRequestedQuantity90d} ширхэг захиалсан`
        : `Ижил сүлжээний ${features.networkOrganizationCount90d} дэлгүүрт эрэлттэй`;

  return {
    candidate,
    score,
    confidence,
    suggestedQuantity,
    reason,
    explanation,
  };
}

export class RuleBasedRecommendationStrategy
  implements RecommendationStrategy
{
  readonly name = "rule-based";
  readonly version = "1.0.0";

  async score(
    candidates: RecommendationCandidate[],
    context: RecommendationContext,
  ) {
    return candidates
      .map(scoreCandidate)
      .filter(
        (item): item is ScoredRecommendation => item !== null,
      )
      .sort(
        (first, second) =>
          second.score - first.score ||
          first.candidate.product.name.localeCompare(
            second.candidate.product.name,
            "mn",
          ),
      )
      .slice(0, context.limit);
  }
}
