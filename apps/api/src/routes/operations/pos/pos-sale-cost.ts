export interface PosSaleLineCostInput {
  allocatedCost: number | null | undefined;
  totalProductQuantity: number;
  lineQuantity: number;
  fallbackUnitCost: number | null | undefined;
}

export interface PosSaleLineCost {
  unitCost: number | null;
  costTotal: number | null;
}

export function resolvePosSaleLineCost(
  input: PosSaleLineCostInput,
): PosSaleLineCost {
  const unitCost =
    input.allocatedCost != null && input.totalProductQuantity > 0
      ? input.allocatedCost / input.totalProductQuantity
      : (input.fallbackUnitCost ?? null);

  return {
    unitCost,
    costTotal: unitCost == null ? null : unitCost * input.lineQuantity,
  };
}
