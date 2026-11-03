export function countryCode(country: string): string {
  const value = country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(value))
    throw new Error("Use an ISO alpha-2 country code");
  return value;
}
export function records(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new Error("Supplier returned an invalid catalog");
  return value;
}
export function pageNumber(page: number): number {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("Invalid page");
  return page;
}
export function credential(value: string): string {
  if (!value.trim()) throw new Error("Supplier credential is missing");
  return value.trim();
}
