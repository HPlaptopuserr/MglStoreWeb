export type ProductMovement = {
  change: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
  };
};

export type ProductMovementSummary = {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  frequency: number;
};

export function summarizeProductMovements(
  movements: readonly ProductMovement[],
  limit?: number,
): ProductMovementSummary[] {
  const summaries = new Map<string, ProductMovementSummary>();

  for (const movement of movements) {
    const current = summaries.get(movement.product.id);
    const quantity = Math.abs(movement.change);

    if (current) {
      current.quantity += quantity;
      current.frequency += 1;
      continue;
    }

    summaries.set(movement.product.id, {
      productId: movement.product.id,
      name: movement.product.name,
      sku: movement.product.sku,
      quantity,
      frequency: 1,
    });
  }

  const ranked = [...summaries.values()].sort(
    (a, b) => b.quantity - a.quantity || b.frequency - a.frequency,
  );

  return limit === undefined ? ranked : ranked.slice(0, limit);
}
