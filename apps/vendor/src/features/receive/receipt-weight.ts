export type ReceiptWeightUnit = "kg" | "g";
const precise = (value: number) => Number(value.toPrecision(12));
export const displayWeight = (kilograms: number, unit: ReceiptWeightUnit) =>
  precise(unit === "g" ? kilograms * 1000 : kilograms);
export const weightInKilograms = (value: number, unit: ReceiptWeightUnit) =>
  precise(unit === "g" ? value / 1000 : value);
export const displayWeightPrice = (
  perKilogram: number,
  unit: ReceiptWeightUnit,
) => precise(unit === "g" ? perKilogram / 1000 : perKilogram);
export const pricePerKilogram = (value: number, unit: ReceiptWeightUnit) =>
  precise(unit === "g" ? value * 1000 : value);
