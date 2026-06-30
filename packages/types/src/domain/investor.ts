import { InvestorTier } from "../enums";

export const INVESTOR_TIER_LABELS: Record<InvestorTier, string> = {
  [InvestorTier.TOP]: "Тэргүүлэх хөрөнгө оруулагч",
  [InvestorTier.STRATEGIC]: "Стратегийн хөрөнгө оруулагч",
  [InvestorTier.INVESTOR]: "Хөрөнгө оруулагч",
};

export const INVESTOR_TIER_ORDER: Record<InvestorTier, number> = {
  [InvestorTier.TOP]: 0,
  [InvestorTier.STRATEGIC]: 1,
  [InvestorTier.INVESTOR]: 2,
};

export function getInvestorTierLabel(tier?: string | null) {
  return (
    INVESTOR_TIER_LABELS[tier as InvestorTier] ||
    INVESTOR_TIER_LABELS[InvestorTier.INVESTOR]
  );
}

export function parseInvestmentAmount(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
