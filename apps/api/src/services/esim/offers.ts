import { object } from "./supplier-http";
import type { SupplierId } from "./supplier-catalog";
export interface SupplierOffer {
  id: string;
  supplier: SupplierId;
  packageId: string;
  title: string;
  countries: string[];
  dataMb: number;
  days: number;
  wholesaleUsdUnits: number;
  activation: "installation" | "first-network" | "supplier-instructions";
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid supplier text");
  return value.trim();
}
function positive(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid supplier quantity");
  }
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid supplier list");
  return value;
}
function usdUnits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new Error("Missing USD net price");
  // Round costs up, never truncate supplier cost.
  const units = Math.ceil(value * 10000 - 1e-8);
  return positive(units);
}
export function accessOffers(
  records: readonly unknown[],
  country: string,
): SupplierOffer[] {
  return records.flatMap((record) => {
    const item = object(record);
    // Daily/FUP/unlimited and non-USD products need their own verified pricing rules.
    if (
      item.dataType !== 1 ||
      item.durationUnit !== "DAY" ||
      item.currencyCode !== "USD"
    )
      return [];
    const countries = text(item.location)
      .split(",")
      .map((code) => code.trim().toUpperCase());
    if (!countries.includes(country)) return [];
    const packageId = text(item.slug ?? item.packageCode);
    return [
      {
        id: `esim-access:${packageId}`,
        supplier: "esim-access" as const,
        packageId,
        title: text(item.name),
        countries,
        days: positive(item.duration),
        dataMb: positive(item.volume) / (1024 * 1024),
        wholesaleUsdUnits: positive(item.price),
        activation:
          item.activeType === 1
            ? ("installation" as const)
            : item.activeType === 2
              ? ("first-network" as const)
              : ("supplier-instructions" as const),
      },
    ];
  });
}
export function airaloOffers(
  records: readonly unknown[],
  country: string,
): SupplierOffer[] {
  const offers: SupplierOffer[] = [];
  for (const entry of records) {
    const destination = object(entry);
    // Start with local packages: do not infer regional coverage from a country filter.
    if (destination.country_code !== country) continue;
    for (const rawOperator of array(destination.operators)) {
      const operator = object(rawOperator);
      if (operator.type !== "local" || operator.plan_type !== "data") continue;
      for (const rawPackage of array(operator.packages)) {
        const plan = object(rawPackage);
        if (plan.type !== "sim" || plan.is_unlimited !== false) continue;
        const prices = object(plan.prices);
        const net = object(prices.net_price);
        const packageId = text(plan.id);
        offers.push({
          id: `airalo:${packageId}`,
          supplier: "airalo",
          packageId,
          title: text(plan.title),
          countries: [country],
          days: positive(plan.day),
          dataMb: positive(plan.amount),
          wholesaleUsdUnits: usdUnits(net.USD),
          activation: "supplier-instructions",
        });
      }
    }
  }
  return offers;
}
